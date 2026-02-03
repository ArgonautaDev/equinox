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

/// Check for pending updates (polling)
#[tauri::command]
pub async fn check_cloud_updates(state: State<'_, AppState>) -> Result<i64, String> {
    let tenant_id = state.require_tenant().unwrap_or_default();
    crate::services::sync::check_updates(&state.supabase, &state.db, &tenant_id).await
}

/// Get last sync status
#[tauri::command]
pub async fn get_last_sync_status(
    state: State<'_, AppState>,
) -> Result<crate::models::sync::SyncStatus, String> {
    let tenant_id = state.require_tenant().unwrap_or_default();

    // In a real app, query DB for pending items count
    // For now, return a basic status
    let status = crate::models::sync::SyncStatus {
        last_sync: None, // TODO: query from DB
        pending_uploads: 0,
        pending_downloads: 0,
        is_syncing: false,
        last_error: None,
    };

    Ok(status)
}
