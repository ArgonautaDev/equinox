//! System Commands

use serde::Serialize;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub version: String,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LicenseStatus {
    pub status: String,
    pub expires_at: Option<String>,
}

/// Get application information
#[tauri::command]
pub async fn get_app_info(state: State<'_, AppState>) -> Result<AppInfo, String> {
    let tenant_id = state.tenant_id.lock().map_err(|e| e.to_string())?.clone();

    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        tenant_id,
    })
}

/// Check license status
#[tauri::command]
pub async fn check_license(_state: State<'_, AppState>) -> Result<LicenseStatus, String> {
    // TODO: Implement actual license checking
    Ok(LicenseStatus {
        status: "valid".to_string(),
        expires_at: None,
    })
}

/// Seed default inventory data (units and product types) for current tenant
#[tauri::command]
pub async fn seed_inventory_data(state: State<'_, AppState>) -> Result<String, String> {
    let tenant_id = state.require_tenant()?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Seed units
    crate::commands::units::seed_default_units(&conn, &tenant_id)?;

    // Seed product types
    crate::commands::product_types::seed_default_product_types(&conn, &tenant_id)?;

    Ok("Datos de inventario creados exitosamente".to_string())
}
