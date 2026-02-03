//! Bank Account Model

use serde::{Deserialize, Serialize};

/// Bank Account - for payment instructions on invoices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankAccount {
    pub id: String,
    pub tenant_id: String,
    pub bank_name: String,
    pub account_number: String,
    pub account_type: String, // "checking", "savings"
    pub currency: String,     // "USD", "VES", "EUR"
    pub is_default: bool,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// DTO for creating a bank account
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBankAccountDto {
    pub bank_name: String,
    pub account_number: String,
    pub account_type: String,
    pub currency: String,
    pub is_default: bool,
}

/// DTO for updating a bank account
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBankAccountDto {
    pub bank_name: Option<String>,
    pub account_number: Option<String>,
    pub account_type: Option<String>,
    pub currency: Option<String>,
    pub is_default: Option<bool>,
}
