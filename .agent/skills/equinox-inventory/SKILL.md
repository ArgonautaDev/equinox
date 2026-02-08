---
name: equinox-inventory
description: >
  Inventory module patterns for Equinox ERP.
  Trigger: When working on products, stock management, or inventory movements.
license: MIT
metadata:
  author: equinox
  version: "1.0"
  scope: [src-tauri, src]
  auto_invoke: "Working on inventory module"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Module Overview

The Inventory module handles:
- Product catalog (CRUD)
- Stock quantities per tenant (localized)
- Stock movements (in/out/adjustment)
- Low stock alerts
- Sync to Master inventory

## Architecture

```
Tenant (Branch)              Organization (Master)
┌─────────────┐              ┌─────────────────┐
│ Local Stock │──── sync ───→│ Aggregated View │
│ SQLite      │              │ Supabase        │
└─────────────┘              └─────────────────┘
```

## Rust Backend

### Models

```rust
// models/product.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub tenant_id: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: String,                    // UND, KG, LT
    pub unit_price: Decimal,
    pub cost_price: Option<Decimal>,
    pub tax_rate: Decimal,               // 16.00 for IVA
    pub stock_quantity: Decimal,
    pub min_stock: Decimal,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryMovement {
    pub id: String,
    pub tenant_id: String,
    pub product_id: String,
    pub movement_type: MovementType,     // In, Out, Adjustment
    pub quantity: Decimal,
    pub reference_type: Option<String>,  // invoice, purchase
    pub reference_id: Option<String>,
    pub notes: Option<String>,
    pub created_by: String,
    pub created_at: String,
}

pub enum MovementType {
    In,
    Out,
    Adjustment,
    Transfer,
}
```

### Commands

```rust
// commands/inventory.rs
#[tauri::command]
pub async fn create_product(state: State<'_, AppState>, data: CreateProductDto) -> Result<Product, String>;

#[tauri::command]
pub async fn list_products(state: State<'_, AppState>, filters: Option<ProductFilters>) -> Result<Vec<Product>, String>;

#[tauri::command]
pub async fn adjust_stock(
    state: State<'_, AppState>,
    product_id: String,
    quantity: Decimal,
    movement_type: MovementType,
    notes: Option<String>,
) -> Result<Product, String>;

#[tauri::command]
pub async fn get_low_stock_alerts(state: State<'_, AppState>) -> Result<Vec<Product>, String>;
```

### Stock Adjustment Logic

```rust
pub fn adjust_stock(conn: &Connection, product_id: &str, quantity: Decimal, movement_type: MovementType) -> Result<Decimal> {
    let current: Decimal = conn.query_row(
        "SELECT stock_quantity FROM products WHERE id = ?",
        [product_id],
        |row| row.get(0),
    )?;

    let new_quantity = match movement_type {
        MovementType::In => current + quantity,
        MovementType::Out => current - quantity,
        MovementType::Adjustment => quantity, // Absolute
        MovementType::Transfer => current - quantity,
    };

    if new_quantity < Decimal::ZERO {
        return Err(AppError::Validation("Insufficient stock".into()));
    }

    conn.execute(
        "UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?",
        params![new_quantity, Utc::now().to_rfc3339(), product_id],
    )?;

    // Record movement
    record_movement(conn, product_id, quantity, movement_type)?;

    Ok(new_quantity)
}
```

## React Frontend

### File Structure

```
src/modules/inventory/
├── index.tsx              # Route: /inventory
├── ProductList.tsx        # Table with filters
├── ProductForm.tsx        # Create/Edit
├── StockAdjustment.tsx    # Quick adjust modal
├── LowStockAlert.tsx      # Alert badge
├── columns.tsx
└── hooks.ts
```

## Low Stock Query

```sql
SELECT * FROM products 
WHERE tenant_id = ? 
  AND stock_quantity <= min_stock 
  AND is_active = 1
ORDER BY stock_quantity ASC;
```

## Critical Rules

- ✅ ALWAYS record movements for any stock change
- ✅ ALWAYS validate stock >= 0 before Out movement
- ✅ ALWAYS use Decimal for quantities and prices
- ✅ ALWAYS include tenant_id in queries
- ❌ NEVER allow negative stock
- ❌ NEVER modify stock without creating movement record
