//! Settings Commands - Company, Bank Accounts, Tax Settings

use crate::models::{
    BankAccount, CompanySettings, CreateBankAccountDto, CreateTaxSettingDto, InvoiceSequence,
    TaxSetting, UpdateBankAccountDto, UpdateCompanySettingsDto, UpdateTaxSettingDto,
};
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

// ============================================
// COMPANY SETTINGS
// ============================================

/// Helper to query company settings by tenant_id
fn query_company_settings(
    conn: &rusqlite::Connection,
    tenant_id: &str,
) -> Result<CompanySettings, rusqlite::Error> {
    conn.query_row(
        "SELECT id, tenant_id, name, legal_id, address, city, state, country, postal_code,
                phone, email, website, logo_path, invoice_prefix, invoice_counter, default_currency,
                legal_note, invoice_pattern, created_at, updated_at
         FROM company_settings WHERE tenant_id = ?1",
        [tenant_id],
        |row| {
            Ok(CompanySettings {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                legal_id: row.get(3)?,
                address: row.get(4)?,
                city: row.get(5)?,
                state: row.get(6)?,
                country: row.get(7)?,
                postal_code: row.get(8)?,
                phone: row.get(9)?,
                email: row.get(10)?,
                website: row.get(11)?,
                logo_path: row.get(12)?,
                invoice_prefix: row.get(13)?,
                invoice_counter: row.get(14)?,
                default_currency: row.get(15)?,
                legal_note: row.get(16)?,
                invoice_pattern: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        },
    )
}

/// Helper to create default company settings
async fn create_default_company_settings(
    state: &State<'_, AppState>,
    tenant_id: &str,
) -> Result<CompanySettings, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos".to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO company_settings (id, tenant_id, name, legal_id, address, city, state, country,
         invoice_prefix, invoice_counter, default_currency, invoice_pattern, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?13, ?12, ?12)",
        rusqlite::params![
            &id,
            &tenant_id,
            "Mi Empresa",
            "J-000000000",
            "",
            "",
            "",
            "Venezuela",
            "FAC",
            0_i64,
            "USD",
            &now,
            "{PREFIX}-{NUMBER}"
        ],
    )
    .map_err(|e| format!("Error al crear configuración: {}", e))?;

    // Query the newly created settings
    query_company_settings(&conn, &tenant_id)
        .map_err(|e| format!("Error al obtener configuración creada: {}", e))
}

/// Get company settings (creates default if not exists)
#[tauri::command]
pub async fn get_company_settings(state: State<'_, AppState>) -> Result<CompanySettings, String> {
    println!("DEBUG: get_company_settings called");
    let tenant_id = get_tenant_id(&state)?;
    println!("DEBUG: get_company_settings tenant_id: {}", tenant_id);
    let result = {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos".to_string())?;

        conn.query_row(
            "SELECT id, tenant_id, name, legal_id, address, city, state, country, postal_code, phone, email, website, logo_path, invoice_prefix, invoice_counter, default_currency, legal_note, invoice_pattern, created_at, updated_at FROM company_settings WHERE tenant_id = ?1",
            [&tenant_id],
            |row| {
                Ok(CompanySettings {
                    id: row.get(0)?,
                    tenant_id: row.get(1)?,
                    name: row.get(2)?,
                    legal_id: row.get(3)?,
                    address: row.get(4)?,
                    city: row.get(5)?,
                    state: row.get(6)?,
                    country: row.get(7)?,
                    postal_code: row.get(8)?,
                    phone: row.get(9)?,
                    email: row.get(10)?,
                    website: row.get(11)?,
                    logo_path: row.get(12)?,
                    invoice_prefix: row.get(13)?,
                    invoice_counter: row.get(14)?,
                    default_currency: row.get(15)?,
                    legal_note: row.get(16)?,
                    invoice_pattern: row.get(17)?,
                    created_at: row.get(18)?,
                    updated_at: row.get(19)?,
                })
            },
        )
    };

    match result {
        Ok(settings) => {
            println!("DEBUG: get_company_settings success");
            Ok(settings)
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // Create default settings if not exists
            println!("DEBUG: Company settings not found, creating default");
            drop(result); // Result doesn't hold lock, but good practice to clear if not needed
            let default_settings = create_default_company_settings(&state, &tenant_id).await?;
            Ok(default_settings)
        }
        Err(e) => {
            println!("DEBUG: get_company_settings error: {}", e);
            Err(e.to_string())
        }
    }
}

