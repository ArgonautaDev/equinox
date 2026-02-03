//! Product Type Commands

use crate::models::ProductType;
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

/// List all product types
#[tauri::command]
pub async fn list_product_types(
    state: State<'_, AppState>,
) -> Result<Vec<ProductType>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state.db.lock().map_err(|_| "Error al acceder a la base de datos")?;

    let mut stmt = conn.prepare(
        "SELECT id, tenant_id, code, name, description, affects_stock, is_system, is_active, created_at 
         FROM product_types WHERE tenant_id = ?1 AND is_active = 1 ORDER BY name ASC"
    ).map_err(|e| e.to_string())?;

    let types = stmt
        .query_map([&tenant_id], |row| {
            Ok(ProductType {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                code: row.get(2)?,
                name: row.get(3)?,
                description: row.get(4)?,
                affects_stock: row.get::<_, i32>(5)? == 1,
                is_system: row.get::<_, i32>(6)? == 1,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(types)
}

/// Seed default product types for a tenant
pub fn seed_default_product_types(conn: &Connection, tenant_id: &str) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    
    let types = vec![
        ("SALE", "Venta", "Productos para venta al cliente", true),
        ("CONSUMO", "Consumo Interno", "Materiales de uso interno", true),
        ("MATERIA_PRIMA", "Materia Prima", "Insumos para producción", true),
        ("EMPAQUE", "Material de Empaque", "Bolsas, cajas, etc.", true),
        ("ENVASE", "Material de Envase", "Botellas, frascos, etc.", true),
        ("SERVICIO", "Servicio", "Servicios sin stock físico", false),
    ];

    for (code, name, desc, affects_stock) in types {
        let id = Uuid::new_v4().to_string();
        let _ = conn.execute(
            "INSERT OR IGNORE INTO product_types (id, tenant_id, code, name, description, affects_stock, is_system, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, 1, ?7)",
            rusqlite::params![
                &id, 
                tenant_id, 
                code, 
                name, 
                desc, 
                if affects_stock { 1 } else { 0 },
                &now
            ],
        );
    }

    Ok(())
}
