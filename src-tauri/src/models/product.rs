//! Enhanced Product Model

use serde::{Deserialize, Serialize};

/// Product entity with full inventory features
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub tenant_id: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub unit_id: Option<String>,
    pub product_type_id: Option<String>,
    pub cost_price: f64,
    pub sale_price: f64,
    pub margin_percent: f64,
    pub margin_amount: f64,
    pub tax_rate: f64,
    pub stock_quantity: f64,
    pub min_stock: f64,
    pub max_stock: f64,
    pub supplier_reference: Option<String>,
    pub image_url: Option<String>,
    pub has_variants: bool,
    pub track_expiration: bool,
    pub cost_method: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for creating a product
#[derive(Debug, Deserialize)]
pub struct CreateProductDto {
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub unit_id: Option<String>,
    pub product_type_id: Option<String>,
    pub cost_price: Option<f64>,
    pub sale_price: Option<f64>,
    pub tax_rate: Option<f64>,
    pub min_stock: Option<f64>,
    pub max_stock: Option<f64>,
    pub supplier_reference: Option<String>,
    pub image_url: Option<String>,
    pub has_variants: Option<bool>,
    pub track_expiration: Option<bool>,
}

/// DTO for updating a product
#[derive(Debug, Deserialize)]
pub struct UpdateProductDto {
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub unit_id: Option<String>,
    pub product_type_id: Option<String>,
    pub cost_price: Option<f64>,
    pub sale_price: Option<f64>,
    pub tax_rate: Option<f64>,
    pub min_stock: Option<f64>,
    pub max_stock: Option<f64>,
    pub supplier_reference: Option<String>,
    pub image_url: Option<String>,
    pub has_variants: Option<bool>,
    pub track_expiration: Option<bool>,
}

/// Product filters
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductFilters {
    pub search: Option<String>,
    pub category_id: Option<String>,
    pub product_type_id: Option<String>,
    pub is_active: Option<bool>,
    pub low_stock: Option<bool>,
}

/// Response with product and related data
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct ProductWithDetails {
    #[serde(flatten)]
    pub product: Product,
    pub category_name: Option<String>,
    pub unit_abbreviation: Option<String>,
    pub product_type_name: Option<String>,
}
