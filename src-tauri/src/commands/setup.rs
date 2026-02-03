//! Setup Commands
//!
//! Handles initial system setup, license validation, and database configuration.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct DbConfig {
    pub db_path: String,
}

#[derive(Debug, Serialize)]
pub struct LicenseStatus {
    pub valid: bool,
    pub type_: String,
    pub message: Option<String>,
}

/// Validate license key (Mock implementation for now)
#[tauri::command]
pub async fn validate_license(key: String) -> Result<LicenseStatus, String> {
    // TODO: Implement actual license validation logic (API call or offline check)
    if key.len() < 8 {
        return Ok(LicenseStatus {
            valid: false,
            type_: "invalid".to_string(),
            message: Some("La licencia debe tener al menos 8 caracteres".to_string()),
        });
    }

    Ok(LicenseStatus {
        valid: true,
        type_: "pro".to_string(),
        message: None,
    })
}

/// Configure database path
#[tauri::command]
pub async fn configure_database(app: AppHandle, path: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let config_path = app_dir.join("db_config.json");

    let config = DbConfig { db_path: path };

    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

/// Restart the application to apply changes (DB path, etc)
#[tauri::command]
pub async fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
    // Ok(()) // Unreachable
}
