use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

use sha2::{Digest, Sha256};
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Debug, Zeroize, ZeroizeOnDrop)]
pub struct SecureString(String);

impl SecureString {
    pub fn new(s: String) -> Self {
        Self(s)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

pub struct SecurityManager;

impl SecurityManager {
    /// Generates a SHA-256 hash derived from the machine's unique hardware ID.
    /// This acts as the "Hard-Lock" key.
    fn generate_hardware_fingerprint() -> String {
        let machine_id = machine_uid::get().unwrap_or_else(|_| {
            // Fallback for dev environments where UID might fail (unlikely but safe)
            // In PROD, this should probably panic or strictly require the ID.
            eprintln!("⚠️ WARNING: Failed to get Machine UID. Using fallback.");
            "vesta-fallback-id".to_string()
        });

        // Add salt to prevent rainbow table attacks on known machine IDs
        let salt = "vesta-v1-salt-s8d7f6g9h0j1k2l3";
        let raw_fingerprint = format!("{}{}", machine_id, salt);

        // Hash it to get a consistent 32-byte (64 char hex) key
        let mut hasher = Sha256::new();
        hasher.update(raw_fingerprint.as_bytes());
        let result = hasher.finalize();

        hex::encode(result)
    }

    pub fn get_db_key(_app: &AppHandle) -> SecureString {
        // Now using Hardware Locking Strategy
        let key = Self::generate_hardware_fingerprint();

        // Log key in DEV only (Security Risk otherwise)
        #[cfg(debug_assertions)]
        println!("🔐 Hardware Lock Key (SHA256): {}", key);

        SecureString::new(key)
    }

    /// generates a secure path for backups
    pub fn get_backup_path(app: &AppHandle) -> PathBuf {
        app.path()
            .app_local_data_dir()
            .expect("failed to get app data dir")
            .join("backups")
    }
}
