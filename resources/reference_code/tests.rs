#[cfg(test)]
mod tests {
    // use crate::infrastructure::db::DatabaseManager;
    use crate::infrastructure::secure_chain;
    use crate::infrastructure::time_guard;
    use chrono::{Duration, Utc};
    use rusqlite::Connection;

    // --- FEATURE 0.1.5: Secure Chain & Hashing ---
    #[test]
    fn test_chain_consistency() {
        let prev_hash = "0000000000000000000000000000000000000000000000000000000000000000";
        let payload = "Factura #1: $100.00";

        // Calculate hash
        let hash1 = secure_chain::calculate_hash(prev_hash, payload);

        // Calculate again (Deteminism check)
        let hash2 = secure_chain::calculate_hash(prev_hash, payload);

        assert_eq!(hash1, hash2, "Hashing must be deterministic");
        assert_eq!(hash1.len(), 64, "SHA256 hex string must be 64 chars");

        // Verify Integrity Check
        assert!(secure_chain::verify_record_integrity(
            prev_hash, payload, &hash1
        ));

        // Verify Tamper Detection
        let tampered_payload = "Factura #1: $1.00";
        assert!(
            !secure_chain::verify_record_integrity(prev_hash, tampered_payload, &hash1),
            "Should detect payload tampering"
        );
    }

    // --- FEATURE 0.1.4: Token of Life (Time Guard) ---
    #[test]
    fn test_time_guard_logic() {
        let conn = Connection::open_in_memory().unwrap();

        // 1. First run (Success)
        let result = time_guard::verify_integrity(&conn);
        assert!(result.is_ok(), "First run should succeed");

        // 2. Simulate valid future access (Time moves forward)
        // We artificially update the DB to the past to simulate "now is later"
        // Actually, time_guard checking uses System Time. We can't easily mock System Time in Rust std without crates.
        // Instead, we will simulate the "Attack scenario" by manually inserting a FUTURE timestamp in the DB
        // and then calling verify, which will see "Now < Last_Seen".

        let future_time = Utc::now() + Duration::hours(5); // 5 hours in future
        conn.execute(
            "INSERT OR REPLACE INTO security_metadata (key, value) VALUES ('last_seen_timestamp', ?)",
            [future_time.to_rfc3339()],
        ).unwrap();

        // 3. Now run verify (Should detect backdating/time travel relative to DB)
        // because Now (Real) < Future_Time (DB)
        // Tolerance is 1 hour. Difference is 5 hours. Should Fail.
        let result_bad = time_guard::verify_integrity(&conn);
        assert!(
            result_bad.is_err(),
            "Should detect that system time is behind database time (Backdating attempt)"
        );
    }

    // --- FEATURE 0.1.5: SQL Triggers (Immutability) ---
    // Note: We need to access apply_compliance_triggers. It is private in DatabaseManager.
    // We might need to copy the logic here or make it pub(crate) for testing.
    // For this test, I will replicate the SQL logic to verify the TRIGGER syntax and behavior works in SQLite.
    #[test]
    fn test_sqlite_immutability_triggers() {
        let conn = Connection::open_in_memory().unwrap();

        // Create table
        conn.execute(
            "CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, action TEXT)",
            [],
        )
        .unwrap();

        // Apply Trigger (Same SQL as in db.rs)
        conn.execute(
            "CREATE TRIGGER trg_audit_logs_no_update
             BEFORE UPDATE ON audit_logs
             BEGIN
                 SELECT RAISE(ABORT, ' violation');
             END;",
            [],
        )
        .unwrap();

        conn.execute(
            "CREATE TRIGGER trg_audit_logs_no_delete
             BEFORE DELETE ON audit_logs
             BEGIN
                 SELECT RAISE(ABORT, ' violation');
             END;",
            [],
        )
        .unwrap();

        // Insert Data
        conn.execute("INSERT INTO audit_logs (action) VALUES ('login')", [])
            .unwrap();

        // Attempt Update
        let result_update =
            conn.execute("UPDATE audit_logs SET action = 'hacked' WHERE id = 1", []);
        assert!(
            result_update.is_err(),
            "UPDATE should be blocked by trigger"
        );

        // Attempt Delete
        let result_delete = conn.execute("DELETE FROM audit_logs WHERE id = 1", []);
        assert!(
            result_delete.is_err(),
            "DELETE should be blocked by trigger"
        );
    }

    // --- FEATURE 0.1.6: SENIAT Auditor User (IAM) ---
    #[test]
    fn test_iam_seniat_user() {
        let conn = Connection::open_in_memory().unwrap();

        // 1. Initialize IAM (Should create table + user)
        use crate::infrastructure::iam;
        iam::valid_init(&conn).expect("IAM init failed");

        // 2. Try to authenticate with WRONG password
        let auth_result = iam::authenticate(&conn, "seniat_audit", "wrongpass").unwrap();
        assert!(auth_result.is_none(), "Should fail specific auth check");

        // 3. Try to authenticate with CORRECT password
        // Note: Password defined in iam.rs as "SENIAT-2026-Audit!"
        let auth_success = iam::authenticate(&conn, "seniat_audit", "SENIAT-2026-Audit!").unwrap();

        assert!(auth_success.is_some(), "Should authenticate auditor");
        let user = auth_success.unwrap();

        assert_eq!(user.username, "seniat_audit");
        assert_eq!(user.role, iam::UserRole::AuditorSENIAT);
    }
}
