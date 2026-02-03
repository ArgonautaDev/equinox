use crate::infrastructure::security::SecurityManager;
use rusqlite::{Connection, Result};

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tokio::time::sleep;

pub struct DatabaseManager {
    pub conn: Arc<Mutex<Connection>>,
    db_path: PathBuf,
}

impl DatabaseManager {
    pub fn new(app: &AppHandle) -> Result<Self> {
        let app_dir = app
            .path()
            .app_local_data_dir()
            .expect("failed to resolve app dir");
        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
        }

        // "Camouflaged" extension: .vst instead of .db or .sqlite
        let db_path = app_dir.join("vesta_core.vst");

        let key = SecurityManager::get_db_key(app);

        let conn = Connection::open(&db_path)?;

        // Initialize SQLCipher Encryption
        conn.pragma_update(None, "key", key.as_str())?;

        // Optimization: WAL Mode for concurrency
        conn.pragma_update(None, "journal_mode", "WAL")?;

        // Security: Fast secure delete/vacuum
        conn.pragma_update(None, "secure_delete", "fast")?;

        // Create initial tables (Stub for Schema Migration)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY,
                action TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Apply SENIAT Compliance Triggers (Inmutability)
        // We do this inside new() to ensure they are always present.
        Self::apply_compliance_triggers(&conn)?;

        // Initialize IAM and Ensure Mandatory Audit User
        crate::infrastructure::iam::valid_init(&conn)?;

        // Initialize Inventory Domain Tables
        crate::domains::inventory_management::infrastructure::init_inventory_tables(&conn)?;

        // Initialize CRM Domain Tables
        crate::domains::crm_and_marketing::infrastructure::init_crm_tables(&conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path,
        })
    }

    /// Enforces Immutability at the SQL Level (Triggers)
    fn apply_compliance_triggers(conn: &Connection) -> Result<()> {
        // Prevent updates to audit_logs
        conn.execute(
            "CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_update
             BEFORE UPDATE ON audit_logs
             BEGIN
                 SELECT RAISE(ABORT, '⛔ INTEGRIDAD VIOLADA: Los logs de auditoría son inmutables (SENIAT Art. 8)');
             END;",
            [],
        )?;

        // Prevent deletions from audit_logs
        conn.execute(
            "CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_delete
             BEFORE DELETE ON audit_logs
             BEGIN
                 SELECT RAISE(ABORT, '⛔ INTEGRIDAD VIOLADA: Los logs de auditoría no se pueden borrar (SENIAT Art. 8)');
             END;",
            [],
        )?;

        Ok(())
    }

    /// Starts the Auto-Backup Routine
    pub fn start_backup_scheduler(&self, app: AppHandle) {
        let conn_clone = self.conn.clone();

        tauri::async_runtime::spawn(async move {
            loop {
                // Run every 4 hours
                sleep(Duration::from_secs(4 * 3600)).await;

                let backup_dir = SecurityManager::get_backup_path(&app);
                if !backup_dir.exists() {
                    let _ = std::fs::create_dir_all(&backup_dir);
                }

                let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
                let backup_file = backup_dir.join(format!("backup_{}.vst", timestamp));

                let backup_query = format!("VACUUM INTO '{}'", backup_file.to_string_lossy());

                let lock = conn_clone.lock().unwrap();
                match lock.execute(&backup_query, []) {
                    Ok(_) => {
                        println!("✅ Auto-Backup successful: {:?}", backup_file);
                        // TODO: Rotate backups (delete older than X)
                    }
                    Err(e) => eprintln!("❌ Auto-Backup failed: {}", e),
                }
            }
        });
    }
    /// Verifies that the database header is camouflaged (encrypted)
    pub fn verify_camouflage(&self) {
        if let Ok(mut file) = std::fs::File::open(&self.db_path) {
            use std::io::Read;
            let mut buffer = [0u8; 16];
            if file.read_exact(&mut buffer).is_ok() {
                let sqlite_sig = b"SQLite format 3\0";
                if &buffer == sqlite_sig {
                    eprintln!("⚠️ SECURITY WARNING: Database header is NOT camouflaged! (Standard SQLite signature found)");
                } else {
                    println!(
                        "🛡️ Database Verification check: Camouflaged. (Header mismatch confirmed)"
                    );
                    println!("   Header Bytes: {:?}", buffer);
                }
            }
        }
    }

    /// Verifies System Time Integrity (Anti-Backdating / Token of Life)
    /// Panics if time manipulation is detected.
    pub fn verify_time_integrity(&self) -> std::result::Result<(), String> {
        let conn_lock = self.conn.lock().unwrap();
        let result = crate::infrastructure::time_guard::verify_integrity(&conn_lock);

        if result.is_err() {
            // Log the Critical Event
            let _ = crate::infrastructure::audit::log_event(
                &conn_lock,
                crate::infrastructure::audit::AuditEventType::SystemTimeChanged,
                "Integrity Check Failed",
                None,
            );
        }

        result
    }

    /// Exports the database with a user-defined Transport Password (Rekeying)
    /// This detaches the database from the hardware key and makes it portable.
    pub fn export_database(
        &self,
        app: &AppHandle,
        target_path: PathBuf,
        transport_password: crate::infrastructure::security::SecureString,
    ) -> Result<()> {
        let temp_dir = app.path().temp_dir().expect("failed to get temp dir");
        let temp_path = temp_dir.join("vesta_export_temp.vst");

        // Step 1: Create a temporary copy (Still encrypted with Hardware Key)
        // We use a scope here to ensure the lock is held only during the VACUUM
        {
            let conn_lock = self.conn.lock().unwrap();
            let backup_query = format!("VACUUM INTO '{}'", temp_path.to_string_lossy());
            conn_lock.execute(&backup_query, [])?;
        }

        // Step 2: Open the temporary copy and Re-Key it
        // Note: We need the original hardware key to open it first.
        let hw_key = SecurityManager::get_db_key(app);

        {
            let temp_conn = Connection::open(&temp_path)?;

            // Open with HW Key
            temp_conn.pragma_update(None, "key", hw_key.as_str())?;

            // Re-Key with Transport Password
            temp_conn.pragma_update(None, "rekey", transport_password.as_str())?;

            // Ensure WAL is checkpointed and disabled for portability (optional, but good for single-file transport)
            temp_conn.pragma_update(None, "journal_mode", "DELETE")?;
        } // temp_conn drops here, closing the file

        // Step 3: Move the re-keyed file to the final target path
        if target_path.exists() {
            std::fs::remove_file(&target_path).expect("failed to remove existing target");
        }
        std::fs::rename(&temp_path, &target_path).expect("failed to move export to target");

        println!(
            "📦 Database exported and re-keyed successfully to: {:?}",
            target_path
        );

        Ok(())
    }
}
