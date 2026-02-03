//! Clients Commands
//!
//! CRUD operations for client management.

use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

use crate::models::client::{
    validate_rif, Client, ClientFilters, CreateClientDto, UpdateClientDto,
};
use crate::state::AppState;

/// Create a new client
#[tauri::command]
pub async fn create_client(
    state: State<'_, AppState>,
    data: CreateClientDto,
) -> Result<Client, String> {
    let tenant_id = state.require_tenant()?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Validate RIF if provided
    if let Some(ref tax_id) = data.tax_id {
        if !tax_id.is_empty() && !validate_rif(tax_id) {
            return Err(
                "Formato de RIF inválido. Use: X-XXXXXXXX-X (ej: J-12345678-9)".to_string(),
            );
        }
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Generate client code (CLI-XXXX)
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM clients WHERE tenant_id = ?1",
            [&tenant_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let code = format!("CLI-{:04}", count + 1);

    conn.execute(
        r#"
        INSERT INTO clients (id, tenant_id, code, name, tax_id, tax_type, email, phone, address, city, state, notes, is_active, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 1, ?13, ?13)
        "#,
        params![
            id,
            tenant_id,
            code,
            data.name,
            data.tax_id,
            data.tax_type,
            data.email,
            data.phone,
            data.address,
            data.city,
            data.state,
            data.notes,
            now
        ],
    ).map_err(|e| format!("Error al crear cliente: {}", e))?;

    Ok(Client {
        id,
        tenant_id,
        code: Some(code),
        name: data.name,
        tax_id: data.tax_id,
        tax_type: data.tax_type,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        notes: data.notes,
        is_active: true,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Get a client by ID
#[tauri::command]
pub async fn get_client(state: State<'_, AppState>, id: String) -> Result<Client, String> {
    let tenant_id = state.require_tenant()?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        r#"
        SELECT id, tenant_id, code, name, tax_id, tax_type, email, phone, address, city, state, notes, is_active, created_at, updated_at
        FROM clients
        WHERE id = ?1 AND tenant_id = ?2
        "#,
        params![id, tenant_id],
        |row| {
            Ok(Client {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                code: row.get(2)?,
                name: row.get(3)?,
                tax_id: row.get(4)?,
                tax_type: row.get(5)?,
                email: row.get(6)?,
                phone: row.get(7)?,
                address: row.get(8)?,
                city: row.get(9)?,
                state: row.get(10)?,
                notes: row.get(11)?,
                is_active: row.get::<_, i32>(12)? == 1,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        },
    ).map_err(|_| "Cliente no encontrado".to_string())
}

/// List all clients with optional filters
#[tauri::command]
pub async fn list_clients(
    state: State<'_, AppState>,
    filters: Option<ClientFilters>,
) -> Result<Vec<Client>, String> {
    let tenant_id = state.require_tenant()?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let filters = filters.unwrap_or_default();

    let mut query = r#"
        SELECT id, tenant_id, code, name, tax_id, tax_type, email, phone, address, city, state, notes, is_active, created_at, updated_at
        FROM clients
        WHERE tenant_id = ?1
    "#.to_string();

    // Filter by is_active (default to true)
    let is_active = filters.is_active.unwrap_or(true);
    query.push_str(&format!(
        " AND is_active = {}",
        if is_active { 1 } else { 0 }
    ));

    // Search filter
    if let Some(ref search) = filters.search {
        if !search.is_empty() {
            query.push_str(&format!(
                " AND (name LIKE '%{}%' OR code LIKE '%{}%' OR tax_id LIKE '%{}%' OR email LIKE '%{}%')",
                search, search, search, search
            ));
        }
    }

    query.push_str(" ORDER BY name ASC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let clients = stmt
        .query_map([&tenant_id], |row| {
            Ok(Client {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                code: row.get(2)?,
                name: row.get(3)?,
                tax_id: row.get(4)?,
                tax_type: row.get(5)?,
                email: row.get(6)?,
                phone: row.get(7)?,
                address: row.get(8)?,
                city: row.get(9)?,
                state: row.get(10)?,
                notes: row.get(11)?,
                is_active: row.get::<_, i32>(12)? == 1,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(clients)
}

/// Update an existing client
#[tauri::command]
pub async fn update_client(
    state: State<'_, AppState>,
    id: String,
    data: UpdateClientDto,
) -> Result<Client, String> {
    let tenant_id = state.require_tenant()?;

    // Validate RIF if provided
    if let Some(ref tax_id) = data.tax_id {
        if !tax_id.is_empty() && !validate_rif(tax_id) {
            return Err(
                "Formato de RIF inválido. Use: X-XXXXXXXX-X (ej: J-12345678-9)".to_string(),
            );
        }
    }

    // Scope conn to avoid holding MutexGuard across await
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;

        // Check client exists
        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM clients WHERE id = ?1 AND tenant_id = ?2",
                params![id, tenant_id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !exists {
            return Err("Cliente no encontrado".to_string());
        }

        let now = Utc::now().to_rfc3339();

        // Build dynamic UPDATE query using strings only (Send-safe)
        let mut set_clauses = Vec::new();

        if let Some(ref code) = data.code {
            set_clauses.push(format!("code = '{}'", code.replace('\'', "''")));
        }
        if let Some(ref name) = data.name {
            set_clauses.push(format!("name = '{}'", name.replace('\'', "''")));
        }
        if let Some(ref tax_id) = data.tax_id {
            set_clauses.push(format!("tax_id = '{}'", tax_id.replace('\'', "''")));
        }
        if let Some(ref tax_type) = data.tax_type {
            set_clauses.push(format!("tax_type = '{}'", tax_type.replace('\'', "''")));
        }
        if let Some(ref email) = data.email {
            set_clauses.push(format!("email = '{}'", email.replace('\'', "''")));
        }
        if let Some(ref phone) = data.phone {
            set_clauses.push(format!("phone = '{}'", phone.replace('\'', "''")));
        }
        if let Some(ref address) = data.address {
            set_clauses.push(format!("address = '{}'", address.replace('\'', "''")));
        }
        if let Some(ref city) = data.city {
            set_clauses.push(format!("city = '{}'", city.replace('\'', "''")));
        }
        if let Some(ref state_val) = data.state {
            set_clauses.push(format!("state = '{}'", state_val.replace('\'', "''")));
        }
        if let Some(ref notes) = data.notes {
            set_clauses.push(format!("notes = '{}'", notes.replace('\'', "''")));
        }

        if set_clauses.is_empty() {
            return Err("No hay campos para actualizar".to_string());
        }

        set_clauses.push(format!("updated_at = '{}'", now));

        let query = format!(
            "UPDATE clients SET {} WHERE id = '{}' AND tenant_id = '{}'",
            set_clauses.join(", "),
            id.replace('\'', "''"),
            tenant_id.replace('\'', "''")
        );

        conn.execute(&query, [])
            .map_err(|e| format!("Error al actualizar cliente: {}", e))?;
    } // conn dropped here

    // Now fetch the updated client (no MutexGuard across await)
    get_client(state, id).await
}

/// Soft delete a client (set is_active = false)
#[tauri::command]
pub async fn delete_client(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = state.require_tenant()?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    let rows_affected = conn
        .execute(
            "UPDATE clients SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
            params![now, id, tenant_id],
        )
        .map_err(|e| format!("Error al eliminar cliente: {}", e))?;

    if rows_affected == 0 {
        return Err("Cliente no encontrado".to_string());
    }

    Ok(())
}

/// Restore a deactivated client (set is_active = true)
#[tauri::command]
pub async fn restore_client(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = state.require_tenant()?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();

    let rows_affected = conn
        .execute(
            "UPDATE clients SET is_active = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
            params![now, id, tenant_id],
        )
        .map_err(|e| format!("Error al restaurar cliente: {}", e))?;

    if rows_affected == 0 {
        return Err("Cliente no encontrado".to_string());
    }

    Ok(())
}

/// Search clients by query
#[tauri::command]
pub async fn search_clients(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<Client>, String> {
    list_clients(
        state,
        Some(ClientFilters {
            search: Some(query),
            is_active: Some(true),
        }),
    )
    .await
}
