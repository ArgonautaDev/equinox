//! Hardware Lock
//!
//! Binds fiscal module licenses to specific hardware.

use sha2::{Digest, Sha256};

/// Get the current hardware fingerprint
pub fn get_hardware_fingerprint() -> String {
    let machine_id = machine_uid::get().unwrap_or_else(|_| "fallback".to_string());

    let salt = "equinox-hw-v1";
    let raw = format!("{}{}", machine_id, salt);

    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    hex::encode(hasher.finalize())
}

/// Verify if the current hardware matches the expected ID
pub fn verify_hardware_lock(expected_hardware_id: &str) -> bool {
    get_hardware_fingerprint() == expected_hardware_id
}

/// Check if a module requires hardware lock
pub fn is_fiscal_module(module_name: &str) -> bool {
    matches!(module_name, "invoicing" | "accounting" | "fiscal_reports")
}
