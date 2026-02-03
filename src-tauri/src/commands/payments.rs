//! Payment Commands

use crate::models::{CreatePaymentDto, Payment};
use crate::state::AppState;
use tauri::State;
use uuid::Uuid;

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

/// List payments for an invoice
#[tauri::command]
pub async fn list_payments(
    state: State<'_, AppState>,
    invoice_id: String,
) -> Result<Vec<Payment>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, tenant_id, invoice_id, amount, currency, exchange_rate, payment_method,
                    reference, bank_account_id, payment_date, notes, created_by, created_at, received_amount
             FROM billing_payments WHERE invoice_id = ?1 AND tenant_id = ?2
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let payments = stmt
        .query_map([&invoice_id, &tenant_id], |row| {
            Ok(Payment {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                invoice_id: row.get(2)?,
                amount: row.get(3)?,
                currency: row.get(4)?,
                exchange_rate: row.get(5)?,
                payment_method: row.get(6)?,
                reference: row.get(7)?,
                bank_account_id: row.get(8)?,
                payment_date: row.get(9)?,
                notes: row.get(10)?,
                created_by: row.get(11)?,
                created_at: row.get(12)?,
                received_amount: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(payments)
}

/// Register a payment for an invoice
#[tauri::command]
pub async fn register_payment(
    state: State<'_, AppState>,
    data: CreatePaymentDto,
) -> Result<Payment, String> {
    println!(
        "DEBUG: register_payment called for invoice {}",
        data.invoice_id
    );
    let tenant_id = get_tenant_id(&state)?;
    let user_id = get_user_id(&state)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    println!("DEBUG: Checking invoice status...");
    // Check invoice exists and get current amounts
    let (status, total, paid_amount): (String, f64, f64) = conn
        .query_row(
            "SELECT status, total, paid_amount FROM billing_invoices WHERE id = ?1 AND tenant_id = ?2",
            [&data.invoice_id, &tenant_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("Factura no encontrada: {}", e))?;

    if status == "cancelled" || status == "draft" {
        return Err("No se pueden registrar pagos en facturas borrador o anuladas".to_string());
    }

    // Determine received_amount (default to amount if not specified)
    // BUT be careful: if currency differs, it SHOULD be specified.
    // It's up to frontend to ensure logic. Backend trusts data.
    let final_received = data.received_amount.unwrap_or(data.amount);

    println!(
        "DEBUG: Inserting payment linked to bank: {:?}, received: {}",
        data.bank_account_id, final_received
    );

    // Calculate new paid amount (using INVOICE currency amount)
    let new_paid = paid_amount + data.amount;
    let new_status = if new_paid >= total - 0.01 {
        "paid"
    } else {
        "partial"
    };

    // Insert payment
    conn.execute(
        "INSERT INTO billing_payments (id, tenant_id, invoice_id, amount, currency, exchange_rate,
         payment_method, reference, bank_account_id, payment_date, notes, created_by, created_at, received_amount)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        rusqlite::params![
            &id,
            &tenant_id,
            &data.invoice_id,
            data.amount,
            &data.currency,
            data.exchange_rate,
            &data.payment_method,
            &data.reference,
            &data.bank_account_id,
            &data.payment_date,
            &data.notes,
            &user_id,
            &now,
            final_received
        ],
    )
    .map_err(|e| {
        println!("ERROR: Failed insert payment: {}", e);
        format!("Error al registrar pago: {}", e)
    })?;

    // Update invoice paid_amount and status
    conn.execute(
        "UPDATE billing_invoices SET paid_amount = ?1, status = ?2, updated_at = ?3 WHERE id = ?4",
        rusqlite::params![new_paid, new_status, &now, &data.invoice_id],
    )
    .map_err(|e| format!("Error al actualizar factura: {}", e))?;

    // Return created payment
    conn.query_row(
        "SELECT id, tenant_id, invoice_id, amount, currency, exchange_rate, payment_method,
                reference, bank_account_id, payment_date, notes, created_by, created_at, received_amount
         FROM billing_payments WHERE id = ?1",
        [&id],
        |row| {
            Ok(Payment {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                invoice_id: row.get(2)?,
                amount: row.get(3)?,
                currency: row.get(4)?,
                exchange_rate: row.get(5)?,
                payment_method: row.get(6)?,
                reference: row.get(7)?,
                bank_account_id: row.get(8)?,
                payment_date: row.get(9)?,
                notes: row.get(10)?,
                created_by: row.get(11)?,
                created_at: row.get(12)?,
                received_amount: row.get(13)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener pago: {}", e))
}

/// Delete a payment (recalculates invoice paid_amount)
#[tauri::command]
pub async fn delete_payment(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    // Get payment details
    let (invoice_id, amount): (String, f64) = conn
        .query_row(
            "SELECT invoice_id, amount FROM billing_payments WHERE id = ?1 AND tenant_id = ?2",
            [&id, &tenant_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Pago no encontrado: {}", e))?;

    // Delete payment
    conn.execute(
        "DELETE FROM billing_payments WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar pago: {}", e))?;

    // Update invoice paid_amount
    let (total, paid_amount): (f64, f64) = conn
        .query_row(
            "SELECT total, paid_amount FROM billing_invoices WHERE id = ?1",
            [&invoice_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Error al obtener factura: {}", e))?;

    let new_paid = paid_amount - amount;
    let new_status = if new_paid <= 0.01 {
        // Corrected logic: if paid almost 0, it is back to issued
        "issued"
    } else if new_paid >= total - 0.01 {
        "paid"
    } else {
        "partial"
    };

    conn.execute(
        "UPDATE billing_invoices SET paid_amount = ?1, status = ?2, updated_at = ?3 WHERE id = ?4",
        rusqlite::params![new_paid.max(0.0), new_status, &now, &invoice_id],
    )
    .map_err(|e| format!("Error al actualizar factura: {}", e))?;

    Ok(())
}

#[derive(serde::Serialize)]
pub struct AccountBalance {
    pub id: String,
    pub bank_name: String,
    pub currency: String,
    pub balance: f64,
}

#[derive(serde::Serialize)]
pub struct TreasuryMovement {
    pub id: String,
    pub date: String,
    pub amount: f64,
    pub currency: String,
    pub type_: String, // "IN" or "OUT" (currently only IN for payments)
    pub description: String,
    pub reference: Option<String>,
    pub bank_name: String,
}

/// Get recent treasury movements (global or filtered by bank account)
#[tauri::command]
pub async fn get_recent_movements(
    state: State<'_, AppState>,
    limit: i64,
    bank_account_id: Option<String>,
) -> Result<Vec<TreasuryMovement>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let sql = "SELECT 
                p.id, 
                p.payment_date, 
                COALESCE(p.received_amount, p.amount) as amount,
                b.currency, 
                'IN' as type_,
                'Pago Factura ' || i.invoice_number || ' - ' || i.client_name as description,
                p.reference,
                b.bank_name
             FROM billing_payments p
             JOIN bank_accounts b ON p.bank_account_id = b.id
             JOIN billing_invoices i ON p.invoice_id = i.id
             WHERE p.tenant_id = ?1
             AND (?3 IS NULL OR p.bank_account_id = ?3)
             ORDER BY p.payment_date DESC
             LIMIT ?2";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let movements = stmt
        .query_map(
            rusqlite::params![&tenant_id, limit, bank_account_id],
            |row| {
                Ok(TreasuryMovement {
                    id: row.get(0)?,
                    date: row.get(1)?,
                    amount: row.get(2)?,
                    currency: row.get(3)?,
                    type_: row.get(4)?,
                    description: row.get(5)?,
                    reference: row.get(6)?,
                    bank_name: row.get(7)?,
                })
            },
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(movements)
}

/// Get aggregated balances per bank account
#[tauri::command]
pub async fn get_account_balances(
    state: State<'_, AppState>,
) -> Result<Vec<AccountBalance>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    // Corrected query: Sum received_amount.
    // Also ensuring wait for lock
    let mut stmt = conn
        .prepare(
            "SELECT b.id, b.bank_name, b.currency, COALESCE(SUM(p.received_amount), 0) as balance
             FROM bank_accounts b
             LEFT JOIN billing_payments p ON b.id = p.bank_account_id
             WHERE b.tenant_id = ?1 AND b.is_active = 1
             GROUP BY b.id, b.bank_name, b.currency
             -- Remove HAVING balance > 0 to see all accounts even if 0
             ORDER BY b.bank_name ASC",
        )
        .map_err(|e| e.to_string())?;

    let balances = stmt
        .query_map([&tenant_id], |row| {
            Ok(AccountBalance {
                id: row.get(0)?,
                bank_name: row.get(1)?,
                currency: row.get(2)?,
                balance: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(balances)
}
