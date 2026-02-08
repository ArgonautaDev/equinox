---
name: equinox
description: >
  Equinox ERP project overview and navigation guide.
  Trigger: When starting work on Equinox, navigating the codebase, or understanding project structure.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [root]
  auto_invoke: "General Equinox development questions"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Project Overview

Equinox ERP is a modular enterprise resource planning system with:
- **Desktop app** using Tauri 2 + Rust
- **React frontend** with TypeScript
- **SQLCipher** encrypted local database
- **Supabase** cloud sync
- **SENIAT compliance** for Venezuela fiscal requirements

## Architecture

```
equinox-ruby/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri commands (API)
│   │   ├── models/         # Data structures
│   │   ├── security/       # SENIAT compliance
│   │   ├── services/       # Business logic
│   │   └── db/             # SQLite + SQLCipher
│   └── migrations/
│
├── src/                    # React frontend
│   ├── components/
│   │   ├── ui/             # Shadcn components
│   │   └── shell/          # AppShell, Sidebar
│   ├── modules/            # Feature modules
│   │   ├── clients/
│   │   ├── inventory/
│   │   └── invoicing/
│   └── lib/
│       ├── tauri.ts        # Invoke wrappers
│       └── store.ts        # Zustand stores
│
├── modules/                # External plugins
└── skills/                 # AI agent skills
```

## Core Modules (MVP)

| Module | Rust Location | React Location |
|--------|---------------|----------------|
| Clients | `commands/clients.rs` | `modules/clients/` |
| Inventory | `commands/inventory.rs` | `modules/inventory/` |
| Invoicing | `commands/invoicing.rs` | `modules/invoicing/` |

## Multi-Tenant Structure

```
Organization (Company)
├── Multiple Tenants (Branches)
│   ├── Local SQLite (offline-capable)
│   └── Hardware-locked for fiscal modules
└── Master Inventory (aggregated in Supabase)
```

## Key Patterns

### Frontend → Backend Communication

```typescript
// Always use typed invoke wrappers
import { clients } from '@/lib/tauri';

const client = await clients.create({ name: 'ACME' });
```

### Security-First

- All fiscal documents use `secure_chain` (blockchain-lite)
- Audit logs are immutable (SQL triggers)
- Hardware locking for fiscal modules
- Time manipulation detection

## Commands

```bash
# Development
bun run tauri dev

# Build
bun run tauri build

# Rust tests
cd src-tauri && cargo test

# Type check
bun run typecheck
```

## Related Skills

| Need | Skill |
|------|-------|
| Rust backend patterns | `equinox-rust` |
| React UI patterns | `equinox-ui` |
| Security/SENIAT | `equinox-security` |
| Clients module | `equinox-clients` |
| Inventory module | `equinox-inventory` |
| Invoicing module | `equinox-invoicing` |
