# Equinox ERP - AI Agent Guidelines

This file defines the operational parameters, build commands, and coding standards for AI agents (Cursor, Copilot, CLI) working on Equinox ERP.

## 1. Environment & Commands

### Build & Run

The project uses **Bun** for the frontend and **Cargo** for the backend.

| Command             | Action  | Description                          |
| ------------------- | ------- | ------------------------------------ |
| `bun install`       | Install | Install frontend dependencies        |
| `bun run tauri dev` | Develop | Start Tauri app (Frontend + Backend) |
| `bun run build`     | Build   | Production build for host OS         |
| `bun run typecheck` | Verify  | Run TypeScript compiler check        |
| `bun run lint`      | Lint    | Run ESLint (max warnings: 0)         |
| `bun run format`    | Style   | Format code with Prettier            |

### Testing

**Frontend:** No test runner configured. Do not run `npm test`.
**Backend:** Tests are in `src-tauri/`.

| Scope           | Command                | Notes                               |
| --------------- | ---------------------- | ----------------------------------- |
| **All Tests**   | `cargo test`           | Runs all unit and integration tests |
| **Single Test** | `cargo test test_name` | Run a specific test case            |
| **Package**     | `cargo test -p app`    | Test specific crate                 |

## 2. Code Style & Conventions

### 2.1. General AI Rules

- **Paths**: ALWAYS use **absolute paths** (e.g., `/Users/.../src/file.ts`).
- **Commits**: `<type>[scope]: <description>` (Scopes: `rust`, `ui`, `security`, `invoicing`, `inventory`).
- **Safety**: NEVER commit secrets. WARN before force-pushing.

### 2.2. Frontend (React/TypeScript)

- **Tauri Integration**: ✅ Use wrappers in `src/lib/tauri.ts`. ❌ NO `invoke()` in components.
- **Data Fetching**: ✅ Use `useQuery` (TanStack Query). ❌ NO `useEffect` fetch.
- **Forms**: ✅ Use `react-hook-form` + `zod`.
- **State**: `zustand` (Global), `TanStack Query` (Server), `useState` (Local UI).

### 2.3. Backend (Rust/Tauri)

- **Money**: ✅ Use `rust_decimal::Decimal`. ❌ NEVER `f32`/`f64`.
- **DB Security**: ✅ Include `tenant_id` in EVERY query. ✅ Use parameterized queries.
- **Errors**: Return `Result<T, CommandError>` for commands.

## 3. Available Skills (Auto-Invoke)

| Action            | Skill                         | Description                 |
| ----------------- | ----------------------------- | --------------------------- |
| **Tauri/Rust**    | `rust-tauri` + `equinox-rust` | Commands, models, state     |
| **SQLCipher**     | `sqlcipher`                   | Encryption, migrations      |
| **UI Components** | `equinox-ui` + `react-19`     | Shadcn, Tailwind 4          |
| **Security**      | `equinox-security`            | SENIAT, audit, secure_chain |
| **Invoicing**     | `equinox-invoicing`           | Fiscal documents            |
| **Inventory**     | `equinox-inventory`           | Stock, lots, variants       |
| **Sync**          | `equinox-sync`                | Supabase offline-first      |

## 4. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         TAURI APP                               │
├────────────────────────────────────────────────────────────────┤
│  React Frontend (src/)          │  Rust Backend (src-tauri/)   │
│  ├── components/                │  ├── commands/               │
│  ├── modules/                   │  ├── models/                 │
│  │   ├── clients/               │  ├── security/               │
│  │   ├── inventory/             │  ├── services/               │
│  │   └── invoicing/             │  └── db/                     │
│  └── lib/                       │                              │
└────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────┐
│                      SUPABASE CLOUD                             │
│  PostgreSQL │ Auth │ Storage │ Module Marketplace               │
└────────────────────────────────────────────────────────────────┘
```
