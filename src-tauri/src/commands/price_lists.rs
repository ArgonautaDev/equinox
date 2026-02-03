//! Price List Commands

use crate::models::{
    CreatePriceListDto, PriceList, ProductPrice, SetProductPriceDto, UpdatePriceListDto,
};
use crate::state::AppState;
use tauri::State;
use uuid::Uuid;

/// Get tenant_id from state
fn get_tenant_id(state: &State<'_, AppState>) -> Result<String, String> {
    state
        .tenant_id
        .lock()
        .map_err(|_| "Error al acceder al tenant".to_string())?
        .clone()
        .ok_or_else(|| "No hay tenant activo".to_string())
}

// ============================================
// PRICE LISTS
// ============================================

/// List all price lists
#[tauri::command]
pub async fn list_price_lists(state: State<'_, AppState>) -> Result<Vec<PriceList>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, tenant_id, name, description, currency, discount_percent, is_default,
                    is_active, created_at, updated_at
             FROM price_lists WHERE tenant_id = ?1
             ORDER BY is_default DESC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let lists = stmt
        .query_map([&tenant_id], |row| {
            Ok(PriceList {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                currency: row.get(4)?,
                discount_percent: row.get(5)?,
                is_default: row.get::<_, i32>(6)? == 1,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(lists)
}

/// Get a price list by ID
#[tauri::command]
pub async fn get_price_list(state: State<'_, AppState>, id: String) -> Result<PriceList, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.query_row(
        "SELECT id, tenant_id, name, description, currency, discount_percent, is_default,
                is_active, created_at, updated_at
         FROM price_lists WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
        |row| {
            Ok(PriceList {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                currency: row.get(4)?,
                discount_percent: row.get(5)?,
                is_default: row.get::<_, i32>(6)? == 1,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener lista de precios: {}", e))
}

/// Create a new price list
#[tauri::command]
pub async fn create_price_list(
    state: State<'_, AppState>,
    data: CreatePriceListDto,
) -> Result<PriceList, String> {
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    // If is_default, unset other defaults
    if data.is_default {
        conn.execute(
            "UPDATE price_lists SET is_default = 0 WHERE tenant_id = ?1",
            [&tenant_id],
        )
        .ok();
    }

    conn.execute(
        "INSERT INTO price_lists (id, tenant_id, name, description, currency, discount_percent, is_default, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)",
        rusqlite::params![
            &id,
            &tenant_id,
            &data.name,
            &data.description,
            &data.currency,
            data.discount_percent,
            if data.is_default { 1 } else { 0 },
            &now
        ],
    )
    .map_err(|e| format!("Error al crear lista de precios: {}", e))?;

    conn.query_row(
        "SELECT id, tenant_id, name, description, currency, discount_percent, is_default,
                is_active, created_at, updated_at
         FROM price_lists WHERE id = ?1",
        [&id],
        |row| {
            Ok(PriceList {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                currency: row.get(4)?,
                discount_percent: row.get(5)?,
                is_default: row.get::<_, i32>(6)? == 1,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener lista creada: {}", e))
}

/// Update a price list
#[tauri::command]
pub async fn update_price_list(
    state: State<'_, AppState>,
    id: String,
    data: UpdatePriceListDto,
) -> Result<PriceList, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    // If setting as default, unset others
    if data.is_default == Some(true) {
        conn.execute(
            "UPDATE price_lists SET is_default = 0 WHERE tenant_id = ?1",
            [&tenant_id],
        )
        .ok();
    }

    let mut set_clauses = vec![format!("updated_at = '{}'", now)];

    if let Some(ref name) = data.name {
        set_clauses.push(format!("name = '{}'", name.replace('\'', "''")));
    }
    if let Some(ref desc) = data.description {
        set_clauses.push(format!("description = '{}'", desc.replace('\'', "''")));
    }
    if let Some(ref currency) = data.currency {
        set_clauses.push(format!("currency = '{}'", currency.replace('\'', "''")));
    }
    if let Some(discount) = data.discount_percent {
        set_clauses.push(format!("discount_percent = {}", discount));
    }
    if let Some(is_default) = data.is_default {
        set_clauses.push(format!("is_default = {}", if is_default { 1 } else { 0 }));
    }
    if let Some(is_active) = data.is_active {
        set_clauses.push(format!("is_active = {}", if is_active { 1 } else { 0 }));
    }

    let query = format!(
        "UPDATE price_lists SET {} WHERE id = '{}' AND tenant_id = '{}'",
        set_clauses.join(", "),
        id.replace('\'', "''"),
        tenant_id.replace('\'', "''")
    );

    conn.execute(&query, [])
        .map_err(|e| format!("Error al actualizar lista: {}", e))?;

    conn.query_row(
        "SELECT id, tenant_id, name, description, currency, discount_percent, is_default,
                is_active, created_at, updated_at
         FROM price_lists WHERE id = ?1",
        [&id],
        |row| {
            Ok(PriceList {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                currency: row.get(4)?,
                discount_percent: row.get(5)?,
                is_default: row.get::<_, i32>(6)? == 1,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener lista: {}", e))
}

/// Delete a price list (soft delete)
#[tauri::command]
pub async fn delete_price_list(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE price_lists SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
        rusqlite::params![&now, &id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar lista: {}", e))?;

    Ok(())
}

// ============================================
// PRODUCT PRICES
// ============================================

/// Get prices for a specific price list
#[tauri::command]
pub async fn list_product_prices(
    state: State<'_, AppState>,
    price_list_id: String,
) -> Result<Vec<ProductPrice>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, price_list_id, product_id, variant_id, price, created_at, updated_at
             FROM product_prices WHERE price_list_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let prices = stmt
        .query_map([&price_list_id], |row| {
            Ok(ProductPrice {
                id: row.get(0)?,
                price_list_id: row.get(1)?,
                product_id: row.get(2)?,
                variant_id: row.get(3)?,
                price: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(prices)
}

/// Set a product price in a price list (upsert)
#[tauri::command]
pub async fn set_product_price(
    state: State<'_, AppState>,
    data: SetProductPriceDto,
) -> Result<ProductPrice, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    // Check if price already exists
    let existing_id: Option<String> = if data.variant_id.is_some() {
        conn.query_row(
            "SELECT id FROM product_prices WHERE price_list_id = ?1 AND product_id = ?2 AND variant_id = ?3",
            rusqlite::params![&data.price_list_id, &data.product_id, &data.variant_id],
            |row| row.get(0),
        )
        .ok()
    } else {
        conn.query_row(
            "SELECT id FROM product_prices WHERE price_list_id = ?1 AND product_id = ?2 AND variant_id IS NULL",
            rusqlite::params![&data.price_list_id, &data.product_id],
            |row| row.get(0),
        )
        .ok()
    };

    let id = if let Some(existing) = existing_id {
        // Update existing
        conn.execute(
            "UPDATE product_prices SET price = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![data.price, &now, &existing],
        )
        .map_err(|e| format!("Error al actualizar precio: {}", e))?;
        existing
    } else {
        // Insert new
        let new_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO product_prices (id, price_list_id, product_id, variant_id, price, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            rusqlite::params![
                &new_id,
                &data.price_list_id,
                &data.product_id,
                &data.variant_id,
                data.price,
                &now
            ],
        )
        .map_err(|e| format!("Error al crear precio: {}", e))?;
        new_id
    };

    conn.query_row(
        "SELECT id, price_list_id, product_id, variant_id, price, created_at, updated_at
         FROM product_prices WHERE id = ?1",
        [&id],
        |row| {
            Ok(ProductPrice {
                id: row.get(0)?,
                price_list_id: row.get(1)?,
                product_id: row.get(2)?,
                variant_id: row.get(3)?,
                price: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener precio: {}", e))
}

/// Delete a product price
#[tauri::command]
pub async fn delete_product_price(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.execute("DELETE FROM product_prices WHERE id = ?1", [&id])
        .map_err(|e| format!("Error al eliminar precio: {}", e))?;

    Ok(())
}
