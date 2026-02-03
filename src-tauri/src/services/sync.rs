//! Sync Service
//!
//! Handles synchronization between local SQLite and Supabase.

use rusqlite::Connection;
use serde::Serialize;
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

    /// Insert a record
    pub async fn insert<T: Serialize>(
        &self,
        table: &str,
        data: &T,
        upsert: bool,
    ) -> Result<(), String> {
        let mut request = self
            .client
            .post(format!("{}/rest/v1/{}", self.url, table))
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key)) // Ensure Bearer is present
            .header("Content-Type", "application/json");

        if upsert {
            request = request.header("Prefer", "resolution=merge-duplicates");
        }

        let response = request.json(data).send().await.map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Supabase error: {}", error_text));
        }

        Ok(())
    }

    /// Select records
    pub async fn select(
        &self,
        table: &str,
        query_params: &str,
    ) -> Result<serde_json::Value, String> {
        let response = self
            .client
            .get(format!("{}/rest/v1/{}?{}", self.url, table, query_params))
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("Supabase error: {}", response.status()));
        }

        response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| e.to_string())
    }
}

/// Sync local data to Supabase (Upload)
pub async fn sync_to_cloud(
    _client: &SupabaseClient,
    _conn: &Mutex<Connection>,
    _tenant_id: &str,
) -> Result<i32, String> {
    let uploaded_count = 0;

    // TODO: Add entities syncing logic here

    Ok(uploaded_count)
}

/// Sync Supabase data to local (Download)
pub async fn sync_from_cloud(
    _client: &SupabaseClient,
    _conn: &Mutex<Connection>,
    _tenant_id: &str,
) -> Result<i32, String> {
    // Placeholder for download logic
    // Strategy:
    // 1. Get last synced_at timestamp for tenant
    // 2. Query Supabase for records updated_at > last_synced_at
    // 3. Upsert into local DB

    // For now, return 0
    Ok(0)
}
