//! Sync Service
//!
//! Handles synchronization between local SQLite and Supabase.

use crate::models::client::Client;
use rusqlite::{params, Connection};
use serde::{de::DeserializeOwned, Serialize};

use std::sync::Mutex;

#[derive(Clone)]
pub struct SupabaseClient {
    client: reqwest::Client,
    url: String,
    api_key: String,
}

impl SupabaseClient {
    pub fn new(url: String, api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            url,
            api_key,
        }
    }

    /// Upsert a batch of records
    pub async fn upsert<T: Serialize>(&self, table: &str, data: &Vec<T>) -> Result<(), String> {
        if data.is_empty() {
            return Ok(());
        }

        let response = self
            .client
            .post(format!("{}/rest/v1/{}", self.url, table))
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates")
            .json(data)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Supabase error ({}): {}", table, error_text));
        }

        Ok(())
    }

    /// Get count of records modified after a timestamp
    pub async fn count_modified(&self, table: &str, since: Option<String>) -> Result<i64, String> {
        let mut query = format!("{}/rest/v1/{}?select=*", self.url, table);

        if let Some(timestamp) = since {
            // URL encode the timestamp manually (specifically + to %2B) to avoid it being treated as space
            let encoded_ts = timestamp.replace("+", "%2B");
            query.push_str(&format!("&updated_at=gt.{}", encoded_ts));
        }

        println!("DEBUG: Checking count for {} with query: {}", table, query);

        let response = self
            .client
            .head(&query)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Prefer", "count=exact")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = response.status();
        if !status.is_success() {
            return Err(format!(
                "Supabase error checking count for {}: Status {}",
                table, status
            ));
        }

        let content_range = response
            .headers()
            .get("content-range")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("0-0/0");

        // Parse "0-5/6" or "*/6" -> 6
        let total = content_range.split('/').last().unwrap_or("0");
        total.parse::<i64>().map_err(|e| e.to_string())
    }

    /// Select records modified after a timestamp
    pub async fn select_modified<T: DeserializeOwned>(
        &self,
        table: &str,
        since: Option<String>,
    ) -> Result<Vec<T>, String> {
        let mut query = format!("{}/rest/v1/{}?select=*", self.url, table);

        if let Some(timestamp) = since {
            let encoded_ts = timestamp.replace("+", "%2B");
            query.push_str(&format!("&updated_at=gt.{}", encoded_ts));
        }

        println!("DEBUG: Selecting modified from {} uri: {}", table, query);

        let response = self
            .client
            .get(&query)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            println!("DEBUG: Select failed status: {} body: {}", status, body);
            return Err(format!("Supabase error ({}): {}", table, body));
        }

        let body = response.text().await.map_err(|e| e.to_string())?;
        // println!("DEBUG: Select response body: {}", body); // Too verbose?

        serde_json::from_str(&body).map_err(|e| {
            println!("DEBUG: JSON Parse Error: {} Body: {}", e, body);
            e.to_string()
        })
    }
}

