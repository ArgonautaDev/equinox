use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_sync: Option<DateTime<Utc>>,
    pub pending_uploads: u32,
    pub pending_downloads: u32,
    pub is_syncing: bool,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[allow(dead_code)]
pub enum SyncState {
    Synced,
    PendingUpload,
    PendingDownload,
    Conflict,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[allow(dead_code)]
pub struct SyncResult {
    pub uploaded: u32,
    pub downloaded: u32,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ConflictResolution {
    pub table: String,
    pub local_id: String,
    pub remote_id: String,
    pub resolution: String, // "local", "remote"
}
