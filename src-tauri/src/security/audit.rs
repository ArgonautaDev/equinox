//! Audit Logging
//!
//! Immutable event logging for SENIAT compliance.

use chrono::Utc;
use rusqlite::{params, Connection};

/// Audit event types
#[derive(Debug, Clone, Copy)]
pub enum AuditEventType {
    LoginSuccess,
    LoginFailed,
    Logout,
    UserCreated,
    UserUpdated,
    FiscalDocumentCreated,
    FiscalDocumentIssued,
    FiscalDocumentVoidAttempt,
    InventoryAdjusted,
    ClientCreated,
    ClientUpdated,
    SystemStartup,
    SystemTimeAnomaly,
    DatabaseBackup,
    ChainIntegrityCheck,
}

impl AuditEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::LoginSuccess => "LOGIN_SUCCESS",
            Self::LoginFailed => "LOGIN_FAILED",
            Self::Logout => "LOGOUT",
            Self::UserCreated => "USER_CREATED",
            Self::UserUpdated => "USER_UPDATED",
            Self::FiscalDocumentCreated => "FISCAL_DOC_CREATED",
            Self::FiscalDocumentIssued => "FISCAL_DOC_ISSUED",
            Self::FiscalDocumentVoidAttempt => "FISCAL_DOC_VOID_ATTEMPT",
            Self::InventoryAdjusted => "INVENTORY_ADJUSTED",
            Self::ClientCreated => "CLIENT_CREATED",
            Self::ClientUpdated => "CLIENT_UPDATED",
            Self::SystemStartup => "SYSTEM_STARTUP",
            Self::SystemTimeAnomaly => "SYSTEM_TIME_ANOMALY",
            Self::DatabaseBackup => "DATABASE_BACKUP",
            Self::ChainIntegrityCheck => "CHAIN_INTEGRITY_CHECK",
        }
    }
}

/// Log an audit event
pub fn log_event(
    conn: &Connection,
    tenant_id: Option<&str>,
    user_id: Option<&str>,
    event_type: AuditEventType,
    entity_type: Option<&str>,
    entity_id: Option<&str>,
    details: &str,
) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO audit_logs (tenant_id, user_id, event_type, entity_type, entity_id, details, timestamp)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        params![
            tenant_id,
            user_id,
            event_type.as_str(),
            entity_type,
            entity_id,
            details,
            Utc::now().to_rfc3339()
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Log a login attempt
pub fn log_login(
    conn: &Connection,
    email: &str,
    success: bool,
    reason: Option<&str>,
) -> Result<(), String> {
    let event_type = if success {
        AuditEventType::LoginSuccess
    } else {
        AuditEventType::LoginFailed
    };

    let details = if let Some(r) = reason {
        format!("email={}, reason={}", email, r)
    } else {
        format!("email={}", email)
    };

    log_event(conn, None, None, event_type, Some("user"), None, &details)
}