// --- Helpers for Metadata ---
fn get_last_down_sync(conn: &Connection) -> Result<Option<String>, String> {
    let result = conn.query_row(
        "SELECT value FROM security_metadata WHERE key = 'last_down_sync'",
        [],
        |row| row.get(0),
    );

    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn set_last_down_sync(conn: &Connection, timestamp: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO security_metadata (key, value) VALUES ('last_down_sync', ?1)",
        [timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Check for pending updates without downloading
pub async fn check_updates(
    client: &SupabaseClient,
    db: &Mutex<Connection>,
    _tenant_id: &str,
) -> Result<i64, String> {
    let last_sync = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        get_last_down_sync(&conn)?
    };

    println!("DEBUG: Last down sync timestamp: {:?}", last_sync);

    // Check clients (expand to other tables later)
    let count = client.count_modified("clients", last_sync).await?;
    println!("DEBUG: Check updates count: {}", count);
    Ok(count)
}

/// Sync local data to Cloud (Upload)
pub async fn sync_to_cloud(
    client: &SupabaseClient,
    db: &Mutex<Connection>,
    tenant_id: &str,
) -> Result<i32, String> {
    let mut total_uploaded = 0;
    let mut clients_batch = Vec::new();

    // 1. Sync Clients - Fetch (Lock Scope)
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, tenant_id, code, name, tax_id, tax_type, email, phone, address, city, state, notes, is_active, created_at, updated_at 
             FROM clients 
             WHERE tenant_id = ? 
             AND (synced_at IS NULL OR updated_at > synced_at)
             LIMIT 50", // Batch size
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([tenant_id], |row| {
                Ok(Client {
                    id: row.get(0)?,
                    tenant_id: row.get(1)?,
                    code: row.get(2)?,
                    name: row.get(3)?,
                    tax_id: row.get(4)?,
                    tax_type: row.get(5)?,
                    email: row.get(6)?,
                    phone: row.get(7)?,
                    address: row.get(8)?,
                    city: row.get(9)?,
                    state: row.get(10)?,
                    notes: row.get(11)?,
                    is_active: row.get(12)?,
                    created_at: row.get(13)?,
                    updated_at: row.get(14)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for client_result in rows {
            if let Ok(c) = client_result {
                clients_batch.push(c);
            }
        }
    } // Lock released

    if !clients_batch.is_empty() {
        // Upload (Async, No Lock)
        client.upsert("clients", &clients_batch).await?;

        // Update SyncedAt (Lock Scope)
        {
            let conn = db.lock().map_err(|e| e.to_string())?;
            let mut stmt = conn
                .prepare("UPDATE clients SET synced_at = CURRENT_TIMESTAMP WHERE id = ?")
                .map_err(|e| e.to_string())?;

            for c in &clients_batch {
                stmt.execute([&c.id]).map_err(|e| e.to_string())?;
            }
        }

        total_uploaded += clients_batch.len() as i32;
    }

    Ok(total_uploaded)
}

/// Sync Cloud data to Local (Download)
pub async fn sync_from_cloud(
    client: &SupabaseClient,
    db: &Mutex<Connection>,
    _tenant_id: &str,
) -> Result<i32, String> {
    let mut total_downloaded = 0;

    // 1. Sync Clients - Get Last Down Sync (Lock Scope)
    let last_sync: Option<String> = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        get_last_down_sync(&conn)?
    }; // Lock released

    println!(
        "DEBUG: SyncFromCloud (clients) - last_sync: {:?}",
        last_sync
    );

    // Fetch (Async, No Lock)
    let remote_clients: Vec<Client> = client.select_modified("clients", last_sync).await?;
    println!(
        "DEBUG: SyncFromCloud (clients) - found {} items",
        remote_clients.len()
    );

    if !remote_clients.is_empty() {
        let mut max_updated_at = None;

        // Apply Updates (Lock Scope)
        {
            let conn = db.lock().map_err(|e| e.to_string())?;
            let mut stmt = conn.prepare(
                "INSERT INTO clients (
                    id, tenant_id, code, name, tax_id, tax_type, email, phone, address, city, state, notes, is_active, created_at, updated_at, synced_at
                ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, CURRENT_TIMESTAMP
                )
                ON CONFLICT(id) DO UPDATE SET
                    code=excluded.code,
                    name=excluded.name,
                    tax_id=excluded.tax_id,
                    tax_type=excluded.tax_type,
                    email=excluded.email,
                    phone=excluded.phone,
                    address=excluded.address,
                    city=excluded.city,
                    state=excluded.state,
                    notes=excluded.notes,
                    is_active=excluded.is_active,
                    updated_at=excluded.updated_at,
                    synced_at=CURRENT_TIMESTAMP"
            ).map_err(|e| e.to_string())?;

            for c in &remote_clients {
                println!(
                    "DEBUG: Upserting client: {} (updated_at: {})",
                    c.id, c.updated_at
                );
                // Determine max updated_at
                // c.updated_at is Option<String> or String? Model says Option<String> usually but let's check.
                // Assuming c.updated_at is String (RFC3339)
                let ua = &c.updated_at;
                match max_updated_at {
                    None => max_updated_at = Some(ua.clone()),
                    Some(ref max) => {
                        if ua > max {
                            max_updated_at = Some(ua.clone())
                        }
                    }
                }

                stmt.execute(params![
                    c.id,
                    c.tenant_id,
                    c.code,
                    c.name,
                    c.tax_id,
                    c.tax_type,
                    c.email,
                    c.phone,
                    c.address,
                    c.city,
                    c.state,
                    c.notes,
                    c.is_active,
                    c.created_at,
                    c.updated_at
                ])
                .map_err(|e| e.to_string())?;
            }

            // Update last_down_sync
            if let Some(timestamp) = max_updated_at {
                println!("DEBUG: Updating last_down_sync watermark to: {}", timestamp);
                set_last_down_sync(&conn, &timestamp)?;
            }
        }
        total_downloaded += remote_clients.len() as i32;
    }

    Ok(total_downloaded)
}
