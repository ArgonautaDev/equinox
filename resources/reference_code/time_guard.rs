use chrono::{DateTime, Utc};
use rusqlite::{Connection, OptionalExtension};

pub fn verify_integrity(conn: &Connection) -> Result<(), String> {
    // 1. Ensure Table Exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS security_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // 2. Get Last Seen Timestamp
    let last_seen_str: Option<String> = conn
        .query_row(
            "SELECT value FROM security_metadata WHERE key = 'last_seen_timestamp'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let now = Utc::now();

    if let Some(last_seen_str) = last_seen_str {
        if let Ok(last_seen) = DateTime::parse_from_rfc3339(&last_seen_str) {
            let last_seen_utc = last_seen.with_timezone(&Utc);

            // Allow 1 hour of tolerance for clock drift/correction
            let tolerance = chrono::Duration::hours(1);

            if now < last_seen_utc - tolerance {
                // Time Travel Detected
                #[cfg(any(not(debug_assertions), test))] // Fail in Release OR Test mode
                {
                    // Strict panic in production
                    return Err(
                        "SECURITY VIOLATION: System clock reversed. Integrity compromised."
                            .to_string(),
                    );
                }
                #[cfg(all(debug_assertions, not(test)))] // Just warn in Debug (Dev) mode
                println!(
                    "⚠️ DEBUG: Time reversed! Now: {}, Last: {}",
                    now, last_seen_utc
                );
            }
        }
    }

    // 3. Update Timestamp
    conn.execute(
        "INSERT OR REPLACE INTO security_metadata (key, value) VALUES ('last_seen_timestamp', ?)",
        [now.to_rfc3339()],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
