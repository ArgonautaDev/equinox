# React Frontend Guidelines

## Component Overview

This directory contains the React frontend for Equinox ERP:

| Directory | Purpose |
|-----------|---------|
| `components/ui/` | Shadcn components |
| `components/shell/` | AppShell, Sidebar, Header |
| `modules/` | Feature modules (clients, inventory, invoicing) |
| `lib/` | Utilities, Tauri wrappers, stores |
| `hooks/` | Global React hooks |
| `styles/` | Global CSS |

## Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Creating React components | `react-19` + `equinox-ui` |
| Writing TypeScript types | `typescript` |
| Working with Tailwind | `tailwind-4` |
| Using Zustand stores | `zustand-5` |
| Working on clients module | `equinox-clients` |
| Working on inventory module | `equinox-inventory` |
| Working on invoicing module | `equinox-invoicing` |

## Critical Patterns

### Tauri Invoke

```typescript
// ✅ ALWAYS use lib/tauri.ts wrappers
import { clients } from '@/lib/tauri';
const data = await clients.list();

// ❌ NEVER call invoke directly in components
```

### Data Fetching

```typescript
// ✅ ALWAYS use TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['clients'],
  queryFn: () => clients.list(),
});

// ❌ NEVER use useState for server data
```

### Forms

```typescript
// ✅ ALWAYS use react-hook-form + zod
const form = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

## Commands

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format
```
