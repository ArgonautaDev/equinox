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

// Sync Models for Supabase Installation Registration

/// Organization data for Supabase sync (no sensitive data)
#[derive(Debug, Serialize)]
pub struct OrganizationSync {
    pub id: String,
    pub name: String,
    pub tax_id: Option<String>,
    pub plan: String,
    pub created_at: String,
}

/// Tenant data for Supabase sync (includes hardware_id for license validation)
#[derive(Debug, Serialize)]
pub struct TenantSync {
    pub id: String,
    pub org_id: String,
    pub name: String,
    pub hardware_id: Option<String>,
    pub is_active: bool,
    pub created_at: String,
}

/// User data for Supabase sync (NO password_hash for security)
#[derive(Debug, Serialize)]
pub struct UserSync {
    pub id: String,
    pub org_id: String,
    pub tenant_id: Option<String>,
    pub email: String,
    pub name: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
}
