//! Inventory Lot Commands

use crate::models::{AdjustLotDto, CreateLotDto, InventoryLot, LotFilters};
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

/// List lots with filters
#[tauri::command]
pub async fn list_lots(
    state: State<'_, AppState>,
    filters: Option<LotFilters>,
) -> Result<Vec<InventoryLot>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let filters = filters.unwrap_or_default();
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut sql = String::from(
        "SELECT id, tenant_id, product_id, variant_id, lot_number, quantity, cost_price,
                expiration_date, received_date, is_active, created_at
         FROM inventory_lots WHERE tenant_id = ?1",
    );

    if let Some(ref product_id) = filters.product_id {
        sql.push_str(&format!(
            " AND product_id = '{}'",
            product_id.replace('\'', "''")
        ));
    }

    if let Some(ref variant_id) = filters.variant_id {
        sql.push_str(&format!(
            " AND variant_id = '{}'",
            variant_id.replace('\'', "''")
        ));
    }

    if let Some(ref expiring_before) = filters.expiring_before {
        sql.push_str(&format!(
            " AND expiration_date <= '{}'",
            expiring_before.replace('\'', "''")
        ));
    }

    if filters.expired_only == Some(true) {
        sql.push_str(" AND expiration_date < date('now')");
    }

    if let Some(is_active) = filters.is_active {
        sql.push_str(&format!(
            " AND is_active = {}",
            if is_active { 1 } else { 0 }
        ));
    } else {
        sql.push_str(" AND is_active = 1");
    }

    sql.push_str(" ORDER BY expiration_date ASC NULLS LAST, created_at ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let lots = stmt
        .query_map([&tenant_id], |row| {
            Ok(InventoryLot {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                product_id: row.get(2)?,
                variant_id: row.get(3)?,
                lot_number: row.get(4)?,
                quantity: row.get(5)?,
                cost_price: row.get(6)?,
                expiration_date: row.get(7)?,
                received_date: row.get(8)?,
                is_active: row.get::<_, i32>(9)? == 1,
                created_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(lots)
}

/// Get expiring lots (within N days)
#[tauri::command]
pub async fn get_expiring_lots(
    state: State<'_, AppState>,
    days: Option<i32>,
) -> Result<Vec<InventoryLot>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let days = days.unwrap_or(30);
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, tenant_id, product_id, variant_id, lot_number, quantity, cost_price,
                expiration_date, received_date, is_active, created_at
         FROM inventory_lots 
         WHERE tenant_id = ?1 
           AND is_active = 1 
           AND quantity > 0
           AND expiration_date IS NOT NULL
           AND expiration_date <= date('now', '+' || ?2 || ' days')
         ORDER BY expiration_date ASC",
        )
        .map_err(|e| e.to_string())?;

    let lots = stmt
        .query_map(rusqlite::params![&tenant_id, days], |row| {
            Ok(InventoryLot {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                product_id: row.get(2)?,
                variant_id: row.get(3)?,
                lot_number: row.get(4)?,
                quantity: row.get(5)?,
                cost_price: row.get(6)?,
                expiration_date: row.get(7)?,
                received_date: row.get(8)?,
                is_active: row.get::<_, i32>(9)? == 1,
                created_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(lots)
}

/// Get a single lot
#[tauri::command]
pub async fn get_lot(state: State<'_, AppState>, id: String) -> Result<InventoryLot, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.query_row(
        "SELECT id, tenant_id, product_id, variant_id, lot_number, quantity, cost_price,
                expiration_date, received_date, is_active, created_at
         FROM inventory_lots WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
        |row| {
            Ok(InventoryLot {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                product_id: row.get(2)?,
                variant_id: row.get(3)?,
                lot_number: row.get(4)?,
                quantity: row.get(5)?,
                cost_price: row.get(6)?,
                expiration_date: row.get(7)?,
                received_date: row.get(8)?,
                is_active: row.get::<_, i32>(9)? == 1,
                created_at: row.get(10)?,
            })
        },
    )
    .map_err(|e| format!("Lote no encontrado: {}", e))
}

/// Create a new lot
#[tauri::command]
pub async fn create_lot(
    state: State<'_, AppState>,
    data: CreateLotDto,
) -> Result<InventoryLot, String> {
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();
        let received_date = data.received_date.unwrap_or_else(|| now.clone());

        conn.execute(
            "INSERT INTO inventory_lots (id, tenant_id, product_id, variant_id, lot_number, quantity, cost_price, expiration_date, received_date, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10)",
            rusqlite::params![
                &id,
                &tenant_id,
                &data.product_id,
                &data.variant_id,
                &data.lot_number,
                data.quantity,
                data.cost_price,
                &data.expiration_date,
                &received_date,
                &now
            ],
        )
        .map_err(|e| format!("Error al crear lote: {}", e))?;

        // Update product stock
        conn.execute(
            "UPDATE products SET stock_quantity = stock_quantity + ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![data.quantity, &now, &data.product_id],
        )
        .ok();

        // If lot is for a variant, also update variant stock
        if let Some(ref variant_id) = data.variant_id {
            conn.execute(
                "UPDATE variant_stock SET quantity = quantity + ?1, last_updated = ?2 WHERE variant_id = ?3",
                rusqlite::params![data.quantity, &now, variant_id],
            )
            .ok();
        }
    }

    get_lot(state, id).await
}

/// Adjust lot quantity
#[tauri::command]
pub async fn adjust_lot(
    state: State<'_, AppState>,
    id: String,
    data: AdjustLotDto,
) -> Result<InventoryLot, String> {
    let tenant_id = get_tenant_id(&state)?;

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;

        // Get product_id and variant_id for stock update
        let (product_id, variant_id): (String, Option<String>) = conn
            .query_row(
                "SELECT product_id, variant_id FROM inventory_lots WHERE id = ?1 AND tenant_id = ?2",
                [&id, &tenant_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|e| format!("Lote no encontrado: {}", e))?;

        // Adjust lot quantity
        conn.execute(
            "UPDATE inventory_lots SET quantity = quantity + ?1 WHERE id = ?2 AND tenant_id = ?3",
            rusqlite::params![data.quantity, &id, &tenant_id],
        )
        .map_err(|e| format!("Error al ajustar lote: {}", e))?;

        // Update product stock
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE products SET stock_quantity = stock_quantity + ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![data.quantity, &now, &product_id],
        )
        .ok();

        // If lot is for a variant, also update variant stock
        if let Some(ref var_id) = variant_id {
            conn.execute(
                "UPDATE variant_stock SET quantity = quantity + ?1, last_updated = ?2 WHERE variant_id = ?3",
                rusqlite::params![data.quantity, &now, var_id],
            )
            .ok();
        }
    }

    get_lot(state, id).await
}

/// Delete (soft) a lot
#[tauri::command]
pub async fn delete_lot(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.execute(
        "UPDATE inventory_lots SET is_active = 0 WHERE id = ?1 AND tenant_id = ?2",
        rusqlite::params![&id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar lote: {}", e))?;

    Ok(())
}
