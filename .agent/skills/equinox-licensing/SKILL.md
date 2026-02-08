---
name: equinox-licensing
description: >
  License validation and hardware locking patterns.
  Trigger: When implementing license checks, hardware binding, or subscription validation.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [src-tauri]
  auto_invoke: "Implementing license validation"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Module Overview

The Licensing module handles:
- Hardware-bound licenses (fiscal modules only)
- Subscription validation via Supabase
- Grace period (7 days after expiry)
- Self-service hardware migration (2/year)
- Degraded mode (read-only when expired)

## License Types

| Module Type | Hardware Lock | Validation |
|-------------|---------------|------------|
| Fiscal (Invoicing, Accounting) | 🔒 Required | Every 30 days |
| Non-Fiscal (CRM, WhatsApp) | 🔓 None | Account-based |

## Rust Backend

### Models

```rust
// models/license.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct License {
    pub org_id: String,
    pub tenant_id: String,
    pub plan: Plan,
    pub hardware_id: Option<String>,
    pub modules: Vec<String>,
    pub expires_at: DateTime<Utc>,
    pub last_validated: DateTime<Utc>,
    pub is_valid: bool,
}

pub enum Plan {
    Starter,
    Basic,
    Pro,
    Enterprise,
}

pub enum LicenseStatus {
    Valid,
    GracePeriod { days_remaining: u32 },
    Expired,
    InvalidHardware,
}
```

### Hardware Fingerprint

```rust
// security/hardware_lock.rs
use sha2::{Sha256, Digest};

pub fn get_hardware_fingerprint() -> String {
    let machine_id = machine_uid::get()
        .unwrap_or_else(|_| "fallback".to_string());
    
    let salt = "equinox-hw-v1";
    let raw = format!("{}{}", machine_id, salt);
    
    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn verify_hardware_lock(expected: &str) -> bool {
    get_hardware_fingerprint() == expected
}
```

### License Validation

```rust
// commands/licensing.rs
#[tauri::command]
pub async fn validate_license(state: State<'_, AppState>) -> Result<LicenseStatus, String> {
    let license = fetch_license_from_supabase(&state.org_id).await?;
    
    // Check hardware for fiscal modules
    if license.modules.iter().any(is_fiscal_module) {
        if let Some(hw_id) = &license.hardware_id {
            if !verify_hardware_lock(hw_id) {
                return Ok(LicenseStatus::InvalidHardware);
            }
        }
    }
    
    let now = Utc::now();
    let days_since_expiry = (now - license.expires_at).num_days();
    
    if days_since_expiry < 0 {
        Ok(LicenseStatus::Valid)
    } else if days_since_expiry <= 7 {
        Ok(LicenseStatus::GracePeriod { 
            days_remaining: (7 - days_since_expiry) as u32 
        })
    } else {
        Ok(LicenseStatus::Expired)
    }
}

fn is_fiscal_module(module: &str) -> bool {
    matches!(module, "invoicing" | "accounting" | "fiscal_reports")
}
```

### Hardware Migration

```rust
#[tauri::command]
pub async fn generate_transfer_code(state: State<'_, AppState>) -> Result<String, String> {
    // Generate 24-hour valid code
    let code = format!("EQUINOX-MIGRATE-{}", generate_random_code());
    
    // Store in Supabase
    store_transfer_code(&state.tenant_id, &code, 24).await?;
    
    Ok(code)
}

#[tauri::command]
pub async fn apply_transfer_code(
    state: State<'_, AppState>,
    code: String,
) -> Result<(), String> {
    // Validate code
    let transfer = get_transfer_code(&code).await?;
    
    if transfer.is_expired() {
        return Err("Transfer code expired".into());
    }
    
    // Update hardware ID in Supabase
    let new_hw_id = get_hardware_fingerprint();
    update_hardware_id(&transfer.tenant_id, &new_hw_id).await?;
    
    // Invalidate old hardware
    invalidate_old_hardware(&transfer.old_hardware_id).await?;
    
    // Delete used code
    delete_transfer_code(&code).await?;
    
    Ok(())
}
```

## Degraded Mode

```rust
pub fn check_module_access(license: &License, module: &str) -> ModuleAccess {
    match validate_license_sync(license) {
        LicenseStatus::Valid => ModuleAccess::Full,
        LicenseStatus::GracePeriod { .. } => {
            // Show banner but allow full access
            ModuleAccess::FullWithWarning
        },
        LicenseStatus::Expired | LicenseStatus::InvalidHardware => {
            // Read-only mode
            ModuleAccess::ReadOnly
        }
    }
}
```

## Critical Rules

- ✅ ALWAYS verify hardware for fiscal modules
- ✅ ALWAYS allow 7-day grace period
- ✅ ALWAYS allow read-only in expired state
- ✅ ALWAYS validate on account switch
- ❌ NEVER block access to existing data
- ❌ NEVER allow more than 2 self-migrations/year
- ❌ NEVER skip validation for fiscal operations
