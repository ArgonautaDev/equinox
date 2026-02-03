//! Equinox ERP - Main Entry Point
//!
//! A modular ERP system built with Tauri, Rust, and React.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod db;
mod models;
mod security;
mod services;
mod state;

use state::AppState;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize database and state
            let app_state = AppState::new(app.handle().clone())?;
            app.manage(app_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // System
            commands::system::get_app_info,
            commands::system::check_license,
            commands::system::seed_inventory_data,
            // Auth
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_current_user,
            commands::auth::register_user,
            commands::auth::change_password,
            commands::auth::setup_initial_admin,
            commands::auth::check_setup_required,
            // Clients
            commands::clients::create_client,
            commands::clients::get_client,
            commands::clients::list_clients,
            commands::clients::update_client,
            commands::clients::delete_client,
            commands::clients::restore_client,
            commands::clients::search_clients,
            // Categories
            commands::categories::list_categories,
            commands::categories::get_category,
            commands::categories::create_category,
            commands::categories::update_category,
            commands::categories::delete_category,
            commands::categories::restore_category,
            // Units
            commands::units::list_units,
            commands::units::get_unit,
            commands::units::create_unit,
            commands::units::update_unit,
            commands::units::delete_unit,
            // Product Types
            commands::product_types::list_product_types,
            // Products
            commands::products::list_products,
            commands::products::get_product,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::products::restore_product,
            commands::products::adjust_stock,
            commands::products::get_low_stock_products,
            // Variants
            commands::variants::list_variants,
            commands::variants::get_variant,
            commands::variants::create_variant,
            commands::variants::update_variant,
            commands::variants::delete_variant,
            commands::variants::adjust_variant_stock,
            // Lots
            commands::lots::list_lots,
            commands::lots::get_lot,
            commands::lots::create_lot,
            commands::lots::adjust_lot,
            commands::lots::delete_lot,
            commands::lots::get_expiring_lots,
            // Price History
            commands::price_history::list_price_history,
            // Settings
            commands::settings::get_company_settings,
            commands::settings::update_company_settings,
            commands::settings::list_bank_accounts,
            commands::settings::create_bank_account,
            commands::settings::update_bank_account,
            commands::settings::delete_bank_account,
            commands::settings::list_tax_settings,
            commands::settings::create_tax_setting,
            commands::settings::update_tax_setting,
            commands::settings::delete_tax_setting,
            commands::settings::get_invoice_sequence,
            commands::settings::update_invoice_sequence,
            // Price Lists
            commands::price_lists::list_price_lists,
            commands::price_lists::get_price_list,
            commands::price_lists::create_price_list,
            commands::price_lists::update_price_list,
            commands::price_lists::delete_price_list,
            commands::price_lists::list_product_prices,
            commands::price_lists::set_product_price,
            commands::price_lists::delete_product_price,
            // Discounts
            commands::discounts::list_discounts,
            commands::discounts::get_discount,
            commands::discounts::create_discount,
            commands::discounts::update_discount,
            commands::discounts::delete_discount,
            commands::discounts::use_discount,
            // Invoices
            commands::invoices::list_invoices,
            commands::invoices::get_invoice,
            commands::invoices::create_invoice,
            commands::invoices::update_invoice,
            commands::invoices::issue_invoice,
            commands::invoices::cancel_invoice,
            commands::invoices::delete_invoice,
            // Payments
            commands::payments::list_payments,
            commands::payments::register_payment,
            commands::payments::delete_payment,
            commands::payments::get_account_balances,
            commands::payments::get_account_balances,
            commands::payments::get_recent_movements,
            // Setup
            commands::setup::validate_license,
            commands::setup::configure_database,
            commands::setup::restart_app,
            // Sync
            commands::sync::start_sync,
            commands::sync::get_last_sync_status,
            commands::sync::check_cloud_updates,
            // Security
            commands::security::get_hardware_id,
            commands::security::get_hardware_id,
            commands::security::verify_license_locally,
            // Cash Register
            commands::cash_register::create_register,
            commands::cash_register::open_session,
            commands::cash_register::close_session,
            commands::cash_register::add_movement,
            commands::cash_register::get_active_session,
            commands::cash_register::list_registers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
