//! Setup Commands
//!
//! Handles initial system setup, license validation, database configuration,
//! installation detection, and database migration.

use crate::models::{DatabaseFile, DatabaseInfo, PreviousInstallation};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
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

/// Detect previous installation of Equinox ERP
#[tauri::command]
pub async fn detect_previous_installation(app: AppHandle) -> Result<PreviousInstallation, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error al obtener directorio de la app: {}", e))?;

    // Check if app data directory exists and has a database
    if app_dir.exists() {
        let db_path = app_dir.join("equinox.db");
        let config_path = app_dir.join("db_config.json");

        // Try to get custom database path from config
        let database_path = if config_path.exists() {
            std::fs::read_to_string(&config_path)
                .ok()
                .and_then(|content| serde_json::from_str::<DbConfig>(&content).ok())
                .map(|config| config.db_path)
        } else {
            None
        };

        // Use custom path or default
        let final_db_path = database_path.unwrap_or_else(|| db_path.to_string_lossy().to_string());

        if PathBuf::from(&final_db_path).exists() {
            return Ok(PreviousInstallation {
                path: app_dir.to_string_lossy().to_string(),
                version: None, // TODO: Could read from a version file or database
                database_path: Some(final_db_path),
                found: true,
            });
        }
    }

    Ok(PreviousInstallation::default())
}

/// List database files found in common locations
#[tauri::command]
pub async fn list_database_files(app: AppHandle) -> Result<Vec<DatabaseFile>, String> {
    let mut databases = Vec::new();

    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error al obtener directorio: {}", e))?;

    // Search in app data directory
    if app_dir.exists() {
        let default_db = app_dir.join("equinox.db");
        if default_db.exists() {
            if let Ok(metadata) = std::fs::metadata(&default_db) {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                        databases.push(DatabaseFile {
                            path: default_db.to_string_lossy().to_string(),
                            size_bytes: metadata.len(),
                            modified_timestamp: duration.as_secs() as i64,
                            is_valid: validate_database_file(&default_db),
                        });
                    }
                }
            }
        }

        // Also check if there's a custom path in config
        let config_path = app_dir.join("db_config.json");
        if config_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&config_path) {
                if let Ok(config) = serde_json::from_str::<DbConfig>(&content) {
                    let custom_db = PathBuf::from(&config.db_path);
                    if custom_db.exists() && !databases.iter().any(|d| d.path == config.db_path) {
                        if let Ok(metadata) = std::fs::metadata(&custom_db) {
                            if let Ok(modified) = metadata.modified() {
                                if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH)
                                {
                                    databases.push(DatabaseFile {
                                        path: config.db_path,
                                        size_bytes: metadata.len(),
                                        modified_timestamp: duration.as_secs() as i64,
                                        is_valid: validate_database_file(&custom_db),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(databases)
}

/// Validate if a database file is valid SQLite database
fn validate_database_file(path: &PathBuf) -> bool {
    Connection::open(path)
        .and_then(|conn| {
            // Try to execute a simple query
            conn.execute("SELECT 1", [])
        })
        .is_ok()
}

/// Check existing database and return information
#[tauri::command]
pub async fn check_existing_database(path: String) -> Result<DatabaseInfo, String> {
    let db_path = PathBuf::from(&path);

    if !db_path.exists() {
        return Err("La base de datos no existe".to_string());
    }

    let metadata =
        std::fs::metadata(&db_path).map_err(|e| format!("Error al leer metadatos: {}", e))?;

    let modified_timestamp = metadata
        .modified()
        .ok()
        .and_then(|m| m.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let conn =
        Connection::open(&db_path).map_err(|e| format!("Error al abrir base de datos: {}", e))?;

    // Get user count
    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .unwrap_or(0);

    // Get product count
    let product_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
        .unwrap_or(0);

    // Try to get schema version (if you have a version table)
    let schema_version: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'schema_version'",
            [],
            |row| row.get(0),
        )
        .ok();

    Ok(DatabaseInfo {
        path,
        user_count,
        product_count,
        last_modified: modified_timestamp,
        size_bytes: metadata.len(),
        schema_version,
    })
}

/// Migrate/copy database to new location
#[tauri::command]
pub async fn migrate_database(
    app: AppHandle,
    source_path: String,
    destination_path: Option<String>,
) -> Result<String, String> {
    let source = PathBuf::from(&source_path);

    if !source.exists() {
        return Err("La base de datos de origen no existe".to_string());
    }

    // Validate source database
    if !validate_database_file(&source) {
        return Err("La base de datos de origen no es válida".to_string());
    }

    // Determine destination
    let dest = if let Some(dest_path) = destination_path {
        PathBuf::from(dest_path)
    } else {
        let app_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Error al obtener directorio: {}", e))?;
        app_dir.join("equinox.db")
    };

    // Create parent directory if needed
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Error al crear directorio: {}", e))?;
    }

    // Copy database file
    std::fs::copy(&source, &dest).map_err(|e| format!("Error al copiar base de datos: {}", e))?;

    // Validate destination
    if !validate_database_file(&dest) {
        return Err("La base de datos migrada no es válida".to_string());
    }

    Ok(dest.to_string_lossy().to_string())
}

/// Set installation path (for future use)
#[tauri::command]
pub async fn set_installation_path(app: AppHandle, path: String) -> Result<(), String> {
    let install_path = PathBuf::from(&path);

    // Validate path has write permissions
    if let Some(parent) = install_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Error al crear directorio: {}", e))?;
        }
    }

    // Test write permissions by creating a test file
    let test_file = install_path.join(".write_test");
    std::fs::write(&test_file, "test")
        .map_err(|_| "No hay permisos de escritura en esta ubicación".to_string())?;
    std::fs::remove_file(&test_file).ok();

    // Save installation path to config
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error al obtener directorio: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Error al crear directorio de configuración: {}", e))?;

    let config_path = app_dir.join("install_config.json");
    let config = serde_json::json!({
        "installation_path": path
    });

    std::fs::write(config_path, serde_json::to_string_pretty(&config).unwrap())
        .map_err(|e| format!("Error al guardar configuración: {}", e))?;

    Ok(())
}

/// Configure database path
#[tauri::command]
pub async fn configure_database(app: AppHandle, path: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // Create hidden .config directory
    let config_dir = app_dir.join(".config");
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Error al crear directorio .config: {}", e))?;

    let config_path = config_dir.join("db_config.json");

    let config = DbConfig { db_path: path };

    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

/// Restart the application to apply changes (DB path, etc)
#[tauri::command]
pub async fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
}
