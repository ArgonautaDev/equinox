//! Discount Commands

use crate::models::{CreateDiscountDto, Discount, UpdateDiscountDto};
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

/// List all discounts
#[tauri::command]
pub async fn list_discounts(
    state: State<'_, AppState>,
    active_only: Option<bool>,
) -> Result<Vec<Discount>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let query = if active_only.unwrap_or(false) {
        "SELECT id, tenant_id, name, discount_type, value, applies_to, target_id, min_quantity,
                max_uses, times_used, start_date, end_date, is_active, created_at, updated_at
         FROM discounts WHERE tenant_id = ?1 AND is_active = 1
         ORDER BY name ASC"
    } else {
        "SELECT id, tenant_id, name, discount_type, value, applies_to, target_id, min_quantity,
                max_uses, times_used, start_date, end_date, is_active, created_at, updated_at
         FROM discounts WHERE tenant_id = ?1
         ORDER BY name ASC"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let discounts = stmt
        .query_map([&tenant_id], |row| {
            Ok(Discount {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                discount_type: row.get(3)?,
                value: row.get(4)?,
                applies_to: row.get(5)?,
                target_id: row.get(6)?,
                min_quantity: row.get(7)?,
                max_uses: row.get(8)?,
                times_used: row.get(9)?,
                start_date: row.get(10)?,
                end_date: row.get(11)?,
                is_active: row.get::<_, i32>(12)? == 1,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(discounts)
}

/// Get a discount by ID
#[tauri::command]
pub async fn get_discount(state: State<'_, AppState>, id: String) -> Result<Discount, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.query_row(
        "SELECT id, tenant_id, name, discount_type, value, applies_to, target_id, min_quantity,
                max_uses, times_used, start_date, end_date, is_active, created_at, updated_at
         FROM discounts WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
        |row| {
            Ok(Discount {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                discount_type: row.get(3)?,
                value: row.get(4)?,
                applies_to: row.get(5)?,
                target_id: row.get(6)?,
                min_quantity: row.get(7)?,
                max_uses: row.get(8)?,
                times_used: row.get(9)?,
                start_date: row.get(10)?,
                end_date: row.get(11)?,
                is_active: row.get::<_, i32>(12)? == 1,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener descuento: {}", e))
}

/// Create a new discount
#[tauri::command]
pub async fn create_discount(
    state: State<'_, AppState>,
    data: CreateDiscountDto,
) -> Result<Discount, String> {
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;

        conn.execute(
            "INSERT INTO discounts (id, tenant_id, name, discount_type, value, applies_to, target_id,
             min_quantity, max_uses, times_used, start_date, end_date, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11, ?12, ?13, ?13)",
            rusqlite::params![
                &id,
                &tenant_id,
                &data.name,
                &data.discount_type,
                data.value,
                &data.applies_to,
                &data.target_id,
                data.min_quantity,
                data.max_uses,
                &data.start_date,
                &data.end_date,
                if data.is_active { 1 } else { 0 },
                &now
            ],
        )
        .map_err(|e| format!("Error al crear descuento: {}", e))?;
    }

    get_discount(state, id).await
}

/// Update a discount
#[tauri::command]
pub async fn update_discount(
    state: State<'_, AppState>,
    id: String,
    data: UpdateDiscountDto,
) -> Result<Discount, String> {
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
        if let Some(ref dtype) = data.discount_type {
            set_clauses.push(format!("discount_type = '{}'", dtype.replace('\'', "''")));
        }
        if let Some(value) = data.value {
            set_clauses.push(format!("value = {}", value));
        }
        if let Some(ref applies_to) = data.applies_to {
            set_clauses.push(format!("applies_to = '{}'", applies_to.replace('\'', "''")));
        }
        if let Some(ref target_id) = data.target_id {
            set_clauses.push(format!("target_id = '{}'", target_id.replace('\'', "''")));
        }
        if let Some(min_qty) = data.min_quantity {
            set_clauses.push(format!("min_quantity = {}", min_qty));
        }
        if let Some(max_uses) = data.max_uses {
            set_clauses.push(format!("max_uses = {}", max_uses));
        }
        if let Some(ref start_date) = data.start_date {
            set_clauses.push(format!("start_date = '{}'", start_date.replace('\'', "''")));
        }
        if let Some(ref end_date) = data.end_date {
            set_clauses.push(format!("end_date = '{}'", end_date.replace('\'', "''")));
        }
        if let Some(is_active) = data.is_active {
            set_clauses.push(format!("is_active = {}", if is_active { 1 } else { 0 }));
        }

        let query = format!(
            "UPDATE discounts SET {} WHERE id = '{}' AND tenant_id = '{}'",
            set_clauses.join(", "),
            id.replace('\'', "''"),
            tenant_id.replace('\'', "''")
        );

        conn.execute(&query, [])
            .map_err(|e| format!("Error al actualizar descuento: {}", e))?;
    }

    get_discount(state, id).await
}

/// Delete a discount (soft delete)
#[tauri::command]
pub async fn delete_discount(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE discounts SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
        rusqlite::params![&now, &id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar descuento: {}", e))?;

    Ok(())
}

/// Increment the times_used counter for a discount
#[tauri::command]
pub async fn use_discount(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.execute(
        "UPDATE discounts SET times_used = times_used + 1 WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
    )
    .map_err(|e| format!("Error al usar descuento: {}", e))?;

    Ok(())
}
