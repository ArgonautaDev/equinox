//! Secure Chain (Blockchain-Lite)
//!
//! Provides integrity verification for fiscal documents using hash chains.

use sha2::{Digest, Sha256};

#[allow(dead_code)]
const CHAIN_SALT: &str = "equinox-chain-v1";

/// Calculate SHA256 hash of data with salt
#[allow(dead_code)]
fn calculate_hash(prev_hash: &str, payload: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash);
    hasher.update(payload);
    hasher.update(CHAIN_SALT);
    hex::encode(hasher.finalize())
}

/// Verify integrity of a hash
#[allow(dead_code)]
pub fn verify_hash(prev_hash: &str, payload: &str, expected_hash: &str) -> bool {
    calculate_hash(prev_hash, payload) == expected_hash
}

/// Get genesis block hash
#[allow(dead_code)]
pub fn get_genesis_hash() -> String {
    "0".repeat(64)
}
