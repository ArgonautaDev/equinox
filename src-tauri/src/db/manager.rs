//! Database Manager
//!
//! Handles SQLCipher encrypted database initialization and migrations.

use rusqlite::Connection;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

use super::migrations;
use crate::commands::setup::DbConfig;
use crate::security::SecurityManager;

pub struct DatabaseManager {
    pub connection: Connection,
}

impl DatabaseManager {
    /// Initialize the database with encryption
    pub fn new(
        app: &AppHandle,
        security: &SecurityManager,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let app_dir = app.path().app_data_dir()?;

        // Create hidden .data directory for database files
        let data_dir = app_dir.join(".data");
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Error creating .data directory: {}", e))?;

        // Check for custom db path in config
        let config_dir = app_dir.join(".config");
        let config_path = config_dir.join("db_config.json");

        let db_path = if config_path.exists() {
            let config_content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("Error reading config: {}", e))?;
            let config: DbConfig = serde_json::from_str(&config_content)
                .map_err(|e| format!("Error parsing config: {}", e))?;

            if config.db_path.is_empty() {
                data_dir.join("equinox.db")
            } else {
                PathBuf::from(config.db_path)
            }
        } else {
            // Default to hidden .data directory
            data_dir.join("equinox.db")
        };

        println!("📂 App Data Dir: {:?}", app_dir);
        println!("📂 Database path: {:?}", db_path);

        // Open database
        let conn = Connection::open(&db_path)?;

        // Initialize encryption with hardware-derived key
        let key = security.get_db_key();
        conn.pragma_update(None, "key", key.as_str())?;

        // Enable WAL mode for better concurrency
        conn.pragma_update(None, "journal_mode", "WAL")?;

        // Secure delete for sensitive data
        conn.pragma_update(None, "secure_delete", "fast")?;

        // Run migrations
        migrations::run_migrations(&conn)?;

        // Apply compliance triggers
        migrations::apply_compliance_triggers(&conn)?;

        #[cfg(debug_assertions)]
        println!("✅ Database initialized successfully");

        Ok(Self { connection: conn })
    }
}
