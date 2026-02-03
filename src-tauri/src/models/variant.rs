//! Product Variant Model

use serde::{Deserialize, Serialize};

/// Product Variant - for products with variations like size, color, etc.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariant {
    pub id: String,
    pub tenant_id: String,
    pub product_id: String,
    pub sku: Option<String>,
    pub name: String,
    /// JSON string of attributes like {"color": "red", "size": "L"}
    pub attributes: Option<String>,
    pub cost_price: f64,
    pub sale_price: f64,
    pub barcode: Option<String>,
    pub stock_quantity: f64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for creating a new variant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVariantDto {
    pub product_id: String,
    pub name: String,
    pub sku: Option<String>,
    pub attributes: Option<String>,
    pub cost_price: Option<f64>,
    pub sale_price: Option<f64>,
    pub barcode: Option<String>,
}

/// DTO for updating a variant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVariantDto {
    pub name: Option<String>,
    pub sku: Option<String>,
    pub attributes: Option<String>,
    pub cost_price: Option<f64>,
    pub sale_price: Option<f64>,
    pub barcode: Option<String>,
}
