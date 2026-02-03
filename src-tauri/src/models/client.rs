//! Client Model

use serde::{Deserialize, Serialize};

/// Client entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub tenant_id: String,
    pub code: Option<String>,
    pub name: String,
    pub tax_id: Option<String>,   // RIF: V-12345678-9, J-12345678-9, etc.
    pub tax_type: Option<String>, // V, E, J, G, P
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for creating a new client
#[derive(Debug, Deserialize)]
pub struct CreateClientDto {
    pub name: String,
    pub tax_id: Option<String>,
    pub tax_type: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
}

/// DTO for updating an existing client
#[derive(Debug, Deserialize)]
pub struct UpdateClientDto {
    pub code: Option<String>,
    pub name: Option<String>,
    pub tax_id: Option<String>,
    pub tax_type: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
}

/// Filters for listing clients
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClientFilters {
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

/// Validate Venezuelan RIF format
/// Format: X-XXXXXXXX-X (e.g., V-12345678-9, J-12345678-9)
pub fn validate_rif(rif: &str) -> bool {
    if rif.is_empty() {
        return true; // Empty is valid (optional field)
    }

    let re = regex::Regex::new(r"^[VEJGP]-\d{8}-\d$").unwrap();
    re.is_match(rif)
}
