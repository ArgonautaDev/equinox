//! Installation Configuration Models
//!
//! Data structures for managing installation detection, configuration and migration.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct InstallConfig {
    pub installation_path: String,
    pub database_path: String,
    pub is_upgrade: bool,
    pub previous_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviousInstallation {
    pub path: String,
    pub version: Option<String>,
    pub database_path: Option<String>,
    pub found: bool,
}

impl Default for PreviousInstallation {
    fn default() -> Self {
        Self {
            path: String::new(),
            version: None,
            database_path: None,
            found: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseFile {
    pub path: String,
    pub size_bytes: u64,
    pub modified_timestamp: i64,
    pub is_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub path: String,
    pub user_count: i64,
    pub product_count: i64,
    pub last_modified: i64,
    pub size_bytes: u64,
    pub schema_version: Option<String>,
}
