---
name: equinox-security
description: >
  SENIAT compliance patterns: secure_chain, audit logs, time guard.
  Trigger: When implementing security features, audit logging, or fiscal document integrity.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [src-tauri]
  auto_invoke:
    - "Implementing secure_chain or audit"
    - "Working on SENIAT compliance"
    - "Fiscal document integrity"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Security Modules Overview

| Module | Purpose | File |
|--------|---------|------|
| `secure_chain` | Blockchain-lite for fiscal docs | `security/secure_chain.rs` |
| `audit` | Immutable event logs | `security/audit.rs` |
| `time_guard` | Anti-backdating detection | `security/time_guard.rs` |
| `hardware_lock` | Machine-bound encryption | `security/hardware_lock.rs` |

## Secure Chain (Blockchain-Lite)

```rust
// security/secure_chain.rs
use sha2::{Sha256, Digest};

const CHAIN_SALT: &str = "equinox-integrity-v1";

pub fn calculate_hash(prev_hash: &str, payload: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash);
    hasher.update(payload);
    hasher.update(CHAIN_SALT);
    hex::encode(hasher.finalize())
}

pub fn verify_integrity(prev_hash: &str, payload: &str, stored_hash: &str) -> bool {
    calculate_hash(prev_hash, payload) == stored_hash
}

pub fn get_genesis_hash() -> String {
    "0".repeat(64)
}
```

### Invoice with Secure Chain

```rust
pub struct Invoice {
    pub id: String,
    pub invoice_number: String,
    pub prev_hash: String,      // Hash of previous invoice
    pub hash: String,           // SHA256(prev_hash + payload + salt)
    pub status: InvoiceStatus,
    // ... other fields
}

impl Invoice {
    pub fn issue(&mut self, prev_hash: &str) {
        let payload = self.to_payload_string();
        self.prev_hash = prev_hash.to_string();
        self.hash = calculate_hash(prev_hash, &payload);
        self.status = InvoiceStatus::Issued;
    }
}
```

## Audit Logging

```rust
// security/audit.rs
use chrono::Utc;

pub enum AuditEventType {
    LoginSuccess,
    LoginFailed,
    FiscalDocumentCreated,
    FiscalDocumentVoidAttempt,  // Blocked
    SystemTimeChanged,
    DatabaseBackup,
}

pub fn log_event(
    conn: &Connection,
    event_type: AuditEventType,
    entity_type: Option<&str>,
    entity_id: Option<&str>,
    details: &str,
    user_id: Option<&str>,
) -> Result<()> {
    conn.execute(
        "INSERT INTO audit_logs (event_type, entity_type, entity_id, details, user_id, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            event_type.as_str(),
            entity_type,
            entity_id,
            details,
            user_id,
            Utc::now().to_rfc3339()
        ],
    )?;
    Ok(())
}
```

## Immutability Triggers (SQL)

```sql
-- Prevent UPDATE on audit_logs
CREATE TRIGGER trg_audit_logs_no_update
BEFORE UPDATE ON audit_logs
BEGIN
    SELECT RAISE(ABORT, '⛔ INTEGRITY VIOLATION: Audit logs are immutable');
END;

-- Prevent DELETE on audit_logs
CREATE TRIGGER trg_audit_logs_no_delete
BEFORE DELETE ON audit_logs
BEGIN
    SELECT RAISE(ABORT, '⛔ INTEGRITY VIOLATION: Audit logs cannot be deleted');
END;

-- Prevent DELETE on issued invoices
CREATE TRIGGER trg_invoices_no_delete
BEFORE DELETE ON invoices
WHEN OLD.status != 'draft'
BEGIN
    SELECT RAISE(ABORT, '⛔ INTEGRITY VIOLATION: Issued invoices cannot be deleted');
END;
```

## Time Guard

```rust
// security/time_guard.rs
use chrono::{DateTime, Duration, Utc};

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
                return Err("SECURITY: System clock reversed".to_string());
            }
        }
    }

    // Update timestamp
    conn.execute(
        "INSERT OR REPLACE INTO security_metadata (key, value) VALUES ('last_seen_timestamp', ?)",
        [now.to_rfc3339()],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
```

## SENIAT Auditor User

```rust
pub enum UserRole {
    Admin,
    Operator,
    AuditorSENIAT,  // Read-only access for fiscal auditors
}

// Create mandatory SENIAT user on first run
pub fn ensure_seniat_user(conn: &Connection) -> Result<()> {
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM users WHERE role = 'AUDITOR_SENIAT')",
        [],
        |row| row.get(0),
    )?;

    if !exists {
        // Create with sealed envelope password
        create_seniat_user(conn)?;
    }
    Ok(())
}
```

## Critical Rules

- ✅ ALWAYS log fiscal operations to audit
- ✅ ALWAYS use secure_chain for invoices
- ✅ ALWAYS verify time integrity on startup
- ✅ ALWAYS include triggers for immutability
- ❌ NEVER allow deletion of issued invoices
- ❌ NEVER allow modification of audit logs
- ❌ NEVER skip hash calculation on emission
