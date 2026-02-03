//! Secure Chain (Blockchain-Lite)
//!
//! Provides integrity verification for fiscal documents using hash chains.

use sha2::{Digest, Sha256};

const CHAIN_SALT: &str = "equinox-integrity-chain-v1";

/// Calculate the hash for a block in the chain
pub fn calculate_hash(prev_hash: &str, payload: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash);
    hasher.update(payload);
    hasher.update(CHAIN_SALT);
    hex::encode(hasher.finalize())
}

/// Verify if a hash is correct
pub fn verify_hash(prev_hash: &str, payload: &str, expected_hash: &str) -> bool {
    calculate_hash(prev_hash, payload) == expected_hash
}

/// Get the genesis hash (first block)
pub fn get_genesis_hash() -> String {
    "0".repeat(64)
}
