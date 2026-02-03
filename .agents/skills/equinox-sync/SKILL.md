---
name: equinox-sync
description: >
  Supabase synchronization patterns for offline-first architecture.
  Trigger: When implementing sync logic, offline mode, or Supabase integration.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [src-tauri]
  auto_invoke: "Working on Supabase sync"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Module Overview

The Sync module handles:
- Offline-first data storage (SQLite)
- Background sync to Supabase
- Conflict resolution
- Master inventory aggregation
- Secure chain replication

## Architecture

```
┌──────────────────┐                    ┌──────────────────┐
│  Local SQLite    │                    │  Supabase Cloud  │
│  (Tenant Data)   │◄────── sync ──────►│  (Master Data)   │
│  - Clients       │                    │  - All Tenants   │
│  - Products      │                    │  - Aggregations  │
│  - Invoices      │                    │  - Licenses      │
└──────────────────┘                    └──────────────────┘
```

## Sync Status

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_sync: Option<DateTime<Utc>>,
    pub pending_uploads: u32,
    pub pending_downloads: u32,
    pub is_syncing: bool,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncState {
    Synced,
    PendingUpload,
    PendingDownload,
    Conflict,
}
```

## Sync Strategy

### Upload (Local → Cloud)

```rust
pub async fn sync_to_cloud(conn: &Connection, supabase: &SupabaseClient) -> Result<SyncResult> {
    let pending = get_pending_uploads(conn)?;
    let mut uploaded = 0;
    let mut errors = vec![];
    
    for record in pending {
        match supabase.upsert(&record.table, &record.data).await {
            Ok(_) => {
                mark_as_synced(conn, &record.id)?;
                uploaded += 1;
            },
            Err(e) => errors.push(format!("{}: {}", record.id, e)),
        }
    }
    
    Ok(SyncResult { uploaded, errors })
}
```

### Download (Cloud → Local)

```rust
pub async fn sync_from_cloud(conn: &Connection, supabase: &SupabaseClient, tenant_id: &str) -> Result<SyncResult> {
    let last_sync = get_last_sync_timestamp(conn)?;
    
    // Fetch changes since last sync
    let changes = supabase
        .from("changes")
        .select("*")
        .eq("tenant_id", tenant_id)
        .gt("updated_at", last_sync)
        .execute()
        .await?;
    
    for change in changes {
        apply_remote_change(conn, &change)?;
    }
    
    update_last_sync_timestamp(conn)?;
    Ok(SyncResult::default())
}
```

## Conflict Resolution

```rust
pub enum ConflictStrategy {
    LocalWins,      // For fiscal documents (immutable)
    RemoteWins,     // For settings
    LastWriteWins,  // For non-fiscal data
    Manual,         // Require user intervention
}

pub fn resolve_conflict(local: &Record, remote: &Record, strategy: ConflictStrategy) -> Record {
    match strategy {
        ConflictStrategy::LocalWins => local.clone(),
        ConflictStrategy::RemoteWins => remote.clone(),
        ConflictStrategy::LastWriteWins => {
            if local.updated_at > remote.updated_at {
                local.clone()
            } else {
                remote.clone()
            }
        },
        ConflictStrategy::Manual => {
            // Store both versions for user resolution
            create_conflict_record(local, remote)
        }
    }
}
```

## Fiscal Document Sync

```rust
// Invoices are APPEND-ONLY - never update remotely
pub async fn sync_invoices(conn: &Connection, supabase: &SupabaseClient) -> Result<()> {
    let pending = get_unsynced_invoices(conn)?;
    
    for invoice in pending {
        // Only upload, never download updates
        supabase.insert("invoices", &invoice).await?;
        mark_invoice_synced(conn, &invoice.id)?;
    }
    
    Ok(())
}
```

## Tauri Commands

```rust
#[tauri::command]
pub async fn sync_now(state: State<'_, AppState>) -> Result<SyncResult, String>;

#[tauri::command]
pub async fn get_sync_status(state: State<'_, AppState>) -> Result<SyncStatus, String>;

#[tauri::command]
pub async fn resolve_conflicts(state: State<'_, AppState>, resolutions: Vec<ConflictResolution>) -> Result<(), String>;
```

## Background Sync

```rust
pub fn start_background_sync(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(300)).await; // Every 5 min
            
            if is_online().await {
                let _ = sync_all(&app).await;
            }
        }
    });
}
```

## Critical Rules

- ✅ ALWAYS sync fiscal documents as append-only
- ✅ ALWAYS use last-write-wins for non-fiscal data
- ✅ ALWAYS track sync state per record
- ✅ ALWAYS retry failed syncs
- ❌ NEVER modify synced fiscal documents
- ❌ NEVER delete cloud data without local confirmation
- ❌ NEVER sync while offline (queue instead)
