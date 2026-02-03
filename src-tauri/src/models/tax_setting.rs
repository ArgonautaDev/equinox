//! Tax Setting Model

use serde::{Deserialize, Serialize};

/// Tax Setting - configurable taxes like IVA, IGTF
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxSetting {
    pub id: String,
    pub tenant_id: String,
    pub name: String,       // "IVA", "IGTF", "ISR"
    pub rate: f64,          // 16.0 for 16%
    pub applies_to: String, // "all", "products", "services", "foreign_currency"
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for creating a tax setting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaxSettingDto {
    pub name: String,
    pub rate: f64,
    pub applies_to: String,
    pub is_active: bool,
}

/// DTO for updating a tax setting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaxSettingDto {
    pub name: Option<String>,
    pub rate: Option<f64>,
    pub applies_to: Option<String>,
    pub is_active: Option<bool>,
}
