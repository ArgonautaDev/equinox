---
name: equinox-rust
description: >
  Equinox ERP Rust backend patterns and conventions.
  Trigger: When creating commands, models, services, or working in src-tauri/.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [src-tauri]
  auto_invoke:
    - "Creating Rust commands for Equinox"
    - "Working on src-tauri/ backend"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Directory Structure

```
src-tauri/src/
├── main.rs                 # Tauri entry point
├── lib.rs
├── commands/               # Tauri commands (one file per domain)
│   ├── mod.rs
│   ├── auth.rs
│   ├── clients.rs
│   ├── inventory.rs
│   └── invoicing.rs
├── models/                 # Data structures
│   ├── mod.rs
│   ├── client.rs
│   ├── product.rs
│   └── invoice.rs
├── security/               # SENIAT compliance
│   ├── mod.rs
│   ├── secure_chain.rs
│   ├── audit.rs
│   ├── time_guard.rs
│   └── hardware_lock.rs
├── services/               # Business logic
│   ├── mod.rs
│   ├── pdf_generator.rs
│   └── tax_calculator.rs
└── db/
    ├── mod.rs
    ├── sqlite.rs
    └── sync.rs
```

## Command Template

```rust
// commands/clients.rs
use crate::models::client::{Client, CreateClientDto, UpdateClientDto};
use crate::db::sqlite::DatabaseManager;
use tauri::State;

#[tauri::command]
pub async fn create_client(
    state: State<'_, DatabaseManager>,
    data: CreateClientDto,
) -> Result<Client, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO clients (id, tenant_id, name, tax_id) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, state.tenant_id, data.name, data.tax_id],
    ).map_err(|e| e.to_string())?;
    
    Ok(Client { id, name: data.name, tax_id: data.tax_id })
}
```

## Model Template

```rust
// models/client.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub tax_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateClientDto {
    pub name: String,
    pub tax_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateClientDto {
    pub name: Option<String>,
    pub tax_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
}
```

## Service Template

```rust
// services/tax_calculator.rs
use rust_decimal::Decimal;

pub struct TaxCalculator;

impl TaxCalculator {
    pub fn calculate_iva(subtotal: Decimal, rate: Decimal) -> Decimal {
        subtotal * rate / Decimal::from(100)
    }
    
    pub fn calculate_total(subtotal: Decimal, tax: Decimal, discount: Decimal) -> Decimal {
        subtotal + tax - discount
    }
}
```

## Decimal Handling (REQUIRED)

```rust
use rust_decimal::Decimal;
use rust_decimal_macros::dec;

// ✅ ALWAYS use Decimal for money
let price: Decimal = dec!(99.99);
let tax = price * dec!(0.16);

// ❌ NEVER use f64 for money
let price: f64 = 99.99; // WRONG!
```

## UUID Generation

```rust
use uuid::Uuid;

let id = Uuid::new_v4().to_string();
```

## Date/Time

```rust
use chrono::{Utc, Local};

let now_utc = Utc::now().to_rfc3339();
let now_local = Local::now().format("%Y-%m-%d").to_string();
```

## Critical Rules

- ✅ ALWAYS use `Decimal` for monetary values
- ✅ ALWAYS use UUID v4 for primary keys
- ✅ ALWAYS include `tenant_id` in queries
- ✅ ALWAYS log to audit for fiscal operations
- ❌ NEVER use f64/f32 for money calculations
- ❌ NEVER query without tenant isolation
