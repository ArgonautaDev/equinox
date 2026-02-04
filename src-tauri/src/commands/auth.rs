//! Authentication Commands
//!
//! User authentication with Argon2 password hashing.

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::Utc;
use rand::rngs::OsRng;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

use crate::security::audit;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub org_id: String,
    pub tenant_id: Option<String>,
    pub name: String,
    pub email: String,
    pub role: String,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct LoginCredentials {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterUserDto {
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: Option<String>,
}

/// Hash a password using Argon2
pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| format!("Failed to hash password: {}", e))
}

/// Verify a password against a hash
pub fn verify_password(password: &str, hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

/// Login with email and password
#[tauri::command]
pub async fn login(
    state: State<'_, AppState>,
    credentials: LoginCredentials,
) -> Result<User, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Find user by email
    let user_result = conn.query_row(
        r#"
        SELECT id, org_id, tenant_id, name, email, password_hash, role, is_active
        FROM users
        WHERE LOWER(email) = LOWER(?1)
        "#,
        [&credentials.email],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, bool>(7)?,
            ))
        },
    );

    let (id, org_id, tenant_id, name, email, password_hash, role, is_active) = match user_result {
        Ok(data) => data,
        Err(_) => {
            audit::log_login(&conn, &credentials.email, false, Some("User not found")).ok();
            return Err("Invalid credentials".to_string());
        }
    };

    // Check if user is active
    if !is_active {
        audit::log_login(&conn, &credentials.email, false, Some("User inactive")).ok();
        return Err("User account is disabled".to_string());
    }

    // Verify password
    if !verify_password(&credentials.password, &password_hash) {
        audit::log_login(&conn, &credentials.email, false, Some("Wrong password")).ok();
        return Err("Invalid credentials".to_string());
    }

    // Log successful login
    audit::log_login(&conn, &email, true, None).ok();

    // Set user and tenant in state
    drop(conn);

    {
        let mut user_id_lock = state.user_id.lock().map_err(|e| e.to_string())?;
        *user_id_lock = Some(id.clone());
    }

    if let Some(ref tid) = tenant_id {
        let mut tenant_id_lock = state.tenant_id.lock().map_err(|e| e.to_string())?;
        *tenant_id_lock = Some(tid.clone());
    }

    Ok(User {
        id,
        org_id,
        tenant_id,
        name,
        email,
        role,
        is_active,
    })
}

/// Logout current user
#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<(), String> {
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let user_id = state.user_id.lock().map_err(|e| e.to_string())?;

        if let Some(ref uid) = *user_id {
            audit::log_event(
                &conn,
                None,
                Some(uid),
                audit::AuditEventType::Logout,
                Some("user"),
                Some(uid),
                "User logged out",
            )
            .ok();
        }
    }

    let mut user_id = state.user_id.lock().map_err(|e| e.to_string())?;
    *user_id = None;

    let mut tenant_id = state.tenant_id.lock().map_err(|e| e.to_string())?;
    *tenant_id = None;

    Ok(())
}

