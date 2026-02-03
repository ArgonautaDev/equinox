//! Inventory Lot Model

use serde::{Deserialize, Serialize};

/// Inventory Lot - for tracking batches with expiration dates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryLot {
    pub id: String,
    pub tenant_id: String,
    pub product_id: String,
    pub variant_id: Option<String>,
    pub lot_number: String,
    pub quantity: f64,
    pub cost_price: Option<f64>,
    pub expiration_date: Option<String>,
    pub received_date: String,
    pub is_active: bool,
    pub created_at: String,
}

/// DTO for creating a new lot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLotDto {
    pub product_id: String,
    pub variant_id: Option<String>,
    pub lot_number: String,
    pub quantity: f64,
    pub cost_price: Option<f64>,
    pub expiration_date: Option<String>,
    pub received_date: Option<String>,
}

/// DTO for adjusting lot quantity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdjustLotDto {
    pub quantity: f64,
    pub reason: Option<String>,
}

/// Lot filters
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LotFilters {
    pub product_id: Option<String>,
    pub variant_id: Option<String>,
    pub expiring_before: Option<String>,
    pub expired_only: Option<bool>,
    pub is_active: Option<bool>,
}
