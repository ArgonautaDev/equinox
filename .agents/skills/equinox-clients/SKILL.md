---
name: equinox-clients
description: >
  Clients module patterns for Equinox ERP.
  Trigger: When working on client CRUD, client list, or client forms.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [src-tauri, src]
  auto_invoke: "Working on clients module"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Module Overview

The Clients module handles customer/client management with:
- CRUD operations
- Tax ID (RIF) validation
- Contact information
- Client history

## Rust Backend

### Model

```rust
// models/client.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub tenant_id: String,
    pub code: Option<String>,
    pub name: String,
    pub tax_id: Option<String>,       // RIF: V-12345678-9
    pub tax_type: Option<String>,     // V, E, J, G, P
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateClientDto {
    pub name: String,
    pub tax_id: Option<String>,
    pub tax_type: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClientFilters {
    pub search: Option<String>,
    pub is_active: Option<bool>,
}
```

### Commands

```rust
// commands/clients.rs
#[tauri::command]
pub async fn create_client(state: State<'_, AppState>, data: CreateClientDto) -> Result<Client, String>;

#[tauri::command]
pub async fn get_client(state: State<'_, AppState>, id: String) -> Result<Client, String>;

#[tauri::command]
pub async fn list_clients(state: State<'_, AppState>, filters: Option<ClientFilters>) -> Result<Vec<Client>, String>;

#[tauri::command]
pub async fn update_client(state: State<'_, AppState>, id: String, data: UpdateClientDto) -> Result<Client, String>;

#[tauri::command]
pub async fn delete_client(state: State<'_, AppState>, id: String) -> Result<(), String>;

#[tauri::command]
pub async fn search_clients(state: State<'_, AppState>, query: String) -> Result<Vec<Client>, String>;
```

## React Frontend

### File Structure

```
src/modules/clients/
├── index.tsx           # Route: /clients
├── ClientList.tsx      # Table with search
├── ClientForm.tsx      # Create/Edit form
├── ClientDetail.tsx    # View detail
├── columns.tsx         # Table columns
└── hooks.ts            # useClients, useClient
```

### Tauri Wrapper

```typescript
// lib/tauri.ts
export const clients = {
  create: (data: CreateClientDto) => invoke<Client>('create_client', { data }),
  get: (id: string) => invoke<Client>('get_client', { id }),
  list: (filters?: ClientFilters) => invoke<Client[]>('list_clients', { filters }),
  update: (id: string, data: UpdateClientDto) => invoke<Client>('update_client', { id, data }),
  delete: (id: string) => invoke<void>('delete_client', { id }),
  search: (query: string) => invoke<Client[]>('search_clients', { query }),
};
```

## Tax ID Validation (Venezuela)

```rust
pub fn validate_rif(rif: &str) -> bool {
    // Format: V-12345678-9, J-12345678-9, etc.
    let re = regex::Regex::new(r"^[VEJGP]-\d{8}-\d$").unwrap();
    re.is_match(rif)
}
```

## Critical Rules

- ✅ ALWAYS include `tenant_id` in all queries
- ✅ ALWAYS validate RIF format before saving
- ✅ ALWAYS use soft delete (`is_active = false`)
- ❌ NEVER hard delete clients with invoices
