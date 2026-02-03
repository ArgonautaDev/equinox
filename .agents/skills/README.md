# AI Agent Skills

This directory contains **Agent Skills** following the [Agent Skills open standard](https://agentskills.io). Skills provide domain-specific patterns, conventions, and guardrails for AI coding assistants.

## Setup

Run the setup script to configure skills for your AI assistant:

```bash
./skills/setup.sh
```

## Available Skills

### Generic Skills

| Skill | Description |
|-------|-------------|
| `typescript` | Const types, flat interfaces, utility types |
| `react-19` | React 19 patterns, React Compiler |
| `tailwind-4` | cn() utility, Tailwind 4 patterns |
| `zustand-5` | Persist, selectors, slices |
| `rust-tauri` | Tauri commands, state management |
| `sqlcipher` | SQLite encryption, migrations |

### Equinox-Specific Skills

| Skill | Description |
|-------|-------------|
| `equinox` | Project overview, navigation |
| `equinox-rust` | Rust backend patterns |
| `equinox-ui` | React frontend patterns |
| `equinox-security` | SENIAT compliance |
| `equinox-clients` | Clients module |
| `equinox-inventory` | Inventory module |
| `equinox-invoicing` | Invoicing module |
| `equinox-licensing` | License validation |
| `equinox-sync` | Supabase sync |
| `equinox-modules` | Plugin system |

### Meta Skills

| Skill | Description |
|-------|-------------|
| `skill-creator` | Create new AI skills |
| `skill-sync` | Sync metadata to AGENTS.md |

## Creating New Skills

1. Create directory: `skills/{skill-name}/`
2. Add `SKILL.md` with frontmatter
3. Run `./skills/skill-sync/assets/sync.sh`

See `skill-creator` for detailed instructions.