/// Update company settings
#[tauri::command]
pub async fn update_company_settings(
    state: State<'_, AppState>,
    data: UpdateCompanySettingsDto,
) -> Result<CompanySettings, String> {
    println!(
        "DEBUG: update_company_settings called with data: {:?}",
        data
    );
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut set_clauses = vec![format!("updated_at = '{}'", now)];

    if let Some(ref name) = data.name {
        set_clauses.push(format!("name = '{}'", name.replace('\'', "''")));
    }
    if let Some(ref legal_id) = data.legal_id {
        set_clauses.push(format!("legal_id = '{}'", legal_id.replace('\'', "''")));
    }
    if let Some(ref address) = data.address {
        set_clauses.push(format!("address = '{}'", address.replace('\'', "''")));
    }
    if let Some(ref city) = data.city {
        set_clauses.push(format!("city = '{}'", city.replace('\'', "''")));
    }
    if let Some(ref state_name) = data.state {
        set_clauses.push(format!("state = '{}'", state_name.replace('\'', "''")));
    }
    if let Some(ref country) = data.country {
        set_clauses.push(format!("country = '{}'", country.replace('\'', "''")));
    }
    if let Some(ref postal_code) = data.postal_code {
        set_clauses.push(format!(
            "postal_code = '{}'",
            postal_code.replace('\'', "''")
        ));
    }
    if let Some(ref phone) = data.phone {
        set_clauses.push(format!("phone = '{}'", phone.replace('\'', "''")));
    }
    if let Some(ref email) = data.email {
        set_clauses.push(format!("email = '{}'", email.replace('\'', "''")));
    }
    if let Some(ref website) = data.website {
        set_clauses.push(format!("website = '{}'", website.replace('\'', "''")));
    }
    if let Some(ref logo_path) = data.logo_path {
        set_clauses.push(format!("logo_path = '{}'", logo_path.replace('\'', "''")));
    }
    if let Some(ref prefix) = data.invoice_prefix {
        set_clauses.push(format!("invoice_prefix = '{}'", prefix.replace('\'', "''")));
    }
    if let Some(ref currency) = data.default_currency {
        set_clauses.push(format!(
            "default_currency = '{}'",
            currency.replace('\'', "''")
        ));
    }
    if let Some(ref note) = data.legal_note {
        set_clauses.push(format!("legal_note = '{}'", note.replace('\'', "''")));
    }
    if let Some(ref pattern) = data.invoice_pattern {
        set_clauses.push(format!(
            "invoice_pattern = '{}'",
            pattern.replace('\'', "''")
        ));
    }

    let query = format!(
        "UPDATE company_settings SET {} WHERE tenant_id = '{}'",
        set_clauses.join(", "),
        tenant_id.replace('\'', "''")
    );

    conn.execute(&query, [])
        .map_err(|e| format!("Error al actualizar configuración: {}", e))?;

    // Query updated settings
    query_company_settings(&conn, &tenant_id)
        .map_err(|e| format!("Error al obtener configuración actualizada: {}", e))
}

// ============================================
// BANK ACCOUNTS
// ============================================

