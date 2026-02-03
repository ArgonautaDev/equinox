use crate::security::hardware_lock;
use tauri::command;

#[command]
pub fn get_hardware_id() -> String {
    hardware_lock::get_hardware_fingerprint()
}

#[command]
pub fn verify_license_locally(expected_id: String) -> bool {
    hardware_lock::verify_hardware_lock(&expected_id)
}