/// Get current authenticated user
#[tauri::command]
pub async fn get_current_user(state: State<'_, AppState>) -> Result<Option<User>, String> {
    let user_id = state.user_id.lock().map_err(|e| e.to_string())?;

    let uid = match &*user_id {
        Some(id) => id.clone(),
        None => return Ok(None),
    };

    drop(user_id);

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let user = conn
        .query_row(
            r#"
        SELECT id, org_id, tenant_id, name, email, role, is_active
        FROM users
        WHERE id = ?1
        "#,
            [&uid],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    org_id: row.get(1)?,
                    tenant_id: row.get(2)?,
                    name: row.get(3)?,
                    email: row.get(4)?,
                    role: row.get(5)?,
                    is_active: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(Some(user))
}

/// Register a new user (admin only)
#[tauri::command]
pub async fn register_user(
    state: State<'_, AppState>,
    data: RegisterUserDto,
) -> Result<User, String> {
    let tenant_id = state.require_tenant()?;

    // Get org_id from tenant
    let org_id: String;
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        org_id = conn
            .query_row(
                "SELECT org_id FROM tenants WHERE id = ?1",
                [&tenant_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
    }

    let password_hash = hash_password(&data.password)?;
    let id = Uuid::new_v4().to_string();
    let role = data.role.unwrap_or_else(|| "operator".to_string());
    let now = Utc::now().to_rfc3339();

    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;

        conn.execute(
            r#"
            INSERT INTO users (id, org_id, tenant_id, email, password_hash, name, role, is_active, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)
            "#,
            params![id, org_id, tenant_id, data.email, password_hash, data.name, role, now],
        ).map_err(|e| e.to_string())?;

        audit::log_event(
            &conn,
            Some(&tenant_id),
            state
                .user_id
                .lock()
                .ok()
                .as_ref()
                .and_then(|u| u.as_deref()),
            audit::AuditEventType::UserCreated,
            Some("user"),
            Some(&id),
            &format!("Created user: {}", data.email),
        )
        .ok();
    }

    Ok(User {
        id,
        org_id,
        tenant_id: Some(tenant_id),
        name: data.name,
        email: data.email,
        role,
        is_active: true,
    })
}

/// Change password for current user
#[tauri::command]
pub async fn change_password(
    state: State<'_, AppState>,
    current_password: String,
    new_password: String,
) -> Result<(), String> {
    let user_id = state.require_user()?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Get current password hash
    let current_hash: String = conn
        .query_row(
            "SELECT password_hash FROM users WHERE id = ?1",
            [&user_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Verify current password
    if !verify_password(&current_password, &current_hash) {
        return Err("Current password is incorrect".to_string());
    }

    // Hash new password
    let new_hash = hash_password(&new_password)?;

    // Update password
    conn.execute(
        "UPDATE users SET password_hash = ?1 WHERE id = ?2",
        params![new_hash, user_id],
    )
    .map_err(|e| e.to_string())?;

    audit::log_event(
        &conn,
        None,
        Some(&user_id),
        audit::AuditEventType::UserUpdated,
        Some("user"),
        Some(&user_id),
        "Password changed",
    )
    .ok();

    Ok(())
}

/// Setup initial admin user and organization
/// This should only work if no users exist in the system
#[tauri::command]
pub async fn setup_initial_admin(
    state: State<'_, AppState>,
    org_name: String,
    admin_name: String,
    admin_email: String,
    admin_password: String,
) -> Result<User, String> {
    // Clone these for use after the DB operations
    let tenant_id_clone: String;
    let user_id_clone: String;
    let org_id_clone: String;
    let admin_email_clone = admin_email.clone();
    let admin_name_clone = admin_name.clone();

    // All DB operations in explicit scope - conn will be dropped at end of scope
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;

        // Check if any users already exist
        let user_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap_or(0);

        if user_count > 0 {
            return Err(
                "El sistema ya tiene usuarios configurados. Use el login normal.".to_string(),
            );
        }

        // Validate password
        if admin_password.len() < 6 {
            return Err("La contraseña debe tener al menos 6 caracteres".to_string());
        }

        let now = Utc::now().to_rfc3339();

        // Create organization
        let org_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"
            INSERT INTO organizations (id, name, plan, created_at)
            VALUES (?1, ?2, 'starter', ?3)
            "#,
            params![org_id, org_name, now],
        )
        .map_err(|e| format!("Error creando organización: {}", e))?;

        // Create default tenant (main branch)
        let tenant_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"
            INSERT INTO tenants (id, org_id, name, is_active, created_at)
            VALUES (?1, ?2, 'Sucursal Principal', 1, ?3)
            "#,
            params![tenant_id, org_id, now],
        )
        .map_err(|e| format!("Error creando sucursal: {}", e))?;

        // Hash the password
        let password_hash = hash_password(&admin_password)?;

        // Create admin user
        let user_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"
            INSERT INTO users (id, org_id, tenant_id, email, password_hash, name, role, is_active, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'admin', 1, ?7)
            "#,
            params![user_id, org_id, tenant_id, admin_email, password_hash, admin_name, now],
        ).map_err(|e| format!("Error creando usuario: {}", e))?;

        // Log the setup
        audit::log_event(
            &conn,
            Some(&tenant_id),
            Some(&user_id),
            audit::AuditEventType::UserCreated,
            Some("system"),
            None,
            &format!("Initial setup: org={}, admin={}", org_name, admin_email),
        )
        .ok();

        // Seed default units and product types for the new tenant
        crate::commands::units::seed_default_units(&conn, &tenant_id).ok();
        crate::commands::product_types::seed_default_product_types(&conn, &tenant_id).ok();

        // Clone values for use outside this scope
        tenant_id_clone = tenant_id;
        user_id_clone = user_id;
        org_id_clone = org_id;
    } // conn is dropped here automatically

    // Set user and tenant in state
    {
        let mut user_id_lock = state.user_id.lock().map_err(|e| e.to_string())?;
        *user_id_lock = Some(user_id_clone.clone());
    }

    {
        let mut tenant_id_lock = state.tenant_id.lock().map_err(|e| e.to_string())?;
        *tenant_id_lock = Some(tenant_id_clone.clone());
    }

    // Sync installation to Supabase (non-blocking - if fails, local installation continues)
    let sync_result = crate::services::sync::sync_installation_to_cloud(
        &state.supabase,
        &state.db,
        &tenant_id_clone,
    )
    .await;

    match sync_result {
        Ok(_) => println!("✅ Installation registered in Supabase"),
        Err(e) => {
            eprintln!(
                "⚠️ Warning: Failed to sync with Supabase (local installation OK): {}",
                e
            );
            // Continue anyway - local installation is complete
        }
    }

    Ok(User {
        id: user_id_clone,
        org_id: org_id_clone,
        tenant_id: Some(tenant_id_clone),
        name: admin_name_clone,
        email: admin_email_clone,
        role: "admin".to_string(),
        is_active: true,
    })
}

/// Check if initial setup is required
/// Returns true if db_config.json doesn't exist (first run)
#[tauri::command]
pub async fn check_setup_required(app: AppHandle) -> Result<bool, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error al obtener directorio de la app: {}", e))?;

    let config_path = app_dir.join(".config").join("db_config.json");

    // Setup is required if the config file doesn't exist
    Ok(!config_path.exists())
}
