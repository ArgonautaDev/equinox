use hex;
use rusqlite::{Connection, Result};
use sha2::{Digest, Sha256};

/// Calculates the SHA256 hash of a block (invoice/event)
/// Formula: Hash = SHA256( prev_hash + data_payload + salt )
pub fn calculate_hash(prev_hash: &str, payload: &str) -> String {
    // Fixed Salt for Vesta Chain (Should ideally be dynamic per install or fixed per version)
    // We use a fixed salt here to prevent simple rainbow tables on known payloads.
    // In production, this should be the Hardware ID + Fixed Salt.
    let salt = "vesta-integrity-chain-v1";

    let mut hasher = Sha256::new();
    hasher.update(prev_hash);
    hasher.update(payload);
    hasher.update(salt);

    hex::encode(hasher.finalize())
}

/// Verifies the integrity of a specific record by recalculating its hash
pub fn verify_record_integrity(prev_hash: &str, payload: &str, stored_hash: &str) -> bool {
    let calculated = calculate_hash(prev_hash, payload);
    calculated == stored_hash
}

/// Gets the hash of the last record in a chain-table
/// If table is empty, returns the GENESIS hash (zeros).
pub fn get_last_hash(conn: &Connection, table_name: &str) -> Result<String> {
    // SECURITY WARNING: table_name must be a trusted string constant, not user input.
    // Rusqlite doesn't allow binding table names for security.
    let query = format!("SELECT hash FROM {} ORDER BY id DESC LIMIT 1", table_name);

    let result: Result<String> = conn.query_row(&query, [], |row| row.get(0));

    match result {
        Ok(hash) => Ok(hash),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            Ok("0000000000000000000000000000000000000000000000000000000000000000".to_string())
        } // Genesis
        Err(e) => Err(e),
    }
}
