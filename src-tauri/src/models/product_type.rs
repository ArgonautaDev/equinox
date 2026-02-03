//! Product Type Model

use serde::{Deserialize, Serialize};

/// ProductType entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductType {
    pub id: String,
    pub tenant_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub affects_stock: bool,
    pub is_system: bool,
    pub is_active: bool,
    pub created_at: String,
}

/// DTO for creating a product type
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CreateProductTypeDto {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub affects_stock: Option<bool>,
}
