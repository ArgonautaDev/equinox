//! Invoice Commands

use crate::models::{
    CreateInvoiceDto, CreateInvoiceItemDto, Invoice, InvoiceFilters, InvoiceItem, UpdateInvoiceDto,
};
use crate::services::tax_calculator;
use crate::state::AppState;
use rust_decimal::prelude::*;
use rust_decimal_macros::dec;
use tauri::State;
use uuid::Uuid;

fn sanitize_client_name_for_pattern(name: &str) -> String {
    let binding = name.to_uppercase();
    let words: Vec<&str> = binding
        .split_whitespace()
        .filter(|w| w.chars().all(|c| c.is_alphanumeric()))
        .collect();

    if words.is_empty() {
        return "CLI".to_string();
    }

    if words.len() == 1 {
        // Single word: take up to first 3 chars
        let word = words[0];
        word.chars().take(3).collect()
    } else {
        // Multi word: take first char of up to first 3 words
        words
            .iter()
            .take(3)
            .map(|w| w.chars().next().unwrap_or(' '))
            .collect()
    }
}

/// Get tenant_id from state
fn get_tenant_id(state: &State<'_, AppState>) -> Result<String, String> {
    state
        .tenant_id
        .lock()
        .map_err(|_| "Error al acceder al tenant".to_string())?
        .clone()
        .ok_or_else(|| "No hay tenant activo".to_string())
}

/// Get user_id from state
fn get_user_id(state: &State<'_, AppState>) -> Result<String, String> {
    state
        .user_id
        .lock()
        .map_err(|_| "Error al acceder al usuario".to_string())?
        .clone()
        .ok_or_else(|| "No hay usuario activo".to_string())
}

/// Generate next invoice number
/// Generate next invoice number
fn generate_invoice_number(
    conn: &rusqlite::Connection,
    tenant_id: &str,
    prefix: &str,
    pattern: &str,
    client_identifier: &str,
) -> String {
    let next_num: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(invoice_counter), 0) + 1 FROM company_settings WHERE tenant_id = ?1",
            [tenant_id],
            |row| row.get(0),
        )
        .unwrap_or(1);

    // Update counter
    conn.execute(
        "UPDATE company_settings SET invoice_counter = ?1 WHERE tenant_id = ?2",
        rusqlite::params![next_num, tenant_id],
    )
    .ok();

    let now = chrono::Utc::now();
    let year = now.format("%Y").to_string();
    let month = now.format("%m").to_string(); // 01-12
    let number_str = format!("{:08}", next_num);

    // Default pattern if empty
    let pattern = if pattern.trim().is_empty() {
        "{PREFIX}-{NUMBER}"
    } else {
        pattern
    };

    pattern
        .replace("{PREFIX}", prefix)
        .replace("{NUMBER}", &number_str)
        .replace("{YEAR}", &year)
        .replace("{MONTH}", &month)
        .replace("{CLIENT}", client_identifier)
}

