//! Price List Models

use serde::{Deserialize, Serialize};

/// Price List - Different pricing tiers for customers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceList {
    pub id: String,
    pub tenant_id: String,
    pub name: String, // "Mayorista", "Minorista", "Empleados"
    pub description: Option<String>,
    pub currency: String,      // "USD", "VES", "EUR"
    pub discount_percent: f64, // Global discount for this list (0-100)
    pub is_default: bool,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Product Price - Specific price for a product in a price list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductPrice {
    pub id: String,
    pub price_list_id: String,
    pub product_id: String,
    pub variant_id: Option<String>,
    pub price: f64,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for creating a price list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePriceListDto {
    pub name: String,
    pub description: Option<String>,
    pub currency: String,
    pub discount_percent: f64,
    pub is_default: bool,
}

/// DTO for updating a price list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePriceListDto {
    pub name: Option<String>,
    pub description: Option<String>,
    pub currency: Option<String>,
    pub discount_percent: Option<f64>,
    pub is_default: Option<bool>,
    pub is_active: Option<bool>,
}

/// DTO for setting a product price in a list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetProductPriceDto {
    pub price_list_id: String,
    pub product_id: String,
    pub variant_id: Option<String>,
    pub price: f64,
}
