//! Unit of Measurement Model

use serde::{Deserialize, Serialize};

/// Unit entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Unit {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub abbreviation: String,
    pub unit_type: String,
    pub base_unit_id: Option<String>,
    pub conversion_factor: f64,
    pub is_active: bool,
    pub created_at: String,
}

/// DTO for creating a unit
#[derive(Debug, Deserialize)]
pub struct CreateUnitDto {
    pub name: String,
    pub abbreviation: String,
    pub unit_type: Option<String>,
    pub base_unit_id: Option<String>,
    pub conversion_factor: Option<f64>,
}

/// DTO for updating a unit
#[derive(Debug, Deserialize)]
pub struct UpdateUnitDto {
    pub name: Option<String>,
    pub abbreviation: Option<String>,
    pub unit_type: Option<String>,
    pub base_unit_id: Option<String>,
    pub conversion_factor: Option<f64>,
}