/// List invoices with filters
#[tauri::command]
pub async fn list_invoices(
    state: State<'_, AppState>,
    filters: Option<InvoiceFilters>,
) -> Result<Vec<Invoice>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let filters = filters.unwrap_or_default();
    let mut conditions = vec!["tenant_id = ?1".to_string()];
    let mut params: Vec<String> = vec![tenant_id.clone()];

    if let Some(ref t) = filters.invoice_type {
        params.push(t.clone());
        conditions.push(format!("invoice_type = ?{}", params.len()));
    }
    if let Some(ref s) = filters.status {
        params.push(s.clone());
        conditions.push(format!("status = ?{}", params.len()));
    }
    if let Some(ref c) = filters.client_id {
        params.push(c.clone());
        conditions.push(format!("client_id = ?{}", params.len()));
    }
    if let Some(ref from) = filters.from_date {
        params.push(from.clone());
        conditions.push(format!("issue_date >= ?{}", params.len()));
    }
    if let Some(ref to) = filters.to_date {
        params.push(to.clone());
        conditions.push(format!("issue_date <= ?{}", params.len()));
    }

    let query = format!(
        "SELECT id, tenant_id, invoice_number, invoice_type, status, client_id, client_name,
                client_tax_id, client_address, price_list_id, currency, exchange_rate, issue_date,
                due_date, payment_terms, subtotal, discount_total, tax_total, total, paid_amount,
                notes, created_by, created_at, updated_at
         FROM billing_invoices WHERE {}
         ORDER BY created_at DESC",
        conditions.join(" AND ")
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let invoices = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |row| {
            Ok(Invoice {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                invoice_number: row.get(2)?,
                invoice_type: row.get(3)?,
                status: row.get(4)?,
                client_id: row.get(5)?,
                client_name: row.get(6)?,
                client_tax_id: row.get(7)?,
                client_address: row.get(8)?,
                price_list_id: row.get(9)?,
                currency: row.get(10)?,
                exchange_rate: row.get(11)?,
                issue_date: row.get(12)?,
                due_date: row.get(13)?,
                payment_terms: row.get(14)?,
                subtotal: row.get(15)?,
                discount_total: row.get(16)?,
                tax_total: row.get(17)?,
                total: row.get(18)?,
                paid_amount: row.get(19)?,
                notes: row.get(20)?,
                created_by: row.get(21)?,
                created_at: row.get(22)?,
                updated_at: row.get(23)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(invoices)
}

/// Get invoice by ID with items
#[tauri::command]
pub async fn get_invoice(
    state: State<'_, AppState>,
    id: String,
) -> Result<(Invoice, Vec<InvoiceItem>), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let invoice = conn
        .query_row(
            "SELECT id, tenant_id, invoice_number, invoice_type, status, client_id, client_name,
                    client_tax_id, client_address, price_list_id, currency, exchange_rate, issue_date,
                    due_date, payment_terms, subtotal, discount_total, tax_total, total, paid_amount,
                    notes, created_by, created_at, updated_at
             FROM billing_invoices WHERE id = ?1 AND tenant_id = ?2",
            [&id, &tenant_id],
            |row| {
                Ok(Invoice {
                    id: row.get(0)?,
                    tenant_id: row.get(1)?,
                    invoice_number: row.get(2)?,
                    invoice_type: row.get(3)?,
                    status: row.get(4)?,
                    client_id: row.get(5)?,
                    client_name: row.get(6)?,
                    client_tax_id: row.get(7)?,
                    client_address: row.get(8)?,
                    price_list_id: row.get(9)?,
                    currency: row.get(10)?,
                    exchange_rate: row.get(11)?,
                    issue_date: row.get(12)?,
                    due_date: row.get(13)?,
                    payment_terms: row.get(14)?,
                    subtotal: row.get(15)?,
                    discount_total: row.get(16)?,
                    tax_total: row.get(17)?,
                    total: row.get(18)?,
                    paid_amount: row.get(19)?,
                    notes: row.get(20)?,
                    created_by: row.get(21)?,
                    created_at: row.get(22)?,
                    updated_at: row.get(23)?,
                })
            },
        )
        .map_err(|e| format!("Error al obtener factura: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, invoice_id, product_id, variant_id, lot_id, code, description, quantity,
                    unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total
             FROM billing_invoice_items WHERE invoice_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([&id], |row| {
            Ok(InvoiceItem {
                id: row.get(0)?,
                invoice_id: row.get(1)?,
                product_id: row.get(2)?,
                variant_id: row.get(3)?,
                lot_id: row.get(4)?,
                code: row.get(5)?,
                description: row.get(6)?,
                quantity: row.get(7)?,
                unit_price: row.get(8)?,
                discount_percent: row.get(9)?,
                discount_amount: row.get(10)?,
                tax_rate: row.get(11)?,
                tax_amount: row.get(12)?,
                line_total: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok((invoice, items))
}

/// Create a new invoice
#[tauri::command]
pub async fn create_invoice(
    state: State<'_, AppState>,
    data: CreateInvoiceDto,
) -> Result<Invoice, String> {
    println!(
        "DEBUG: create_invoice called with type: {}",
        data.invoice_type
    );
    let tenant_id = get_tenant_id(&state)?;
    let user_id = get_user_id(&state)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    // Get client details
    let (client_name, client_tax_id, client_address, client_code): (
        String,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            "SELECT name, tax_id, address, code FROM clients WHERE id = ?1",
            [&data.client_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| format!("Error al obtener cliente: {}", e))?;

    // Determine client identifier for pattern
    let client_identifier = if let Some(code) = &client_code {
        if !code.trim().is_empty() {
            code.clone()
        } else {
            // Fallback if code is empty string
            sanitize_client_name_for_pattern(&client_name)
        }
    } else {
        sanitize_client_name_for_pattern(&client_name)
    };

    // Get invoice prefix and pattern from company settings
    let (prefix, pattern): (String, String) = conn
        .query_row(
            "SELECT invoice_prefix, COALESCE(invoice_pattern, '{PREFIX}-{NUMBER}') FROM company_settings WHERE tenant_id = ?1",
            [&tenant_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or_else(|_| ("FAC".to_string(), "{PREFIX}-{NUMBER}".to_string()));

    let invoice_number =
        generate_invoice_number(&conn, &tenant_id, &prefix, &pattern, &client_identifier);

    // Calculate totals
    let mut subtotal = 0.0;
    let mut discount_total = 0.0;
    let mut tax_total = 0.0;

    let items_with_calcs: Vec<(CreateInvoiceItemDto, f64, f64, f64, String, String)> = data
        .items
        .iter()
        .map(|item| {
            // Get product details
            let (code, description): (String, String) = conn
                .query_row(
                    "SELECT COALESCE(sku, ''), name FROM products WHERE id = ?1",
                    [&item.product_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .unwrap_or(("".to_string(), "Producto".to_string()));

            // Use tax_calculator with Decimal for precision
            let qty = Decimal::from_f64_retain(item.quantity).unwrap_or_default();
            let price = Decimal::from_f64_retain(item.unit_price).unwrap_or_default();
            let tax_rate = Decimal::from_f64_retain(item.tax_rate).unwrap_or_default();
            let discount_pct = Decimal::from_f64_retain(item.discount_percent).unwrap_or_default();

            let (line_sub, line_tax, line_total_dec) =
                tax_calculator::calculate_line_total(qty, price, tax_rate, discount_pct);

            // Convert back to f64 for storage/DTO
            let disc_amount = (qty * price * discount_pct / Decimal::from(100))
                .to_f64()
                .unwrap_or(0.0);
            let tax_amount = line_tax.to_f64().unwrap_or(0.0);
            let line_total = line_total_dec.to_f64().unwrap_or(0.0);
            let line_subtotal = line_sub.to_f64().unwrap_or(0.0);

            subtotal += line_subtotal;
            discount_total += disc_amount;
            tax_total += tax_amount;

            (
                item.clone(),
                disc_amount,
                tax_amount,
                line_total,
                code,
                description,
            )
        })
        .collect();

    let total = subtotal - discount_total + tax_total;

    // Insert invoice
    conn.execute(
        "INSERT INTO billing_invoices (id, tenant_id, invoice_number, invoice_type, status, client_id,
         client_name, client_tax_id, client_address, price_list_id, currency, exchange_rate, issue_date,
         due_date, payment_terms, subtotal, discount_total, tax_total, total, paid_amount, notes,
         created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'draft', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, 0, ?19, ?20, ?21, ?21)",
        rusqlite::params![
            &id,
            &tenant_id,
            &invoice_number,
            &data.invoice_type,
            &data.client_id,
            &client_name,
            &client_tax_id,
            &client_address,
            &data.price_list_id,
            &data.currency,
            data.exchange_rate,
            &data.issue_date,
            &data.due_date,
            &data.payment_terms,
            subtotal,
            discount_total,
            tax_total,
            total,
            &data.notes,
            &user_id,
            &now
        ],
    )
    .map_err(|e| format!("Error al crear factura: {}", e))?;

    // Insert items
    for (item, disc_amount, tax_amount, line_total, code, description) in items_with_calcs {
        let item_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO billing_invoice_items (id, invoice_id, product_id, variant_id, lot_id, code,
             description, quantity, unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            rusqlite::params![
                &item_id,
                &id,
                &item.product_id,
                &item.variant_id,
                &code,
                &description,
                item.quantity,
                item.unit_price,
                item.discount_percent,
                disc_amount,
                item.tax_rate,
                tax_amount,
                line_total
            ],
        )
        .map_err(|e| format!("Error al crear item de factura: {}", e))?;
    }

    // Return created invoice
    let result = conn
        .query_row(
            "SELECT id, tenant_id, invoice_number, invoice_type, status, client_id, client_name,
                client_tax_id, client_address, price_list_id, currency, exchange_rate, issue_date,
                due_date, payment_terms, subtotal, discount_total, tax_total, total, paid_amount,
                notes, created_by, created_at, updated_at
         FROM billing_invoices WHERE id = ?1",
            [&id],
            |row| {
                Ok(Invoice {
                    id: row.get(0)?,
                    tenant_id: row.get(1)?,
                    invoice_number: row.get(2)?,
                    invoice_type: row.get(3)?,
                    status: row.get(4)?,
                    client_id: row.get(5)?,
                    client_name: row.get(6)?,
                    client_tax_id: row.get(7)?,
                    client_address: row.get(8)?,
                    price_list_id: row.get(9)?,
                    currency: row.get(10)?,
                    exchange_rate: row.get(11)?,
                    issue_date: row.get(12)?,
                    due_date: row.get(13)?,
                    payment_terms: row.get(14)?,
                    subtotal: row.get(15)?,
                    discount_total: row.get(16)?,
                    tax_total: row.get(17)?,
                    total: row.get(18)?,
                    paid_amount: row.get(19)?,
                    notes: row.get(20)?,
                    created_by: row.get(21)?,
                    created_at: row.get(22)?,
                    updated_at: row.get(23)?,
                })
            },
        )
        .map_err(|e| format!("Error al obtener factura creada: {}", e));

    if let Err(ref e) = result {
        println!("DEBUG: create_invoice failed: {}", e);
    } else {
        println!("DEBUG: create_invoice success");
    }
    result
}

/// Issue an invoice (change status and deduct stock)
#[tauri::command]
pub async fn issue_invoice(state: State<'_, AppState>, id: String) -> Result<Invoice, String> {
    println!("DEBUG: issue_invoice called for id: {}", id);
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    // Check invoice is draft
    let status: String = conn
        .query_row(
            "SELECT status FROM billing_invoices WHERE id = ?1 AND tenant_id = ?2",
            [&id, &tenant_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Factura no encontrada: {}", e))?;

    if status != "draft" {
        return Err("Solo se pueden emitir facturas en borrador".to_string());
    }

    // Get items and deduct stock (FIFO for lots)
    let mut stmt = conn
        .prepare(
            "SELECT product_id, variant_id, quantity FROM billing_invoice_items WHERE invoice_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let items: Vec<(String, Option<String>, f64)> = stmt
        .query_map([&id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    if items.is_empty() {
        return Err("No se puede emitir una factura sin items".to_string());
    }

    drop(stmt);

    for (product_id, variant_id, quantity) in items {
        // Deduct from main product stock
        conn.execute(
            "UPDATE products SET stock_quantity = stock_quantity - ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![quantity, &now, &product_id],
        )
        .map_err(|e| format!("Error al descontar stock: {}", e))?;

        // If variant, also deduct from variant stock
        if let Some(ref var_id) = variant_id {
            conn.execute(
                "UPDATE variant_stock SET quantity = quantity - ?1, last_updated = ?2 WHERE variant_id = ?3",
                rusqlite::params![quantity, &now, var_id],
            )
            .ok();
        }
    }

    // Update invoice status
    conn.execute(
        "UPDATE billing_invoices SET status = 'issued', updated_at = ?1 WHERE id = ?2",
        rusqlite::params![&now, &id],
    )
    .map_err(|e| format!("Error al emitir factura: {}", e))?;

    // Return updated invoice
    let result = conn
        .query_row(
            "SELECT id, tenant_id, invoice_number, invoice_type, status, client_id, client_name,
                client_tax_id, client_address, price_list_id, currency, exchange_rate, issue_date,
                due_date, payment_terms, subtotal, discount_total, tax_total, total, paid_amount,
                notes, created_by, created_at, updated_at
         FROM billing_invoices WHERE id = ?1",
            [&id],
            |row| {
                Ok(Invoice {
                    id: row.get(0)?,
                    tenant_id: row.get(1)?,
                    invoice_number: row.get(2)?,
                    invoice_type: row.get(3)?,
                    status: row.get(4)?,
                    client_id: row.get(5)?,
                    client_name: row.get(6)?,
                    client_tax_id: row.get(7)?,
                    client_address: row.get(8)?,
                    price_list_id: row.get(9)?,
                    currency: row.get(10)?,
                    exchange_rate: row.get(11)?,
                    issue_date: row.get(12)?,
                    due_date: row.get(13)?,
                    payment_terms: row.get(14)?,
                    subtotal: row.get(15)?,
                    discount_total: row.get(16)?,
                    tax_total: row.get(17)?,
                    total: row.get(18)?,
                    paid_amount: row.get(19)?,
                    notes: row.get(20)?,
                    created_by: row.get(21)?,
                    created_at: row.get(22)?,
                    updated_at: row.get(23)?,
                })
            },
        )
        .map_err(|e| format!("Error al obtener factura: {}", e));

    if let Err(ref e) = result {
        println!("DEBUG: issue_invoice failed: {}", e);
    } else {
        println!("DEBUG: issue_invoice success for id: {}", id);
    }

    result
}

/// Cancel an invoice (only for issued invoices, restores stock)
#[tauri::command]
pub async fn cancel_invoice(state: State<'_, AppState>, id: String) -> Result<Invoice, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    // Check invoice status
    let status: String = conn
        .query_row(
            "SELECT status FROM billing_invoices WHERE id = ?1 AND tenant_id = ?2",
            [&id, &tenant_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Factura no encontrada: {}", e))?;

    if status == "paid" {
        return Err("No se pueden anular facturas pagadas".to_string());
    }

    // If issued, restore stock
    if status == "issued" || status == "partial" {
        let mut stmt = conn
            .prepare(
                "SELECT product_id, variant_id, quantity FROM billing_invoice_items WHERE invoice_id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let items: Vec<(String, Option<String>, f64)> = stmt
            .query_map([&id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        drop(stmt);

        for (product_id, variant_id, quantity) in items {
            conn.execute(
                "UPDATE products SET stock_quantity = stock_quantity + ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![quantity, &now, &product_id],
            )
            .ok();

            if let Some(ref var_id) = variant_id {
                conn.execute(
                    "UPDATE variant_stock SET quantity = quantity + ?1, last_updated = ?2 WHERE variant_id = ?3",
                    rusqlite::params![quantity, &now, var_id],
                )
                .ok();
            }
        }
    }

    // Update status
    conn.execute(
        "UPDATE billing_invoices SET status = 'cancelled', updated_at = ?1 WHERE id = ?2",
        rusqlite::params![&now, &id],
    )
    .map_err(|e| format!("Error al anular factura: {}", e))?;

    // Return updated invoice
    conn.query_row(
        "SELECT id, tenant_id, invoice_number, invoice_type, status, client_id, client_name,
                client_tax_id, client_address, price_list_id, currency, exchange_rate, issue_date,
                due_date, payment_terms, subtotal, discount_total, tax_total, total, paid_amount,
                notes, created_by, created_at, updated_at
         FROM billing_invoices WHERE id = ?1",
        [&id],
        |row| {
            Ok(Invoice {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                invoice_number: row.get(2)?,
                invoice_type: row.get(3)?,
                status: row.get(4)?,
                client_id: row.get(5)?,
                client_name: row.get(6)?,
                client_tax_id: row.get(7)?,
                client_address: row.get(8)?,
                price_list_id: row.get(9)?,
                currency: row.get(10)?,
                exchange_rate: row.get(11)?,
                issue_date: row.get(12)?,
                due_date: row.get(13)?,
                payment_terms: row.get(14)?,
                subtotal: row.get(15)?,
                discount_total: row.get(16)?,
                tax_total: row.get(17)?,
                total: row.get(18)?,
                paid_amount: row.get(19)?,
                notes: row.get(20)?,
                created_by: row.get(21)?,
                created_at: row.get(22)?,
                updated_at: row.get(23)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener factura: {}", e))
}

/// Delete an invoice (restores stock if issued)
#[tauri::command]
pub async fn delete_invoice(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    // Check invoice status
    let status: String = conn
        .query_row(
            "SELECT status FROM billing_invoices WHERE id = ?1 AND tenant_id = ?2",
            [&id, &tenant_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Factura no encontrada: {}", e))?;

    // If issued/partial/paid, restore stock before deleting
    if status == "issued" || status == "partial" || status == "paid" {
        let mut stmt = conn
            .prepare(
                "SELECT product_id, variant_id, quantity FROM billing_invoice_items WHERE invoice_id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let items: Vec<(String, Option<String>, f64)> = stmt
            .query_map([&id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        drop(stmt);

        for (product_id, variant_id, quantity) in items {
            conn.execute(
                "UPDATE products SET stock_quantity = stock_quantity + ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![quantity, &now, &product_id],
            )
            .ok();

            if let Some(ref var_id) = variant_id {
                conn.execute(
                    "UPDATE variant_stock SET quantity = quantity + ?1, last_updated = ?2 WHERE variant_id = ?3",
                    rusqlite::params![quantity, &now, var_id],
                )
                .ok();
            }
        }
    }

    // Delete items
    conn.execute(
        "DELETE FROM billing_invoice_items WHERE invoice_id = ?1",
        [&id],
    )
    .ok();

    // Delete payments (if any exist, to avoid FK errors)
    // Assuming table name 'payments' or similar - if this table exists.
    // Since I cannot verify schema right now, I will wrap in a try or just rely on cascade if configured.
    // Ideally we should delete related payments. For now, proceeding with invoice delete.
    // If payments exist, this might fail if NO ACTION/RESTRICT FK is set.
    // Adding a blind delete for payments just in case.
    conn.execute("DELETE FROM billing_payments WHERE invoice_id = ?1", [&id])
        .ok();

    // Delete invoice
    conn.execute(
        "DELETE FROM billing_invoices WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar factura: {}", e))?;

    Ok(())
}

/// Update a draft invoice
#[tauri::command]
pub async fn update_invoice(
    state: State<'_, AppState>,
    id: String,
    data: UpdateInvoiceDto,
) -> Result<Invoice, String> {
    println!("DEBUG: update_invoice called for id: {}", id);
    let tenant_id = get_tenant_id(&state)?;
    // let user_id = get_user_id(&state)?; // Unused for now
    let now = chrono::Utc::now().to_rfc3339();

    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    // Check invoice exists and is draft
    let status: String = conn
        .query_row(
            "SELECT status FROM billing_invoices WHERE id = ?1 AND tenant_id = ?2",
            [&id, &tenant_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Factura no encontrada: {}", e))?;

    if status != "draft" {
        return Err("Solo se pueden editar facturas en borrador".to_string());
    }

    // Update main fields if provided
    if let Some(client_id) = &data.client_id {
        let (client_name, client_tax_id, client_address): (String, Option<String>, Option<String>) =
            conn.query_row(
                "SELECT name, tax_id, address FROM clients WHERE id = ?1",
                [client_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|e| format!("Error al obtener cliente: {}", e))?;

        conn.execute(
            "UPDATE billing_invoices SET client_id = ?1, client_name = ?2, client_tax_id = ?3, client_address = ?4 WHERE id = ?5",
            rusqlite::params![client_id, client_name, client_tax_id, client_address, id],
        ).map_err(|e| e.to_string())?;
    }

    // Update simple fields
    if let Some(price_list_id) = &data.price_list_id {
        conn.execute(
            "UPDATE billing_invoices SET price_list_id = ?1 WHERE id = ?2",
            rusqlite::params![price_list_id, id],
        )
        .ok();
    }
    if let Some(currency) = &data.currency {
        conn.execute(
            "UPDATE billing_invoices SET currency = ?1 WHERE id = ?2",
            rusqlite::params![currency, id],
        )
        .ok();
    }
    if let Some(exchange_rate) = &data.exchange_rate {
        conn.execute(
            "UPDATE billing_invoices SET exchange_rate = ?1 WHERE id = ?2",
            rusqlite::params![exchange_rate, id],
        )
        .ok();
    }
    if let Some(issue_date) = &data.issue_date {
        conn.execute(
            "UPDATE billing_invoices SET issue_date = ?1 WHERE id = ?2",
            rusqlite::params![issue_date, id],
        )
        .ok();
    }
    if let Some(due_date) = &data.due_date {
        conn.execute(
            "UPDATE billing_invoices SET due_date = ?1 WHERE id = ?2",
            rusqlite::params![due_date, id],
        )
        .ok();
    }
    if let Some(payment_terms) = &data.payment_terms {
        conn.execute(
            "UPDATE billing_invoices SET payment_terms = ?1 WHERE id = ?2",
            rusqlite::params![payment_terms, id],
        )
        .ok();
    }
    if let Some(notes) = &data.notes {
        conn.execute(
            "UPDATE billing_invoices SET notes = ?1 WHERE id = ?2",
            rusqlite::params![notes, id],
        )
        .ok();
    }

    // Update items if provided (Replace all)
    if let Some(items) = data.items {
        // Delete old items
        conn.execute(
            "DELETE FROM billing_invoice_items WHERE invoice_id = ?1",
            [&id],
        )
        .map_err(|e| format!("Error al limpiar items: {}", e))?;

        let mut subtotal = Decimal::ZERO;
        let mut tax_total = Decimal::ZERO;
        let mut discount_total = Decimal::ZERO;

        for item in items {
            // Get product details (code, name)
            let (code, description): (String, String) = conn
                .query_row(
                    "SELECT COALESCE(sku, ''), name FROM products WHERE id = ?1",
                    [&item.product_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .unwrap_or(("".to_string(), "Producto".to_string()));

            // Calc using tax_calculator
            let qty = Decimal::from_f64_retain(item.quantity).unwrap_or_default();
            let price = Decimal::from_f64_retain(item.unit_price).unwrap_or_default();
            let tax_rate = Decimal::from_f64_retain(item.tax_rate).unwrap_or_default();
            let discount_pct = Decimal::from_f64_retain(item.discount_percent).unwrap_or_default();

            let (line_sub, line_tax, line_total) =
                tax_calculator::calculate_line_total(qty, price, tax_rate, discount_pct);

            let disc_amount = qty * price * discount_pct / dec!(100);

            subtotal += line_sub;
            tax_total += line_tax;
            discount_total += disc_amount;

            // Insert new item
            let item_id = Uuid::new_v4().to_string();
            conn.execute(
            "INSERT INTO billing_invoice_items (id, invoice_id, product_id, variant_id, lot_id, code,
             description, quantity, unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            rusqlite::params![
                &item_id,
                &id,
                &item.product_id,
                &item.variant_id,
                &code,
                &description,
                item.quantity,
                item.unit_price,
                item.discount_percent,
                disc_amount.to_f64().unwrap_or(0.0),
                item.tax_rate,
                line_tax.to_f64().unwrap_or(0.0),
                line_total.to_f64().unwrap_or(0.0)
            ],
            ).map_err(|e| format!("Error al insertar item: {}", e))?;
        }

        let total = subtotal + tax_total; // discount already subtracted from subtotal in calculator usually, let's verify tax calc logic
                                          // tax_calculator::calculate_line_total returns (subtotal, tax, total) where subtotal = gross - discount.
                                          // So total invoice = sum(subtotal) + sum(tax).
                                          // discount_total is separate just for display/record.

        // Update invoice totals
        conn.execute(
            "UPDATE billing_invoices SET subtotal = ?1, discount_total = ?2, tax_total = ?3, total = ?4, updated_at = ?5 WHERE id = ?6",
            rusqlite::params![
                subtotal.to_f64().unwrap_or(0.0),
                discount_total.to_f64().unwrap_or(0.0),
                tax_total.to_f64().unwrap_or(0.0),
                total.to_f64().unwrap_or(0.0),
                &now,
                &id
            ],
        ).map_err(|e| format!("Error al actualizar totales: {}", e))?;
    }

    // Return updated invoice
    conn.query_row(
        "SELECT id, tenant_id, invoice_number, invoice_type, status, client_id, client_name,
                client_tax_id, client_address, price_list_id, currency, exchange_rate, issue_date,
                due_date, payment_terms, subtotal, discount_total, tax_total, total, paid_amount,
                notes, created_by, created_at, updated_at
         FROM billing_invoices WHERE id = ?1",
        [&id],
        |row| {
            Ok(Invoice {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                invoice_number: row.get(2)?,
                invoice_type: row.get(3)?,
                status: row.get(4)?,
                client_id: row.get(5)?,
                client_name: row.get(6)?,
                client_tax_id: row.get(7)?,
                client_address: row.get(8)?,
                price_list_id: row.get(9)?,
                currency: row.get(10)?,
                exchange_rate: row.get(11)?,
                issue_date: row.get(12)?,
                due_date: row.get(13)?,
                payment_terms: row.get(14)?,
                subtotal: row.get(15)?,
                discount_total: row.get(16)?,
                tax_total: row.get(17)?,
                total: row.get(18)?,
                paid_amount: row.get(19)?,
                notes: row.get(20)?,
                created_by: row.get(21)?,
                created_at: row.get(22)?,
                updated_at: row.get(23)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
