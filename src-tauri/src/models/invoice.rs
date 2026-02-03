//! Invoice Models

use serde::{Deserialize, Serialize};

/// Invoice - Main billing document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub tenant_id: String,
    pub invoice_number: String,
    pub invoice_type: String, // "quote", "invoice", "credit_note", "debit_note"
    pub status: String,       // "draft", "issued", "paid", "partial", "cancelled"
    pub client_id: String,
    pub client_name: String, // Snapshot at time of invoice
    pub client_tax_id: Option<String>,
    pub client_address: Option<String>,
    pub price_list_id: Option<String>,
    pub currency: String,   // "USD", "VES", "EUR"
    pub exchange_rate: f64, // Rate to VES
    pub issue_date: String,
    pub due_date: Option<String>,
    pub payment_terms: Option<String>, // "CONTADO", "CRÉDITO 15 DÍAS"
    pub subtotal: f64,
    pub discount_total: f64,
    pub tax_total: f64,
    pub total: f64,
    pub paid_amount: f64,
    pub notes: Option<String>,
    pub created_by: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Invoice Item - Line item in an invoice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub id: String,
    pub invoice_id: String,
    pub product_id: String,
    pub variant_id: Option<String>,
    pub lot_id: Option<String>, // For FIFO tracking
    pub code: String,           // SKU snapshot
    pub description: String,    // Product name snapshot
    pub quantity: f64,
    pub unit_price: f64,
    pub discount_percent: f64,
    pub discount_amount: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub line_total: f64,
}

/// DTO for creating an invoice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceDto {
    pub invoice_type: String,
    pub client_id: String,
    pub price_list_id: Option<String>,
    pub currency: String,
    pub exchange_rate: f64,
    pub issue_date: String,
    pub due_date: Option<String>,
    pub payment_terms: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<CreateInvoiceItemDto>,
}

/// DTO for creating an invoice item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceItemDto {
    pub product_id: String,
    pub variant_id: Option<String>,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount_percent: f64,
    pub tax_rate: f64,
}

/// DTO for updating an invoice (draft only)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInvoiceDto {
    pub client_id: Option<String>,
    pub price_list_id: Option<String>,
    pub currency: Option<String>,
    pub exchange_rate: Option<f64>,
    pub issue_date: Option<String>,
    pub due_date: Option<String>,
    pub payment_terms: Option<String>,
    pub notes: Option<String>,
    pub items: Option<Vec<CreateInvoiceItemDto>>,
}

/// Invoice filters
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InvoiceFilters {
    pub invoice_type: Option<String>,
    pub status: Option<String>,
    pub client_id: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}
