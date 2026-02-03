//! Time Guard
//!
//! Detects system clock manipulation to prevent backdating fiscal documents.

use chrono::{DateTime, Duration, Utc};
use rusqlite::{params, Connection, OptionalExtension};

/// Verify system time hasn't been rolled back
pub fn verify_time_integrity(conn: &Connection) -> Result<(), String> {
    let last_seen: Option<String> = conn
        .query_row(
            "SELECT value FROM security_metadata WHERE key = 'last_seen_timestamp'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let now = Utc::now();

    if let Some(last_str) = last_seen {
        if let Ok(last) = DateTime::parse_from_rfc3339(&last_str) {
            let tolerance = Duration::hours(1);
            if now < last.with_timezone(&Utc) - tolerance {
                // Log the anomaly
                conn.execute(
                    r#"
                    INSERT INTO audit_logs (event_type, details, timestamp)
                    VALUES ('SYSTEM_TIME_ANOMALY', ?1, ?2)
                    "#,
                    params![
                        format!("Clock reversed from {} to {}", last_str, now.to_rfc3339()),
                        now.to_rfc3339()
                    ],
                )
                .ok();

                return Err(
                    "⛔ SECURITY: System clock has been rolled back. Fiscal operations disabled."
                        .to_string(),
                );
            }
        }
    }

    // Update timestamp
    conn.execute(
        "INSERT OR REPLACE INTO security_metadata (key, value) VALUES ('last_seen_timestamp', ?1)",
        [now.to_rfc3339()],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get last known system time
pub fn get_last_seen_time(conn: &Connection) -> Option<DateTime<Utc>> {
    let result: Option<String> = conn
        .query_row(
            "SELECT value FROM security_metadata WHERE key = 'last_seen_timestamp'",
            [],
            |row| row.get(0),
        )
        .ok();

    result.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|dt| dt.with_timezone(&Utc))
    })
}
