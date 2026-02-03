//! Payment Models

use serde::{Deserialize, Serialize};

/// Payment - Record of payments (partial or full) for an invoice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: String,
    pub tenant_id: String,
    pub invoice_id: String,
    pub amount: f64,
    pub currency: String,
    pub received_amount: Option<f64>, // Amount actually received in bank account
    pub exchange_rate: f64,           // Rate at time of payment
    pub payment_method: String,       // "cash", "transfer", "card", "mobile", "check"
    pub reference: Option<String>,    // Transaction reference
    pub bank_account_id: Option<String>, // Linked bank account
    pub payment_date: String,
    pub notes: Option<String>,
    pub created_by: String,
    pub created_at: String,
}

/// DTO for creating a payment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentDto {
    pub invoice_id: String,
    pub amount: f64,
    pub currency: String,
    pub received_amount: Option<f64>,
    pub exchange_rate: f64,
    pub payment_method: String,
    pub reference: Option<String>,
    pub bank_account_id: Option<String>,
    pub payment_date: String,
    pub notes: Option<String>,
}
