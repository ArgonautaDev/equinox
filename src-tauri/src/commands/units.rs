//! Unit Commands

use crate::models::{CreateUnitDto, Unit, UpdateUnitDto};
use crate::state::AppState;
use rusqlite::Connection;
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

/// List all units
#[tauri::command]
pub async fn list_units(state: State<'_, AppState>) -> Result<Vec<Unit>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut stmt = conn.prepare(
        "SELECT id, tenant_id, name, abbreviation, unit_type, base_unit_id, conversion_factor, is_active, created_at 
         FROM units WHERE tenant_id = ?1 AND is_active = 1 ORDER BY name ASC"
    ).map_err(|e| e.to_string())?;

    let units = stmt
        .query_map([&tenant_id], |row| {
            Ok(Unit {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                abbreviation: row.get(3)?,
                unit_type: row.get(4)?,
                base_unit_id: row.get(5)?,
                conversion_factor: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(units)
}

/// Get a single unit by ID
#[tauri::command]
pub async fn get_unit(state: State<'_, AppState>, id: String) -> Result<Unit, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.query_row(
        "SELECT id, tenant_id, name, abbreviation, unit_type, base_unit_id, conversion_factor, is_active, created_at 
         FROM units WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
        |row| {
            Ok(Unit {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                abbreviation: row.get(3)?,
                unit_type: row.get(4)?,
                base_unit_id: row.get(5)?,
                conversion_factor: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| format!("Unidad no encontrada: {}", e))
}

/// Create a new unit
#[tauri::command]
pub async fn create_unit(state: State<'_, AppState>, data: CreateUnitDto) -> Result<Unit, String> {
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();
        let unit_type = data.unit_type.unwrap_or_else(|| "unit".to_string());
        let conversion_factor = data.conversion_factor.unwrap_or(1.0);

        conn.execute(
            "INSERT INTO units (id, tenant_id, name, abbreviation, unit_type, base_unit_id, conversion_factor, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)",
            rusqlite::params![
                &id,
                &tenant_id,
                &data.name,
                &data.abbreviation,
                &unit_type,
                &data.base_unit_id,
                conversion_factor,
                &now
            ],
        )
        .map_err(|e| format!("Error al crear unidad: {}", e))?;
    }

    get_unit(state, id).await
}

/// Update a unit
#[tauri::command]
pub async fn update_unit(
    state: State<'_, AppState>,
    id: String,
    data: UpdateUnitDto,
) -> Result<Unit, String> {
    let tenant_id = get_tenant_id(&state)?;

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;

        let mut set_clauses = Vec::new();

        if let Some(ref name) = data.name {
            set_clauses.push(format!("name = '{}'", name.replace('\'', "''")));
        }
        if let Some(ref abbreviation) = data.abbreviation {
            set_clauses.push(format!(
                "abbreviation = '{}'",
                abbreviation.replace('\'', "''")
            ));
        }
        if let Some(ref unit_type) = data.unit_type {
            set_clauses.push(format!("unit_type = '{}'", unit_type.replace('\'', "''")));
        }
        if let Some(ref base_unit_id) = data.base_unit_id {
            set_clauses.push(format!(
                "base_unit_id = '{}'",
                base_unit_id.replace('\'', "''")
            ));
        }
        if let Some(conversion_factor) = data.conversion_factor {
            set_clauses.push(format!("conversion_factor = {}", conversion_factor));
        }

        if set_clauses.is_empty() {
            return Err("No hay campos para actualizar".to_string());
        }

        let query = format!(
            "UPDATE units SET {} WHERE id = '{}' AND tenant_id = '{}'",
            set_clauses.join(", "),
            id.replace('\'', "''"),
            tenant_id.replace('\'', "''")
        );

        conn.execute(&query, [])
            .map_err(|e| format!("Error al actualizar unidad: {}", e))?;
    }

    get_unit(state, id).await
}

/// Delete (soft) a unit
#[tauri::command]
pub async fn delete_unit(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.execute(
        "UPDATE units SET is_active = 0 WHERE id = ?1 AND tenant_id = ?2",
        rusqlite::params![&id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar unidad: {}", e))?;

    Ok(())
}

/// Seed default units for a tenant
pub fn seed_default_units(conn: &Connection, tenant_id: &str) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    let units = vec![
        ("UND", "Unidad", "unit"),
        ("KG", "Kilogramo", "weight"),
        ("GR", "Gramo", "weight"),
        ("LT", "Litro", "volume"),
        ("ML", "Mililitro", "volume"),
        ("MT", "Metro", "length"),
        ("CM", "Centímetro", "length"),
        ("M2", "Metro Cuadrado", "area"),
        ("CAJA", "Caja", "unit"),
        ("PAQUETE", "Paquete", "unit"),
        ("DOCENA", "Docena", "unit"),
    ];

    for (abbr, name, utype) in units {
        let id = Uuid::new_v4().to_string();
        let _ = conn.execute(
            "INSERT OR IGNORE INTO units (id, tenant_id, name, abbreviation, unit_type, conversion_factor, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1.0, 1, ?6)",
            rusqlite::params![&id, tenant_id, name, abbr, utype, &now],
        );
    }

    Ok(())
}
