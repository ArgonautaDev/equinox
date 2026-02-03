//! Security Module
//!
//! SENIAT compliance and security features.

pub mod audit;
pub mod hardware_lock;
pub mod secure_chain;
pub mod time_guard;

use sha2::{Digest, Sha256};
use tauri::AppHandle;

use zeroize::Zeroize;

/// Security Manager for hardware-based encryption
pub struct SecurityManager {
    hardware_fingerprint: String,
}

impl SecurityManager {
    /// Create a new security manager
    pub fn new(_app: &AppHandle) -> Self {
        let fingerprint = Self::generate_hardware_fingerprint();

        #[cfg(debug_assertions)]
        println!("🔐 Hardware fingerprint generated");

        Self {
            hardware_fingerprint: fingerprint,
        }
    }

    /// Generate a unique hardware fingerprint
    fn generate_hardware_fingerprint() -> String {
        let machine_id = machine_uid::get().unwrap_or_else(|_| {
            #[cfg(debug_assertions)]
            eprintln!("⚠️ WARNING: Failed to get Machine UID. Using fallback.");
            "equinox-fallback-id".to_string()
        });

        let salt = "equinox-v1-salt-x8k2m5n7p9q3";
        let raw = format!("{}{}", machine_id, salt);

        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Get the database encryption key derived from hardware
    pub fn get_db_key(&self) -> SecureString {
        let salt = "equinox-db-key-v1";
        let raw = format!("{}{}", self.hardware_fingerprint, salt);

        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        SecureString::new(hex::encode(hasher.finalize()))
    }

    /// Get the hardware fingerprint
    #[allow(dead_code)]
    pub fn get_hardware_id(&self) -> &str {
        &self.hardware_fingerprint
    }
}

/// A string that is zeroized when dropped
#[derive(Debug)]
pub struct SecureString(String);

impl SecureString {
    pub fn new(s: String) -> Self {
        Self(s)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Drop for SecureString {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}
