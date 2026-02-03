---
name: equinox-invoicing
description: >
  Invoicing module patterns for Equinox ERP with SENIAT compliance.
  Trigger: When working on invoices, fiscal documents, PDF generation, or tax calculations.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [src-tauri, src]
  auto_invoke: "Working on invoicing module"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Module Overview

The Invoicing module handles:
- Invoice CRUD with secure chain
- Tax calculations (IVA Venezuela)
- PDF generation
- Fiscal document numbering
- Integration with inventory (stock deduction)

## Invoice Lifecycle

```
Draft → Issued → Paid
         ↓
       Voided (with justification, logged)
```

## Rust Backend

### Models

```rust
// models/invoice.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub tenant_id: String,
    pub client_id: Option<String>,
    pub client_name: String,
    pub client_tax_id: Option<String>,
    
    // Numbering
    pub invoice_number: String,
    pub control_number: Option<String>,
    
    // Dates
    pub invoice_date: String,
    pub due_date: Option<String>,
    
    // Status
    pub status: InvoiceStatus,
    
    // Amounts
    pub currency: String,
    pub exchange_rate: Decimal,
    pub subtotal: Decimal,
    pub tax_amount: Decimal,
    pub exempt_amount: Decimal,
    pub discount_amount: Decimal,
    pub total: Decimal,
    
    // Secure Chain (SENIAT)
    pub prev_hash: String,
    pub hash: String,
    
    pub notes: Option<String>,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub id: String,
    pub invoice_id: String,
    pub product_id: Option<String>,
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub tax_rate: Decimal,
    pub discount_percent: Decimal,
    pub subtotal: Decimal,
    pub tax_amount: Decimal,
    pub total: Decimal,
}

pub enum InvoiceStatus {
    Draft,
    Issued,
    Paid,
    Voided,
}
```

### Commands

```rust
// commands/invoicing.rs
#[tauri::command]
pub async fn create_invoice(state: State<'_, AppState>, data: CreateInvoiceDto) -> Result<Invoice, String>;

#[tauri::command]
pub async fn add_invoice_item(state: State<'_, AppState>, invoice_id: String, item: CreateInvoiceItemDto) -> Result<InvoiceItem, String>;

#[tauri::command]
pub async fn calculate_totals(items: Vec<InvoiceItemDto>) -> Result<InvoiceTotals, String>;

#[tauri::command]
pub async fn issue_invoice(state: State<'_, AppState>, id: String) -> Result<Invoice, String>;

#[tauri::command]
pub async fn generate_invoice_pdf(state: State<'_, AppState>, id: String) -> Result<Vec<u8>, String>;

#[tauri::command]
pub async fn verify_chain_integrity(state: State<'_, AppState>) -> Result<ChainVerification, String>;
```

### Issue Invoice (with Secure Chain)

```rust
pub fn issue_invoice(conn: &Connection, invoice_id: &str) -> Result<Invoice, AppError> {
    let mut invoice = get_invoice(conn, invoice_id)?;
    
    if invoice.status != InvoiceStatus::Draft {
        return Err(AppError::Validation("Only drafts can be issued".into()));
    }
    
    // Get last hash in chain
    let prev_hash = get_last_invoice_hash(conn, &invoice.tenant_id)?;
    
    // Generate payload and hash
    let payload = invoice.to_chain_payload();
    let hash = secure_chain::calculate_hash(&prev_hash, &payload);
    
    // Update invoice
    invoice.prev_hash = prev_hash;
    invoice.hash = hash;
    invoice.status = InvoiceStatus::Issued;
    
    // Persist
    update_invoice_chain(conn, &invoice)?;
    
    // Log to audit
    audit::log_event(conn, AuditEventType::FiscalDocumentCreated, 
        Some("invoice"), Some(&invoice.id), 
        &format!("Invoice {} issued", invoice.invoice_number), 
        None)?;
    
    // Deduct stock
    deduct_invoice_stock(conn, &invoice)?;
    
    Ok(invoice)
}
```

### Tax Calculation

```rust
use rust_decimal::Decimal;
use rust_decimal_macros::dec;

pub fn calculate_line_totals(
    quantity: Decimal,
    unit_price: Decimal,
    tax_rate: Decimal,
    discount_percent: Decimal,
) -> LineTotals {
    let gross = quantity * unit_price;
    let discount = gross * discount_percent / dec!(100);
    let subtotal = gross - discount;
    let tax = subtotal * tax_rate / dec!(100);
    let total = subtotal + tax;
    
    LineTotals { subtotal, tax, total }
}
```

## React Frontend

### File Structure

```
src/modules/invoicing/
├── index.tsx              # Route: /invoices
├── InvoiceList.tsx        # Table
├── InvoiceForm.tsx        # Create/Edit
├── InvoicePreview.tsx     # PDF preview
├── InvoiceItemRow.tsx     # Line item
├── TotalsDisplay.tsx      # Summary
├── columns.tsx
└── hooks.ts
```

## Critical Rules

- ✅ ALWAYS use secure_chain when issuing
- ✅ ALWAYS log to audit on fiscal operations
- ✅ ALWAYS deduct stock after issuing
- ✅ ALWAYS use Decimal for all money
- ❌ NEVER delete issued invoices
- ❌ NEVER modify hash after issuing
- ❌ NEVER allow issuing with incomplete data
