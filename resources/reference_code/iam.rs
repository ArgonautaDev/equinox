use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;
use rusqlite::{params, types::Type, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum UserRole {
    Admin,
    Operator,
    AuditorSENIAT,
}

impl ToString for UserRole {
    fn to_string(&self) -> String {
        match self {
            UserRole::Admin => "ADMIN".to_string(),
            UserRole::Operator => "OPERATOR".to_string(),
            UserRole::AuditorSENIAT => "AUDITOR_SENIAT".to_string(),
        }
    }
}

impl From<String> for UserRole {
    fn from(s: String) -> Self {
        match s.as_str() {
            "ADMIN" => UserRole::Admin,
            "AUDITOR_SENIAT" => UserRole::AuditorSENIAT,
            _ => UserRole::Operator,
        }
    }
}

pub struct User {
    pub id: i32,
    pub username: String,
    pub role: UserRole,
}

/// Initializes the IAM system: Creates table and seeds mandatory users.
pub fn valid_init(conn: &Connection) -> Result<()> {
    // 1. Create Users Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // 2. Ensure SENIAT Auditor exists
    ensure_seniat_user(conn)?;

    Ok(())
}

fn ensure_seniat_user(conn: &Connection) -> Result<()> {
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM users WHERE role = 'AUDITOR_SENIAT')",
        [],
        |row| row.get(0),
    )?;

    if !exists {
        println!("🔒 IAM: Creating Mandatory SENIAT Auditor User...");

        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();

        // DEFAULT PASSWORD compliant with "Sealed Envelope".
        // In a real deploy, this should be randomized and printed to a secure output.
        // For development/homologation demo:
        let password_plain = "SENIAT-2026-Audit!";

        let password_hash = argon2
            .hash_password(password_plain.as_bytes(), &salt)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?
            .to_string();

        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            params![
                "seniat_audit",
                password_hash,
                UserRole::AuditorSENIAT.to_string()
            ],
        )?;

        println!("✅ IAM: SENIAT Auditor User Created. Credential: seniat_audit / [HIDDEN]");
    }

    Ok(())
}

/// Verifies user credentials
pub fn authenticate(
    conn: &Connection,
    username: &str,
    password_attempt: &str,
) -> Result<Option<User>> {
    let mut stmt =
        conn.prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?")?;
    let mut rows = stmt.query([username])?;

    if let Some(row) = rows.next()? {
        let password_hash_str: String = row.get(2)?;
        let parsed_hash = PasswordHash::new(&password_hash_str)
            .map_err(|e| rusqlite::Error::FromSqlConversionFailure(2, Type::Text, Box::new(e)))?;

        if Argon2::default()
            .verify_password(password_attempt.as_bytes(), &parsed_hash)
            .is_ok()
        {
            let user = User {
                id: row.get(0)?,
                username: row.get(1)?,
                role: UserRole::from(row.get::<_, String>(3)?),
            };
            return Ok(Some(user));
        }
    }

    Ok(None)
}
