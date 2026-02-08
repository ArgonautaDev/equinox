---
name: rust-tauri
description: >
  Tauri 2 patterns for Rust backend development.
  Trigger: When creating Tauri commands, managing state, or implementing invoke handlers.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [root, src-tauri]
  auto_invoke: "Creating Tauri commands"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Tauri Command Pattern (REQUIRED)

```rust
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateClientDto {
    pub name: String,
    pub tax_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub tax_id: Option<String>,
}

#[tauri::command]
pub async fn create_client(
    state: State<'_, AppState>,
    data: CreateClientDto,
) -> Result<Client, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // Implementation
    Ok(client)
}
```

## State Management

```rust
use std::sync::{Arc, Mutex};
use rusqlite::Connection;

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub tenant_id: Arc<Mutex<Option<String>>>,
}

// In main.rs
fn main() {
    tauri::Builder::default()
        .manage(AppState {
            db: Arc::new(Mutex::new(conn)),
            tenant_id: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            create_client,
            list_clients,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Error Handling

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
}

// Convert to String for Tauri
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
```

## Module Organization

```
src-tauri/src/
├── main.rs              # Entry point
├── lib.rs               # Exports
├── commands/
│   ├── mod.rs           # pub mod declarations
│   ├── auth.rs
│   ├── clients.rs
│   └── invoicing.rs
├── models/
│   ├── mod.rs
│   ├── client.rs
│   └── invoice.rs
└── services/
    ├── mod.rs
    └── pdf_generator.rs
```

## Frontend Integration

```typescript
// src/lib/tauri.ts
import { invoke } from '@tauri-apps/api/core';

export interface Client {
  id: string;
  name: string;
  tax_id?: string;
}

export const clients = {
  create: (data: CreateClientDto) => 
    invoke<Client>('create_client', { data }),
  
  list: (filters?: ClientFilters) => 
    invoke<Client[]>('list_clients', { filters }),
};
```

## ⚠️ Parameter Naming Convention (Tauri 2)

**Tauri 2 automatically converts Rust's snake_case parameters to camelCase when exposed to the frontend.**

When calling `invoke()` from TypeScript, use **camelCase** keys - Tauri handles the conversion.

```rust
// Rust command (snake_case in Rust)
#[tauri::command]
pub async fn setup_admin(
    org_name: String,      // Rust uses snake_case
    admin_email: String,
) -> Result<User, String> { ... }
```

```typescript
// ✅ CORRECT - use camelCase in TypeScript
invoke('setup_admin', { 
  orgName: 'My Org',       // Tauri converts to org_name for Rust
  adminEmail: 'a@b.com'    // Tauri converts to admin_email for Rust
});

// ❌ WRONG - snake_case will NOT match
invoke('setup_admin', { 
  org_name: 'My Org',      // Won't match!
  admin_email: 'a@b.com'   // Won't match!
});
```

**Simple pattern for TypeScript wrappers:**
```typescript
export const auth = {
  setupAdmin: (orgName: string, adminEmail: string) =>
    invoke<User>('setup_admin', { orgName, adminEmail }),
};
```

## Critical Rules

- ✅ ALWAYS use `State<'_, T>` for shared state
- ✅ ALWAYS return `Result<T, String>` from commands
- ✅ ALWAYS use `#[derive(Serialize, Deserialize)]` on DTOs
- ✅ ALWAYS use **camelCase** keys when calling `invoke()` from TypeScript (Tauri 2 converts automatically)
- ❌ NEVER block the main thread with heavy operations
- ❌ NEVER unwrap() in commands - handle errors properly
- ❌ NEVER use snake_case keys in invoke() calls for Tauri 2 - they won't match

