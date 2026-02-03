use chrono::Utc;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

/// Types of auditable events required by SENIAT
#[derive(Debug, Serialize, Deserialize)]
pub enum AuditEventType {
    LoginSuccess,
    LoginFailed,
    FiscalDocumentCreated,     // Factura
    FiscalDocumentVoidAttempt, // Intento de anulación (Bloqueado)
    FiscalReportGenerated,     // Z report, etc.
    SystemTimeChanged,         // Reloj modificado catch
    DatabaseBackup,
}

impl AuditEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditEventType::LoginSuccess => "LOGIN_SUCCESS",
            AuditEventType::LoginFailed => "LOGIN_FAILED",
            AuditEventType::FiscalDocumentCreated => "FISCAL_DOC_CREATED",
            AuditEventType::FiscalDocumentVoidAttempt => "FISCAL_VOID_ATTEMPT",
            AuditEventType::FiscalReportGenerated => "FISCAL_REPORT_GEN",
            AuditEventType::SystemTimeChanged => "SYS_TIME_CHANGED",
            AuditEventType::DatabaseBackup => "DB_BACKUP",
        }
    }
}

/// Records an event in the `audit_logs` table.
/// This table is immutable via SQL Triggers.
pub fn log_event(
    conn: &Connection,
    event_type: AuditEventType,
    details: &str,
    user_id: Option<i32>,
) -> Result<()> {
    let now = Utc::now().to_rfc3339();

    // We add user_id if needed, but for now schema is simple.
    // Expanding schema to support user_id and details.

    // Check if columns exist, if not, migration (Stub for now, assuming simple schema)
    // Actually, let's use the schema defined in db.rs: "action TEXT"
    // We will pack JSON into 'action' for flexibility or extend table.
    // For MVP, we format string: "[EVENT] Details (User: X)"

    let action_str = format!(
        "[{}] {} (User: {:?})",
        event_type.as_str(),
        details,
        user_id
    );

    conn.execute(
        "INSERT INTO audit_logs (action, timestamp) VALUES (?1, ?2)",
        params![action_str, now],
    )?;

    Ok(())
}
