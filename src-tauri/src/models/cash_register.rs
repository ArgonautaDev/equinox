use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CashRegister {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub status: String, // open, closed
    pub current_session_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashRegisterSession {
    pub id: String,
    pub tenant_id: String,
    pub register_id: String,
    pub user_id: String,
    pub status: String, // active, closed
    pub start_time: String,
    pub end_time: Option<String>,

    // Opening
    pub opening_amount_usd: f64,
    pub opening_amount_ves: f64,
    pub opening_amount_eur: f64,
    pub opening_exchange_rate_ves: f64,
    pub opening_exchange_rate_eur: f64,
    pub opening_notes: Option<String>,

    // Closing
    pub closing_amount_usd: Option<f64>,
    pub closing_amount_ves: Option<f64>,
    pub closing_amount_eur: Option<f64>,
    pub closing_notes: Option<String>,

    // Expected (Snapshot)
    pub expected_amount_usd: Option<f64>,
    pub expected_amount_ves: Option<f64>,
    pub expected_amount_eur: Option<f64>,

    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashMovement {
    pub id: String,
    pub tenant_id: String,
    pub session_id: String,
    pub user_id: String,
    pub movement_type: String, // deposit, withdrawal
    pub amount: f64,
    pub currency: String,
    pub exchange_rate: f64,
    pub reason: Option<String>,
    pub reference: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct OpenSessionDto {
    pub register_id: String,
    pub opening_amount_usd: f64,
    pub opening_amount_ves: f64,
    pub opening_amount_eur: f64,
    pub notes: Option<String>,
    pub exchange_rate_ves: f64,
    pub exchange_rate_eur: f64,
}

#[derive(Debug, Deserialize)]
pub struct CloseSessionDto {
    pub session_id: String,
    pub closing_amount_usd: f64,
    pub closing_amount_ves: f64,
    pub closing_amount_eur: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddMovementDto {
    pub session_id: String,
    pub movement_type: String,
    pub amount: f64,
    pub currency: String,
    pub reason: String,
    pub reference: String,
}
