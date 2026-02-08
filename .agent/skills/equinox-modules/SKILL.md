---
name: equinox-modules
description: >
  Plugin/module marketplace system patterns.
  Trigger: When creating module manifests, loading external modules, or working on marketplace.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [root]
  auto_invoke: "Creating new module/plugin"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Module Overview

The Module system enables:
- Core modules (built-in)
- Official modules (Equinox-developed, paid)
- Third-party modules (reviewed, marketplace)
- Dynamic loading and unloading
- Permission-based access control

## Module Types

| Type | Location | Access to secure_chain |
|------|----------|----------------------|
| Core | `src/modules/` | ✅ Full |
| Official | `modules/equinox-*/` | ✅ Full |
| Third-party | `modules/*/` | ❌ None |

## Module Manifest

```json
{
  "id": "com.equinox.pos",
  "name": "Point of Sale",
  "version": "1.0.0",
  "type": "official",
  "author": "Equinox",
  "description": "POS module for retail",
  
  "dependencies": [
    "com.equinox.inventory@^1.0.0",
    "com.equinox.clients@^1.0.0"
  ],
  
  "permissions": [
    "db:read:products",
    "db:read:clients",
    "db:write:sales",
    "ui:sidebar"
  ],
  
  "entrypoints": {
    "rust": "src/lib.rs",
    "react": "ui/index.tsx"
  },
  
  "sidebar": {
    "icon": "ShoppingCart",
    "label": "POS",
    "order": 5
  },
  
  "routes": [
    "/pos",
    "/pos/sales",
    "/pos/cashier"
  ],
  
  "pricing": {
    "type": "subscription",
    "price": 15.00,
    "currency": "USD",
    "period": "monthly"
  }
}
```

## Module Structure

```
modules/
├── equinox-pos/           # Official module
│   ├── manifest.json
│   ├── src/               # Rust code
│   │   ├── lib.rs
│   │   └── commands.rs
│   ├── ui/                # React code
│   │   ├── index.tsx
│   │   └── components/
│   └── migrations/
│       └── 001_pos_tables.sql
│
└── third-party-whatsapp/  # Third-party module
    ├── manifest.json
    ├── ui/
    └── README.md
```

## Module Registry

```rust
// modules/registry.rs
pub struct ModuleRegistry {
    installed: HashMap<String, InstalledModule>,
    available: Vec<AvailableModule>,
}

impl ModuleRegistry {
    pub fn load_module(&mut self, module_id: &str) -> Result<()>;
    pub fn unload_module(&mut self, module_id: &str) -> Result<()>;
    pub fn get_enabled_modules(&self) -> Vec<&InstalledModule>;
    pub fn check_dependencies(&self, module: &Module) -> Result<()>;
}

pub struct InstalledModule {
    pub manifest: ModuleManifest,
    pub enabled: bool,
    pub installed_at: DateTime<Utc>,
    pub license_valid: bool,
}
```

## Permission System

```rust
pub enum Permission {
    DbRead(String),      // db:read:products
    DbWrite(String),     // db:write:sales
    UiSidebar,           // ui:sidebar
    UiSettings,          // ui:settings
    ApiExternal,         // api:external
    SecureChain,         // secure_chain (official only)
}

pub fn validate_permissions(module: &Module, action: &str) -> bool {
    // Third-party can never access secure_chain
    if module.module_type == ModuleType::ThirdParty {
        if action.starts_with("secure_chain") {
            return false;
        }
    }
    
    module.permissions.contains(&Permission::from(action))
}
```

## Dynamic UI Loading

```typescript
// lib/module-loader.ts
export async function loadModuleUI(moduleId: string): Promise<ModuleComponent> {
  const manifest = await getModuleManifest(moduleId);
  
  // Dynamic import
  const module = await import(`/modules/${moduleId}/ui/index.tsx`);
  
  return {
    component: module.default,
    routes: manifest.routes,
    sidebar: manifest.sidebar,
  };
}
```

## Sidebar Integration

```typescript
// components/shell/Sidebar.tsx
function Sidebar() {
  const modules = useEnabledModules();
  
  return (
    <nav>
      {/* Core modules */}
      <SidebarItem to="/clients" icon={Users} label="Clients" />
      <SidebarItem to="/inventory" icon={Package} label="Inventory" />
      <SidebarItem to="/invoices" icon={FileText} label="Invoicing" />
      
      <Separator />
      
      {/* Dynamic modules */}
      {modules.map(mod => (
        <SidebarItem
          key={mod.id}
          to={mod.sidebar.route}
          icon={Icons[mod.sidebar.icon]}
          label={mod.sidebar.label}
        />
      ))}
    </nav>
  );
}
```

## Module Installation Flow

1. User selects module in marketplace
2. Validate license/subscription
3. Check dependencies
4. Run migrations
5. Load Rust commands (restart required)
6. Load React UI (hot reload)
7. Update sidebar

## Critical Rules

- ✅ ALWAYS validate manifest schema
- ✅ ALWAYS check dependencies before install
- ✅ ALWAYS run migrations in transaction
- ✅ ALWAYS review third-party code before approval
- ❌ NEVER give secure_chain access to third-party
- ❌ NEVER allow unsigned modules in production
- ❌ NEVER skip permission checks
