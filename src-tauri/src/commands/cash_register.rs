use crate::models::cash_register::{
    AddMovementDto, CashMovement, CashRegister, CashRegisterSession, CloseSessionDto,
    OpenSessionDto,
};
use crate::services::cash_register;
use crate::state::AppState;
use tauri::{command, State};

#[command]
pub async fn create_register(
    state: State<'_, AppState>,
    name: String,
) -> Result<CashRegister, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let tenant_id = state.require_tenant()?;

    cash_register::create_register(&conn, &tenant_id, &name).map_err(|e| e.to_string())
}

#[command]
pub async fn open_session(
    state: State<'_, AppState>,
    data: OpenSessionDto,
) -> Result<CashRegisterSession, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let tenant_id = state.require_tenant()?;
    let user_id = state.require_user()?;

    cash_register::open_session(&conn, &tenant_id, &user_id, data).map_err(|e| e.to_string())
}

#[command]
pub async fn close_session(
    state: State<'_, AppState>,
    data: CloseSessionDto,
) -> Result<CashRegisterSession, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let tenant_id = state.require_tenant()?;

    cash_register::close_session(&conn, &tenant_id, data).map_err(|e| e.to_string())
}

#[command]
pub async fn add_movement(
    state: State<'_, AppState>,
    data: AddMovementDto,
) -> Result<CashMovement, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let tenant_id = state.require_tenant()?;
    let user_id = state.require_user()?;

    cash_register::add_movement(&conn, &tenant_id, &user_id, data).map_err(|e| e.to_string())
}

#[command]
pub async fn get_active_session(
    state: State<'_, AppState>,
) -> Result<Option<CashRegisterSession>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let tenant_id = state.require_tenant()?;
    let user_id = state.require_user()?;

    cash_register::get_active_session(&conn, &tenant_id, &user_id).map_err(|e| e.to_string())
}

#[command]
pub async fn list_registers(state: State<'_, AppState>) -> Result<Vec<CashRegister>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let tenant_id = state.require_tenant()?;

    cash_register::list_registers(&conn, &tenant_id).map_err(|e| e.to_string())
}
