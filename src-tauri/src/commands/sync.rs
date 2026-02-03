//! Synchronization Commands

use crate::services::sync;
use crate::state::AppState;
use tauri::State;

#[derive(serde::Serialize)]
pub struct SyncCommandResult {
    success: bool,
    uploaded_count: i32,
    downloaded_count: i32,
    message: String,
}

/// Start synchronization process
#[tauri::command]
pub async fn start_sync(state: State<'_, AppState>) -> Result<SyncCommandResult, String> {
    let tenant_id = state.require_tenant()?;

    // 1. Upload pending data
    let upload_result = sync::sync_to_cloud(&state.supabase, &state.db, &tenant_id).await;
    let uploaded = match upload_result {
        Ok(count) => count,
        Err(e) => return Err(format!("Upload failed: {}", e)),
    };

    // 2. Download updates (placeholder)
    let download_result = sync::sync_from_cloud(&state.supabase, &state.db, &tenant_id).await;
    let downloaded = match download_result {
        Ok(count) => count,
        Err(e) => return Err(format!("Download failed: {}", e)),
    };

    Ok(SyncCommandResult {
        success: true,
        uploaded_count: uploaded,
        downloaded_count: downloaded,
        message: "Sync completed successfully".to_string(),
    })
}

/// Get last sync status
#[tauri::command]
pub async fn get_last_sync_status(_state: State<'_, AppState>) -> Result<String, String> {
    // TODO: persist this in DB or State
    Ok("Unknown".to_string())
}
