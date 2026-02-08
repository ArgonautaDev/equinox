---
name: sqlcipher
description: >
  SQLCipher encrypted SQLite patterns and security.
  Trigger: When working with encrypted databases, SQLCipher pragmas, or secure migrations.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [root, src-tauri]
  auto_invoke: "Working with SQLCipher encryption"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## SQLCipher Setup (REQUIRED)

```rust
use rusqlite::Connection;

pub fn open_encrypted_db(path: &str, key: &str) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(path)?;
    
    // Set encryption key FIRST (before any other operations)
    conn.pragma_update(None, "key", key)?;
    
    // Enable WAL mode for better concurrency
    conn.pragma_update(None, "journal_mode", "WAL")?;
    
    // Secure delete for sensitive data
    conn.pragma_update(None, "secure_delete", "fast")?;
    
    Ok(conn)
}
```

## Hardware-Derived Key

```rust
use sha2::{Sha256, Digest};

pub fn generate_hardware_key() -> String {
    let machine_id = machine_uid::get()
        .unwrap_or_else(|_| "fallback-id".to_string());
    
    let salt = "equinox-v1-salt";
    let raw = format!("{}{}", machine_id, salt);
    
    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    hex::encode(hasher.finalize())
}
```

## Secure String (Zeroize)

```rust
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Debug, Zeroize, ZeroizeOnDrop)]
pub struct SecureString(String);

impl SecureString {
    pub fn new(s: String) -> Self { Self(s) }
    pub fn as_str(&self) -> &str { &self.0 }
}
```

## Migration Pattern

```rust
pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(r#"
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    "#)?;
    
    let current: i32 = conn
        .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_migrations", [], |r| r.get(0))
        .unwrap_or(0);
    
    if current < 1 {
        conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (1)", [])?;
    }
    
    Ok(())
}
```

## Database Export with Re-Key

```rust
pub fn export_database(
    conn: &Connection,
    target_path: &str,
    transport_password: &str,
) -> Result<(), rusqlite::Error> {
    // Create encrypted copy
    conn.execute(&format!("VACUUM INTO '{}'", target_path), [])?;
    
    // Open copy and re-key with transport password
    let export_conn = Connection::open(target_path)?;
    export_conn.pragma_update(None, "key", current_key)?;
    export_conn.pragma_update(None, "rekey", transport_password)?;
    
    Ok(())
}
```

## Verify Encryption

```rust
pub fn verify_encryption(path: &str) -> bool {
    if let Ok(mut file) = std::fs::File::open(path) {
        use std::io::Read;
        let mut buffer = [0u8; 16];
        if file.read_exact(&mut buffer).is_ok() {
            // SQLite magic: "SQLite format 3\0"
            let sqlite_sig = b"SQLite format 3\0";
            return &buffer != sqlite_sig; // Encrypted if NOT matching
        }
    }
    false
}
```

## Critical Rules

- ✅ ALWAYS set `key` pragma BEFORE any other operation
- ✅ ALWAYS use `SecureString` for encryption keys
- ✅ ALWAYS verify encryption after creating database
- ❌ NEVER log encryption keys (even in debug mode)
- ❌ NEVER store keys in plain text files
