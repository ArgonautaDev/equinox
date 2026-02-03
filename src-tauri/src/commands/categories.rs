//! Category Commands

use crate::models::{Category, CategoryFilters, CreateCategoryDto, UpdateCategoryDto};
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

/// List all categories
#[tauri::command]
pub async fn list_categories(
    state: State<'_, AppState>,
    filters: Option<CategoryFilters>,
) -> Result<Vec<Category>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let filters = filters.unwrap_or_default();
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut sql = String::from(
        "SELECT id, tenant_id, parent_id, name, description, sort_order, is_active, created_at, updated_at 
         FROM categories WHERE tenant_id = ?1"
    );

    if let Some(is_active) = filters.is_active {
        sql.push_str(&format!(
            " AND is_active = {}",
            if is_active { 1 } else { 0 }
        ));
    }

    if let Some(ref parent_id) = filters.parent_id {
        sql.push_str(&format!(
            " AND parent_id = '{}'",
            parent_id.replace('\'', "''")
        ));
    }

    if let Some(ref search) = filters.search {
        sql.push_str(&format!(
            " AND (name LIKE '%{}%' OR description LIKE '%{}%')",
            search.replace('\'', "''"),
            search.replace('\'', "''")
        ));
    }

    sql.push_str(" ORDER BY sort_order ASC, name ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let categories = stmt
        .query_map([&tenant_id], |row| {
            Ok(Category {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                parent_id: row.get(2)?,
                name: row.get(3)?,
                description: row.get(4)?,
                sort_order: row.get(5)?,
                is_active: row.get::<_, i32>(6)? == 1,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(categories)
}

/// Get a single category by ID
#[tauri::command]
pub async fn get_category(state: State<'_, AppState>, id: String) -> Result<Category, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.query_row(
        "SELECT id, tenant_id, parent_id, name, description, sort_order, is_active, created_at, updated_at 
         FROM categories WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                parent_id: row.get(2)?,
                name: row.get(3)?,
                description: row.get(4)?,
                sort_order: row.get(5)?,
                is_active: row.get::<_, i32>(6)? == 1,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| format!("Categoría no encontrada: {}", e))
}

/// Create a new category
#[tauri::command]
pub async fn create_category(
    state: State<'_, AppState>,
    data: CreateCategoryDto,
) -> Result<Category, String> {
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();
        let sort_order = data.sort_order.unwrap_or(0);

        conn.execute(
            "INSERT INTO categories (id, tenant_id, parent_id, name, description, sort_order, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7)",
            rusqlite::params![
                &id,
                &tenant_id,
                &data.parent_id,
                &data.name,
                &data.description,
                sort_order,
                &now
            ],
        )
        .map_err(|e| format!("Error al crear categoría: {}", e))?;
    }

    get_category(state, id).await
}

/// Update a category
#[tauri::command]
pub async fn update_category(
    state: State<'_, AppState>,
    id: String,
    data: UpdateCategoryDto,
) -> Result<Category, String> {
    let tenant_id = get_tenant_id(&state)?;

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();

        let mut set_clauses = Vec::new();

        if let Some(ref parent_id) = data.parent_id {
            set_clauses.push(format!("parent_id = '{}'", parent_id.replace('\'', "''")));
        }
        if let Some(ref name) = data.name {
            set_clauses.push(format!("name = '{}'", name.replace('\'', "''")));
        }
        if let Some(ref description) = data.description {
            set_clauses.push(format!(
                "description = '{}'",
                description.replace('\'', "''")
            ));
        }
        if let Some(sort_order) = data.sort_order {
            set_clauses.push(format!("sort_order = {}", sort_order));
        }

        if set_clauses.is_empty() {
            return Err("No hay campos para actualizar".to_string());
        }

        set_clauses.push(format!("updated_at = '{}'", now));

        let query = format!(
            "UPDATE categories SET {} WHERE id = '{}' AND tenant_id = '{}'",
            set_clauses.join(", "),
            id.replace('\'', "''"),
            tenant_id.replace('\'', "''")
        );

        conn.execute(&query, [])
            .map_err(|e| format!("Error al actualizar categoría: {}", e))?;
    }

    get_category(state, id).await
}

/// Delete (soft) a category
#[tauri::command]
pub async fn delete_category(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE categories SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
        rusqlite::params![&now, &id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar categoría: {}", e))?;

    Ok(())
}

/// Restore a category
#[tauri::command]
pub async fn restore_category(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE categories SET is_active = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
        rusqlite::params![&now, &id, &tenant_id],
    )
    .map_err(|e| format!("Error al restaurar categoría: {}", e))?;

    Ok(())
}
