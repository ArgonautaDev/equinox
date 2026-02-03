//! Price History Commands

use crate::models::{PriceHistory, PriceHistoryFilters};
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

/// List price history with filters
#[tauri::command]
pub async fn list_price_history(
    state: State<'_, AppState>,
    filters: Option<PriceHistoryFilters>,
) -> Result<Vec<PriceHistory>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let filters = filters.unwrap_or_default();
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut sql = String::from(
        "SELECT id, tenant_id, product_id, variant_id, price_type, old_price, new_price,
                changed_by, reason, created_at
         FROM price_history WHERE tenant_id = ?1",
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

    if let Some(ref price_type) = filters.price_type {
        sql.push_str(&format!(
            " AND price_type = '{}'",
            price_type.replace('\'', "''")
        ));
    }

    if let Some(ref from_date) = filters.from_date {
        sql.push_str(&format!(
            " AND created_at >= '{}'",
            from_date.replace('\'', "''")
        ));
    }

    if let Some(ref to_date) = filters.to_date {
        sql.push_str(&format!(
            " AND created_at <= '{}'",
            to_date.replace('\'', "''")
        ));
    }

    sql.push_str(" ORDER BY created_at DESC LIMIT 100");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let history = stmt
        .query_map([&tenant_id], |row| {
            Ok(PriceHistory {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                product_id: row.get(2)?,
                variant_id: row.get(3)?,
                price_type: row.get(4)?,
                old_price: row.get(5)?,
                new_price: row.get(6)?,
                changed_by: row.get(7)?,
                reason: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(history)
}

/// Record a price change (internal function, called by update commands)
pub fn record_price_change(
    state: &State<'_, AppState>,
    product_id: &str,
    variant_id: Option<&str>,
    price_type: &str,
    old_price: Option<f64>,
    new_price: f64,
    reason: Option<&str>,
) -> Result<(), String> {
    let tenant_id = state.require_tenant()?;
    let user_id = state.user_id.lock().ok().and_then(|u| u.clone());
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO price_history (id, tenant_id, product_id, variant_id, price_type, old_price, new_price, changed_by, reason, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            &id,
            &tenant_id,
            product_id,
            variant_id,
            price_type,
            old_price,
            new_price,
            user_id,
            reason,
            &now
        ],
    )
    .map_err(|e| format!("Error al registrar cambio de precio: {}", e))?;

    Ok(())
}
