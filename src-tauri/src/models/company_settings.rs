//! Company Settings Model

use serde::{Deserialize, Serialize};

/// Company Settings - Main configuration for invoicing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanySettings {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub legal_id: String, // RIF, Tax ID
    pub address: String,
    pub city: String,
    pub state: String,
    pub country: String,
    pub postal_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub logo_path: Option<String>,
    pub invoice_prefix: String, // "FAC", "INV", etc.
    pub invoice_counter: i64,
    pub default_currency: String,        // "USD", "VES", "EUR"
    pub legal_note: Option<String>,      // Footer text for invoices
    pub invoice_pattern: Option<String>, // e.g. "{PREFIX}-{YEAR}-{NUMBER}"
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for updating company settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompanySettingsDto {
    pub name: Option<String>,
    pub legal_id: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub logo_path: Option<String>,
    pub invoice_prefix: Option<String>,
    pub invoice_pattern: Option<String>,
    pub default_currency: Option<String>,
    pub legal_note: Option<String>,
}

/// Invoice Sequence Settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceSequence {
    pub prefix: String,
    pub next_number: i64,
    pub pattern: String,
}
