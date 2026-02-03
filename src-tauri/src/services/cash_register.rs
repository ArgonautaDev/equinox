use crate::models::cash_register::{
    AddMovementDto, CashMovement, CashRegister, CashRegisterSession, CloseSessionDto,
    OpenSessionDto,
};
use crate::state::ServiceError;
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

/// Create a new cash register
pub fn create_register(
    conn: &Connection,
    tenant_id: &str,
    name: &str,
) -> Result<CashRegister, ServiceError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO cash_registers (id, tenant_id, name, status, created_at, updated_at) VALUES (?1, ?2, ?3, 'closed', ?4, ?4)",
        params![id, tenant_id, name, now],
    )
    .map_err(|e| ServiceError::Database(e.to_string()))?;

    Ok(CashRegister {
        id,
        tenant_id: tenant_id.to_string(),
        name: name.to_string(),
        status: "closed".to_string(),
        current_session_id: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Start a new session (Open Register)
pub fn open_session(
    conn: &Connection,
    tenant_id: &str,
    user_id: &str,
    data: OpenSessionDto,
) -> Result<CashRegisterSession, ServiceError> {
    // 1. Check if register is already open
    let active_session: Option<Option<String>> = conn
        .query_row(
            "SELECT current_session_id FROM cash_registers WHERE id = ?1 AND tenant_id = ?2",
            params![data.register_id, tenant_id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    if let Some(Some(_)) = active_session {
        return Err(ServiceError::Validation(
            "La caja ya tiene una sesión activa".to_string(),
        ));
    }

    // 2. Create Session
    let session_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        r#"
        INSERT INTO cash_register_sessions (
            id, tenant_id, register_id, user_id, status, start_time,
            opening_amount_usd, opening_amount_ves, opening_amount_eur,
            opening_exchange_rate_ves, opening_exchange_rate_eur, opening_notes,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
        "#,
        params![
            session_id,
            tenant_id,
            data.register_id,
            user_id,
            now,
            data.opening_amount_usd,
            data.opening_amount_ves,
            data.opening_amount_eur,
            data.exchange_rate_ves,
            data.exchange_rate_eur,
            data.notes,
            now
        ],
    )
    .map_err(|e| ServiceError::Database(e.to_string()))?;

    // 3. Update Register Status
    conn.execute(
        "UPDATE cash_registers SET status = 'open', current_session_id = ?1, updated_at = ?2 WHERE id = ?3",
        params![session_id, now, data.register_id],
    )
    .map_err(|e| ServiceError::Database(e.to_string()))?;

    get_session(conn, &session_id)
}

/// Close a session
pub fn close_session(
    conn: &Connection,
    tenant_id: &str,
    data: CloseSessionDto,
) -> Result<CashRegisterSession, ServiceError> {
    let now = Utc::now().to_rfc3339();

    // 1. Calculate Expected Totals
    let (exp_usd, exp_ves, exp_eur) = calculate_expected_totals(conn, &data.session_id)?;

    // 2. Update Session
    conn.execute(
        r#"
        UPDATE cash_register_sessions SET 
            status = 'closed',
            end_time = ?1,
            closing_amount_usd = ?2,
            closing_amount_ves = ?3,
            closing_amount_eur = ?4,
            expected_amount_usd = ?5,
            expected_amount_ves = ?6,
            expected_amount_eur = ?7,
            closing_notes = ?8,
            updated_at = ?1
        WHERE id = ?9 AND tenant_id = ?10 AND status = 'active'
        "#,
        params![
            now,
            data.closing_amount_usd,
            data.closing_amount_ves,
            data.closing_amount_eur,
            exp_usd,
            exp_ves,
            exp_eur,
            data.notes,
            data.session_id,
            tenant_id
        ],
    )
    .map_err(|e| ServiceError::Database(e.to_string()))?;

    // 3. Release Register
    let register_id: String = conn
        .query_row(
            "SELECT register_id FROM cash_register_sessions WHERE id = ?1",
            params![data.session_id],
            |row| row.get(0),
        )
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    conn.execute(
        "UPDATE cash_registers SET status = 'closed', current_session_id = NULL, updated_at = ?1 WHERE id = ?2",
        params![now, register_id],
    )
    .map_err(|e| ServiceError::Database(e.to_string()))?;

    get_session(conn, &data.session_id)
}

/// Add movement (Deposit/Withdrawal)
pub fn add_movement(
    conn: &Connection,
    tenant_id: &str,
    user_id: &str,
    data: AddMovementDto,
) -> Result<CashMovement, ServiceError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        r#"
        INSERT INTO cash_movements (
            id, tenant_id, session_id, user_id, type, amount, currency,
            exchange_rate, reason, reference, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1.0, ?8, ?9, ?10)
        "#,
        params![
            id,
            tenant_id,
            data.session_id,
            user_id,
            data.movement_type,
            data.amount,
            data.currency,
            data.reason,
            data.reference,
            now
        ],
    )
    .map_err(|e| ServiceError::Database(e.to_string()))?;

    Ok(CashMovement {
        id,
        tenant_id: tenant_id.to_string(),
        session_id: data.session_id,
        user_id: user_id.to_string(),
        movement_type: data.movement_type,
        amount: data.amount,
        currency: data.currency,
        exchange_rate: 1.0,
        reason: Some(data.reason),
        reference: Some(data.reference),
        created_at: now,
    })
}

/// List all cash registers
pub fn list_registers(
    conn: &Connection,
    tenant_id: &str,
) -> Result<Vec<CashRegister>, ServiceError> {
    let mut stmt = conn
        .prepare("SELECT id, name, status, current_session_id, created_at, updated_at FROM cash_registers WHERE tenant_id = ?1")
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    let rows = stmt
        .query_map(params![tenant_id], |row| {
            Ok(CashRegister {
                id: row.get(0)?,
                tenant_id: tenant_id.to_string(),
                name: row.get(1)?,
                status: row.get(2)?,
                current_session_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    let mut registers = Vec::new();
    for row in rows {
        registers.push(row.map_err(|e| ServiceError::Database(e.to_string()))?);
    }

    Ok(registers)
}

/// Get active session for user/register
pub fn get_active_session(
    conn: &Connection,
    tenant_id: &str,
    user_id: &str,
) -> Result<Option<CashRegisterSession>, ServiceError> {
    let session_id: Option<String> = conn
        .query_row(
            "SELECT id FROM cash_register_sessions WHERE tenant_id = ?1 AND user_id = ?2 AND status = 'active'",
            params![tenant_id, user_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    match session_id {
        Some(id) => get_session(conn, &id).map(Some),
        None => Ok(None),
    }
}

// Helpers
fn get_session(conn: &Connection, id: &str) -> Result<CashRegisterSession, ServiceError> {
    conn.query_row(
        r#"
        SELECT 
            id, tenant_id, register_id, user_id, status, start_time, end_time,
            opening_amount_usd, opening_amount_ves, opening_amount_eur,
            opening_exchange_rate_ves, opening_exchange_rate_eur, opening_notes,
            closing_amount_usd, closing_amount_ves, closing_amount_eur, closing_notes,
            expected_amount_usd, expected_amount_ves, expected_amount_eur,
            created_at, updated_at
        FROM cash_register_sessions
        WHERE id = ?1
        "#,
        params![id],
        |row| {
            Ok(CashRegisterSession {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                register_id: row.get(2)?,
                user_id: row.get(3)?,
                status: row.get(4)?,
                start_time: row.get(5)?,
                end_time: row.get(6)?,
                opening_amount_usd: row.get(7)?,
                opening_amount_ves: row.get(8)?,
                opening_amount_eur: row.get(9)?,
                opening_exchange_rate_ves: row.get(10)?,
                opening_exchange_rate_eur: row.get(11)?,
                opening_notes: row.get(12)?,
                closing_amount_usd: row.get(13)?,
                closing_amount_ves: row.get(14)?,
                closing_amount_eur: row.get(15)?,
                closing_notes: row.get(16)?,
                expected_amount_usd: row.get(17)?,
                expected_amount_ves: row.get(18)?,
                expected_amount_eur: row.get(19)?,
                created_at: row.get(20)?,
                updated_at: row.get(21)?,
            })
        },
    )
    .map_err(|e| ServiceError::Database(e.to_string()))
}

fn calculate_expected_totals(
    conn: &Connection,
    session_id: &str,
) -> Result<(f64, f64, f64), ServiceError> {
    // Opening
    let (open_usd, open_ves, open_eur): (f64, f64, f64) = conn.query_row(
        "SELECT opening_amount_usd, opening_amount_ves, opening_amount_eur FROM cash_register_sessions WHERE id = ?1",
        params![session_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|e| ServiceError::Database(e.to_string()))?;

    // Movements (Deposits + , Withdrawals -)
    let mut mov_usd = 0.0;
    let mut mov_ves = 0.0;
    let mut mov_eur = 0.0;

    let mut stmt = conn
        .prepare("SELECT type, amount, currency FROM cash_movements WHERE session_id = ?1")
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    let rows = stmt
        .query_map(params![session_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    for row in rows {
        let (m_type, amount, currency) = row.map_err(|e| ServiceError::Database(e.to_string()))?;
        let val = if m_type == "deposit" { amount } else { -amount };
        match currency.as_str() {
            "USD" => mov_usd += val,
            "VES" => mov_ves += val,
            "EUR" => mov_eur += val,
            _ => {}
        }
    }

    // Sales (Payments within session)
    let mut sales_usd = 0.0;
    let mut sales_ves = 0.0;
    let mut sales_eur = 0.0;

    // TODO: Query billing_payments where session_id = current.
    // This assumes payments logic properly assigns session_id.

    let mut p_stmt = conn
        .prepare("SELECT amount, currency FROM billing_payments WHERE session_id = ?1")
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    let p_rows = p_stmt
        .query_map(params![session_id], |row| {
            Ok((row.get::<_, f64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| ServiceError::Database(e.to_string()))?;

    for row in p_rows {
        let (amount, currency) = row.map_err(|e| ServiceError::Database(e.to_string()))?;
        match currency.as_str() {
            "USD" => sales_usd += amount,
            "VES" => sales_ves += amount,
            "EUR" => sales_eur += amount,
            _ => {}
        }
    }

    Ok((
        open_usd + mov_usd + sales_usd,
        open_ves + mov_ves + sales_ves,
        open_eur + mov_eur + sales_eur,
    ))
}
