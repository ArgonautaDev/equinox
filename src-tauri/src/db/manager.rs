//! Database Manager
//!
//! Handles SQLCipher encrypted database initialization and migrations.

use rusqlite::Connection;
use tauri::AppHandle;
use tauri::Manager;

use super::migrations;
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
        // Get app data directory
        let app_dir = app.path().app_data_dir()?;
        std::fs::create_dir_all(&app_dir)?;

        #[cfg(debug_assertions)]
        println!("📂 App Data Dir: {:?}", app_dir);

        // Check for db_config.json
        let config_path = app_dir.join("db_config.json");
        let db_path = if config_path.exists() {
            let config_content = std::fs::read_to_string(&config_path)?;
            let config: serde_json::Value = serde_json::from_str(&config_content)?;
            if let Some(path_str) = config.get("db_path").and_then(|v| v.as_str()) {
                std::path::PathBuf::from(path_str)
            } else {
                app_dir.join("equinox.db")
            }
        } else {
            app_dir.join("equinox.db")
        };

        #[cfg(debug_assertions)]
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
