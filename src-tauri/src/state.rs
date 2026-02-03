//! Application State Management

use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

use crate::db::DatabaseManager;
use crate::security::SecurityManager;
use crate::services::sync::SupabaseClient;

/// Global application state shared across all commands
pub struct AppState {
    /// Database connection (encrypted with SQLCipher)
    pub db: Arc<Mutex<Connection>>,

    /// Current tenant ID
    pub tenant_id: Arc<Mutex<Option<String>>>,

    /// Current user ID
    pub user_id: Arc<Mutex<Option<String>>>,

    /// Security manager for hardware fingerprinting
    pub security: SecurityManager,

    /// Supabase client for cloud sync
    pub supabase: SupabaseClient,
}

impl AppState {
    /// Initialize the application state
    pub fn new(app_handle: AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let security = SecurityManager::new(&app_handle);
        let db_manager = DatabaseManager::new(&app_handle, &security)?;

        Ok(Self {
            db: Arc::new(Mutex::new(db_manager.connection)),
            tenant_id: Arc::new(Mutex::new(None)),
            user_id: Arc::new(Mutex::new(None)),

            security,
            supabase: SupabaseClient::new(
                "https://oyumosljxmcfsecyuuua.supabase.co".to_string(),
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dW1vc2xqeG1jZnNlY3l1dXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MTAxNDgsImV4cCI6MjA4NDI4NjE0OH0.03lsUyoaJbwoTZ6cyGB9HPoGn0yfcvTGItx2ZdD6seE".to_string()
            ),
        })
    }

    /// Get the current tenant ID or return an error
    pub fn require_tenant(&self) -> Result<String, String> {
        self.tenant_id
            .lock()
            .map_err(|_| "Failed to lock tenant state".to_string())?
            .clone()
            .ok_or_else(|| "No tenant selected".to_string())
    }

    /// Get the current user ID or return an error
    pub fn require_user(&self) -> Result<String, String> {
        self.user_id
            .lock()
            .map_err(|_| "Failed to lock user state".to_string())?
            .clone()
            .ok_or_else(|| "Not authenticated".to_string())
    }
}
