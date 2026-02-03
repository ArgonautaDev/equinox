# Rust Backend Guidelines

## Component Overview

This directory contains the Rust backend for Equinox ERP:

| Directory | Purpose |
|-----------|---------|
| `src/commands/` | Tauri commands (API for frontend) |
| `src/models/` | Data structures and DTOs |
| `src/security/` | SENIAT compliance modules |
| `src/services/` | Business logic |
| `src/db/` | SQLite + SQLCipher layer |
| `migrations/` | SQL migration files |

## Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Creating Tauri commands | `rust-tauri` + `equinox-rust` |
| Working with SQLCipher | `sqlcipher` |
| Implementing secure_chain | `equinox-security` |
| Working on clients module | `equinox-clients` |
| Working on inventory module | `equinox-inventory` |
| Working on invoicing module | `equinox-invoicing` |
| Implementing licensing | `equinox-licensing` |
| Working on Supabase sync | `equinox-sync` |

## Critical Patterns

### Command Structure

```rust
#[tauri::command]
pub async fn command_name(
    state: State<'_, AppState>,
    data: InputDto,
) -> Result<OutputType, String> {
    // Implementation
}
```

### Monetary Values

```rust
use rust_decimal::Decimal;
// ✅ ALWAYS use Decimal for money
// ❌ NEVER use f64/f32
```

### Tenant Isolation

```rust
// ✅ ALWAYS include tenant_id
conn.execute("SELECT * FROM table WHERE tenant_id = ?", [tenant_id])?;
```

## Commands

```bash
# Run tests
cargo test

# Check compilation
cargo check

# Format code
cargo fmt

# Lint
cargo clippy
```
