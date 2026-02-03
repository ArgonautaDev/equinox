//! Product Variant Commands

use crate::models::{CreateVariantDto, ProductVariant, UpdateVariantDto};
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

/// Generate SKU for variant using parent product SKU + sanitized variant name
fn generate_variant_sku(
    conn: &std::sync::MutexGuard<'_, rusqlite::Connection>,
    product_id: &str,
    variant_name: &str,
) -> Result<String, String> {
    // Get parent product SKU
    let parent_sku: String = conn
        .query_row(
            "SELECT COALESCE(sku, 'PRD') FROM products WHERE id = ?1",
            [product_id],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "PRD".to_string());

    // Sanitize variant name: uppercase, remove spaces, keep alphanumeric
    let sanitized_name: String = variant_name
        .to_uppercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect::<String>()
        .replace(' ', "-");

    // Truncate if too long
    let suffix = if sanitized_name.len() > 10 {
        &sanitized_name[..10]
    } else {
        &sanitized_name
    };

    Ok(format!("{}-{}", parent_sku, suffix))
}

/// List variants for a product
#[tauri::command]
pub async fn list_variants(
    state: State<'_, AppState>,
    product_id: String,
) -> Result<Vec<ProductVariant>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut stmt = conn.prepare(
        "SELECT pv.id, pv.tenant_id, pv.product_id, pv.sku, pv.name, pv.attributes,
                pv.cost_price, pv.sale_price, pv.barcode, COALESCE(vs.quantity, 0) as stock_quantity,
                pv.is_active, pv.created_at, pv.updated_at
         FROM product_variants pv
         LEFT JOIN variant_stock vs ON pv.id = vs.variant_id
         WHERE pv.product_id = ?1 AND pv.tenant_id = ?2 AND pv.is_active = 1
         ORDER BY pv.name ASC"
    ).map_err(|e| e.to_string())?;

    let variants = stmt
        .query_map([&product_id, &tenant_id], |row| {
            Ok(ProductVariant {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                product_id: row.get(2)?,
                sku: row.get(3)?,
                name: row.get(4)?,
                attributes: row.get(5)?,
                cost_price: row.get(6)?,
                sale_price: row.get(7)?,
                barcode: row.get(8)?,
                stock_quantity: row.get(9)?,
                is_active: row.get::<_, i32>(10)? == 1,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(variants)
}

/// Get a single variant by ID
#[tauri::command]
pub async fn get_variant(state: State<'_, AppState>, id: String) -> Result<ProductVariant, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.query_row(
        "SELECT pv.id, pv.tenant_id, pv.product_id, pv.sku, pv.name, pv.attributes,
                pv.cost_price, pv.sale_price, pv.barcode, COALESCE(vs.quantity, 0),
                pv.is_active, pv.created_at, pv.updated_at
         FROM product_variants pv
         LEFT JOIN variant_stock vs ON pv.id = vs.variant_id
         WHERE pv.id = ?1 AND pv.tenant_id = ?2",
        [&id, &tenant_id],
        |row| {
            Ok(ProductVariant {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                product_id: row.get(2)?,
                sku: row.get(3)?,
                name: row.get(4)?,
                attributes: row.get(5)?,
                cost_price: row.get(6)?,
                sale_price: row.get(7)?,
                barcode: row.get(8)?,
                stock_quantity: row.get(9)?,
                is_active: row.get::<_, i32>(10)? == 1,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        },
    )
    .map_err(|e| format!("Variante no encontrada: {}", e))
}

/// Create a new variant
#[tauri::command]
pub async fn create_variant(
    state: State<'_, AppState>,
    data: CreateVariantDto,
) -> Result<ProductVariant, String> {
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();
    let stock_id = Uuid::new_v4().to_string();

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();

        // Generate SKU using parent product SKU + variant name
        let sku = if let Some(ref custom_sku) = data.sku {
            if !custom_sku.is_empty() {
                custom_sku.clone()
            } else {
                generate_variant_sku(&conn, &data.product_id, &data.name)?
            }
        } else {
            generate_variant_sku(&conn, &data.product_id, &data.name)?
        };

        conn.execute(
            "INSERT INTO product_variants (id, tenant_id, product_id, sku, name, attributes, cost_price, sale_price, barcode, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?10)",
            rusqlite::params![
                &id,
                &tenant_id,
                &data.product_id,
                &sku,
                &data.name,
                &data.attributes,
                data.cost_price.unwrap_or(0.0),
                data.sale_price.unwrap_or(0.0),
                &data.barcode,
                &now
            ],
        )
        .map_err(|e| format!("Error al crear variante: {}", e))?;

        // Create stock record
        conn.execute(
            "INSERT INTO variant_stock (id, variant_id, quantity, reserved_quantity, last_updated)
             VALUES (?1, ?2, 0, 0, ?3)",
            rusqlite::params![&stock_id, &id, &now],
        )
        .map_err(|e| format!("Error al crear stock de variante: {}", e))?;
    }

    get_variant(state, id).await
}

/// Update a variant
#[tauri::command]
pub async fn update_variant(
    state: State<'_, AppState>,
    id: String,
    data: UpdateVariantDto,
) -> Result<ProductVariant, String> {
    let tenant_id = get_tenant_id(&state)?;

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();

        let mut set_clauses = vec![format!("updated_at = '{}'", now)];

        if let Some(ref name) = data.name {
            set_clauses.push(format!("name = '{}'", name.replace('\'', "''")));
        }
        if let Some(ref sku) = data.sku {
            set_clauses.push(format!("sku = '{}'", sku.replace('\'', "''")));
        }
        if let Some(ref attributes) = data.attributes {
            set_clauses.push(format!("attributes = '{}'", attributes.replace('\'', "''")));
        }
        if let Some(cost_price) = data.cost_price {
            set_clauses.push(format!("cost_price = {}", cost_price));
        }
        if let Some(sale_price) = data.sale_price {
            set_clauses.push(format!("sale_price = {}", sale_price));
        }
        if let Some(ref barcode) = data.barcode {
            set_clauses.push(format!("barcode = '{}'", barcode.replace('\'', "''")));
        }

        let query = format!(
            "UPDATE product_variants SET {} WHERE id = '{}' AND tenant_id = '{}'",
            set_clauses.join(", "),
            id.replace('\'', "''"),
            tenant_id.replace('\'', "''")
        );

        conn.execute(&query, [])
            .map_err(|e| format!("Error al actualizar variante: {}", e))?;
    }

    get_variant(state, id).await
}

/// Delete (soft) a variant
#[tauri::command]
pub async fn delete_variant(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE product_variants SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
        rusqlite::params![&now, &id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar variante: {}", e))?;

    Ok(())
}

/// Adjust variant stock
#[tauri::command]
pub async fn adjust_variant_stock(
    state: State<'_, AppState>,
    variant_id: String,
    quantity: f64,
    _reason: Option<String>,
) -> Result<ProductVariant, String> {
    let _tenant_id = get_tenant_id(&state)?;

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE variant_stock SET quantity = quantity + ?1, last_updated = ?2 WHERE variant_id = ?3",
            rusqlite::params![quantity, &now, &variant_id],
        )
        .map_err(|e| format!("Error al ajustar stock: {}", e))?;
    }

    get_variant(state, variant_id).await
}
