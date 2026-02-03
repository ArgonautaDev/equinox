//! Price History Model

use serde::{Deserialize, Serialize};

/// Price History - tracks changes to product prices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceHistory {
    pub id: String,
    pub tenant_id: String,
    pub product_id: String,
    pub variant_id: Option<String>,
    /// Type: "cost" or "sale"
    pub price_type: String,
    pub old_price: Option<f64>,
    pub new_price: f64,
    pub changed_by: Option<String>,
    pub reason: Option<String>,
    pub created_at: String,
}

/// Price history filters
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PriceHistoryFilters {
    pub product_id: Option<String>,
    pub variant_id: Option<String>,
    pub price_type: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}