/// List bank accounts
#[tauri::command]
pub async fn list_bank_accounts(state: State<'_, AppState>) -> Result<Vec<BankAccount>, String> {
    println!("DEBUG: list_bank_accounts called");
    let tenant_id = get_tenant_id(&state)?;
    println!("DEBUG: list_bank_accounts tenant_id: {}", tenant_id);
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos".to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, tenant_id, bank_name, account_number, account_type, currency, is_default, is_active, created_at, updated_at FROM bank_accounts WHERE tenant_id = ?1 AND is_active = 1 ORDER BY created_at DESC")
        .map_err(|e| {
            println!("DEBUG: list_bank_accounts prepare error: {}", e);
            e.to_string()
        })?;

    let accounts = stmt
        .query_map([&tenant_id], |row| {
            Ok(BankAccount {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                bank_name: row.get(2)?,
                account_number: row.get(3)?,
                account_type: row.get(4)?,
                currency: row.get(5)?,
                is_default: row.get(6)?,
                is_active: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| {
            println!("DEBUG: list_bank_accounts collect error: {}", e);
            e.to_string()
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| {
            println!("DEBUG: list_bank_accounts collect error: {}", e);
            e.to_string()
        });

    if let Err(ref e) = accounts {
        println!("DEBUG: list_bank_accounts returning error: {}", e);
    } else {
        println!(
            "DEBUG: list_bank_accounts success, count: {}",
            accounts.as_ref().unwrap().len()
        );
    }
    accounts
}

/// Create bank account
#[tauri::command]
pub async fn create_bank_account(
    state: State<'_, AppState>,
    data: CreateBankAccountDto,
) -> Result<BankAccount, String> {
    println!("DEBUG: create_bank_account called with data: {:?}", data);
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    // If is_default, unset other defaults
    if data.is_default {
        conn.execute(
            "UPDATE bank_accounts SET is_default = 0 WHERE tenant_id = ?1",
            [&tenant_id],
        )
        .ok();
    }

    conn.execute(
        "INSERT INTO bank_accounts (id, tenant_id, bank_name, account_number, account_type, currency, is_default, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)",
        rusqlite::params![
            &id,
            &tenant_id,
            &data.bank_name,
            &data.account_number,
            &data.account_type,
            &data.currency,
            if data.is_default { 1 } else { 0 },
            &now
        ],
    )
    .map_err(|e| format!("Error al crear cuenta bancaria: {}", e))?;

    // Get the created account
    conn.query_row(
        "SELECT id, tenant_id, bank_name, account_number, account_type, currency, is_default,
                is_active, created_at, updated_at
         FROM bank_accounts WHERE id = ?1",
        [&id],
        |row| {
            Ok(BankAccount {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                bank_name: row.get(2)?,
                account_number: row.get(3)?,
                account_type: row.get(4)?,
                currency: row.get(5)?,
                is_default: row.get::<_, i32>(6)? == 1,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener cuenta: {}", e))
}

/// Update bank account
#[tauri::command]
pub async fn update_bank_account(
    state: State<'_, AppState>,
    id: String,
    data: UpdateBankAccountDto,
) -> Result<BankAccount, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    // If setting as default, unset others
    if data.is_default == Some(true) {
        conn.execute(
            "UPDATE bank_accounts SET is_default = 0 WHERE tenant_id = ?1",
            [&tenant_id],
        )
        .ok();
    }

    let mut set_clauses = vec![format!("updated_at = '{}'", now)];

    if let Some(ref name) = data.bank_name {
        set_clauses.push(format!("bank_name = '{}'", name.replace('\'', "''")));
    }
    if let Some(ref number) = data.account_number {
        set_clauses.push(format!("account_number = '{}'", number.replace('\'', "''")));
    }
    if let Some(ref acc_type) = data.account_type {
        set_clauses.push(format!("account_type = '{}'", acc_type.replace('\'', "''")));
    }
    if let Some(ref currency) = data.currency {
        set_clauses.push(format!("currency = '{}'", currency.replace('\'', "''")));
    }
    if let Some(is_default) = data.is_default {
        set_clauses.push(format!("is_default = {}", if is_default { 1 } else { 0 }));
    }

    let query = format!(
        "UPDATE bank_accounts SET {} WHERE id = '{}' AND tenant_id = '{}'",
        set_clauses.join(", "),
        id.replace('\'', "''"),
        tenant_id.replace('\'', "''")
    );

    conn.execute(&query, [])
        .map_err(|e| format!("Error al actualizar cuenta: {}", e))?;

    conn.query_row(
        "SELECT id, tenant_id, bank_name, account_number, account_type, currency, is_default,
                is_active, created_at, updated_at
         FROM bank_accounts WHERE id = ?1",
        [&id],
        |row| {
            Ok(BankAccount {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                bank_name: row.get(2)?,
                account_number: row.get(3)?,
                account_type: row.get(4)?,
                currency: row.get(5)?,
                is_default: row.get::<_, i32>(6)? == 1,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener cuenta: {}", e))
}

/// Delete bank account (soft delete)
#[tauri::command]
pub async fn delete_bank_account(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE bank_accounts SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
        rusqlite::params![&now, &id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar cuenta: {}", e))?;

    Ok(())
}

// ============================================
// TAX SETTINGS
// ============================================

/// List tax settings
#[tauri::command]
pub async fn list_tax_settings(state: State<'_, AppState>) -> Result<Vec<TaxSetting>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, tenant_id, name, rate, applies_to, is_active, created_at, updated_at
             FROM tax_settings WHERE tenant_id = ?1
             ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let taxes = stmt
        .query_map([&tenant_id], |row| {
            Ok(TaxSetting {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                rate: row.get(3)?,
                applies_to: row.get(4)?,
                is_active: row.get::<_, i32>(5)? == 1,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(taxes)
}

/// Create tax setting
#[tauri::command]
pub async fn create_tax_setting(
    state: State<'_, AppState>,
    data: CreateTaxSettingDto,
) -> Result<TaxSetting, String> {
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.execute(
        "INSERT INTO tax_settings (id, tenant_id, name, rate, applies_to, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        rusqlite::params![
            &id,
            &tenant_id,
            &data.name,
            data.rate,
            &data.applies_to,
            if data.is_active { 1 } else { 0 },
            &now
        ],
    )
    .map_err(|e| format!("Error al crear impuesto: {}", e))?;

    conn.query_row(
        "SELECT id, tenant_id, name, rate, applies_to, is_active, created_at, updated_at
         FROM tax_settings WHERE id = ?1",
        [&id],
        |row| {
            Ok(TaxSetting {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                rate: row.get(3)?,
                applies_to: row.get(4)?,
                is_active: row.get::<_, i32>(5)? == 1,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener impuesto: {}", e))
}

/// Update tax setting
#[tauri::command]
pub async fn update_tax_setting(
    state: State<'_, AppState>,
    id: String,
    data: UpdateTaxSettingDto,
) -> Result<TaxSetting, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut set_clauses = vec![format!("updated_at = '{}'", now)];

    if let Some(ref name) = data.name {
        set_clauses.push(format!("name = '{}'", name.replace('\'', "''")));
    }
    if let Some(rate) = data.rate {
        set_clauses.push(format!("rate = {}", rate));
    }
    if let Some(ref applies_to) = data.applies_to {
        set_clauses.push(format!("applies_to = '{}'", applies_to.replace('\'', "''")));
    }
    if let Some(is_active) = data.is_active {
        set_clauses.push(format!("is_active = {}", if is_active { 1 } else { 0 }));
    }

    let query = format!(
        "UPDATE tax_settings SET {} WHERE id = '{}' AND tenant_id = '{}'",
        set_clauses.join(", "),
        id.replace('\'', "''"),
        tenant_id.replace('\'', "''")
    );

    conn.execute(&query, [])
        .map_err(|e| format!("Error al actualizar impuesto: {}", e))?;

    conn.query_row(
        "SELECT id, tenant_id, name, rate, applies_to, is_active, created_at, updated_at
         FROM tax_settings WHERE id = ?1",
        [&id],
        |row| {
            Ok(TaxSetting {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                name: row.get(2)?,
                rate: row.get(3)?,
                applies_to: row.get(4)?,
                is_active: row.get::<_, i32>(5)? == 1,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| format!("Error al obtener impuesto: {}", e))
}

/// Delete tax setting (hard delete - no soft delete for settings)
#[tauri::command]
pub async fn delete_tax_setting(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.execute(
        "DELETE FROM tax_settings WHERE id = ?1 AND tenant_id = ?2",
        rusqlite::params![&id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar impuesto: {}", e))?;

    Ok(())
}

// ============================================
// INVOICE SEQUENCE
// ============================================

/// Get invoice sequence settings
#[tauri::command]
pub async fn get_invoice_sequence(state: State<'_, AppState>) -> Result<InvoiceSequence, String> {
    let settings = get_company_settings(state).await?;
    Ok(InvoiceSequence {
        prefix: settings.invoice_prefix,
        next_number: settings.invoice_counter + 1,
        pattern: settings
            .invoice_pattern
            .unwrap_or_else(|| "{PREFIX}-{NUMBER}".to_string()),
    })
}

/// Update invoice sequence settings
#[tauri::command]
pub async fn update_invoice_sequence(
    state: State<'_, AppState>,
    data: InvoiceSequence,
) -> Result<InvoiceSequence, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    // Update company settings with new sequence data
    // We update prefix, counter (next_number - 1), and pattern
    // The counter is the *last used* number, so if next is 100, counter should be 99

    let counter = if data.next_number > 0 {
        data.next_number - 1
    } else {
        0
    };

    conn.execute(
        "UPDATE company_settings 
         SET invoice_prefix = ?1, invoice_counter = ?2, invoice_pattern = ?3, updated_at = ?4 
         WHERE tenant_id = ?5",
        rusqlite::params![&data.prefix, counter, &data.pattern, &now, &tenant_id],
    )
    .map_err(|e| format!("Error al actualizar secuencia: {}", e))?;

    Ok(data)
}
