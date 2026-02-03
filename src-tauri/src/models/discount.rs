//! Discount Models

use serde::{Deserialize, Serialize};

/// Discount - Configurable discounts for products, categories, clients, etc.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Discount {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub discount_type: String,      // "percentage", "fixed", "volume"
    pub value: f64,                 // Percentage or fixed amount
    pub applies_to: String,         // "product", "category", "client", "payment_method", "all"
    pub target_id: Option<String>,  // ID of product/category/client if applicable
    pub min_quantity: Option<f64>,  // For volume discounts
    pub max_uses: Option<i64>,      // Max times this discount can be used (null = unlimited)
    pub times_used: i64,            // Counter of times used
    pub start_date: Option<String>, // Promotion start date
    pub end_date: Option<String>,   // Promotion end date
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for creating a discount
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDiscountDto {
    pub name: String,
    pub discount_type: String,
    pub value: f64,
    pub applies_to: String,
    pub target_id: Option<String>,
    pub min_quantity: Option<f64>,
    pub max_uses: Option<i64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_active: bool,
}

/// DTO for updating a discount
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDiscountDto {
    pub name: Option<String>,
    pub discount_type: Option<String>,
    pub value: Option<f64>,
    pub applies_to: Option<String>,
    pub target_id: Option<String>,
    pub min_quantity: Option<f64>,
    pub max_uses: Option<i64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_active: Option<bool>,
}
