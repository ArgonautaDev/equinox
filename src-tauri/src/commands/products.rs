//! Product Commands

use crate::models::{CreateProductDto, Product, ProductFilters, UpdateProductDto};
use crate::state::AppState;
use tauri::State;
use uuid::Uuid;

/// Get tenant_id from state
fn get_tenant_id(state: &State<'_, AppState>) -> Result<String, String> {
    state
        .tenant_id
        .lock()
        .map_err(|_| "Error al acceder al tenant".to_string())?
        .clone()
        .ok_or_else(|| "No hay tenant activo".to_string())
}

/// Generate next SKU
fn generate_next_sku(
    state: &State<'_, AppState>,
    tenant_id: &str,
    prefix: &str,
) -> Result<String, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE tenant_id = ?1",
            [tenant_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(format!("{}-{:04}", prefix, count + 1))
}

/// Calculate margins from prices
fn calculate_margins(cost_price: f64, sale_price: f64) -> (f64, f64) {
    let margin_amount = sale_price - cost_price;
    let margin_percent = if cost_price > 0.0 {
        (margin_amount / cost_price) * 100.0
    } else {
        0.0
    };
    (margin_percent, margin_amount)
}

/// List all products with filters
#[tauri::command]
pub async fn list_products(
    state: State<'_, AppState>,
    filters: Option<ProductFilters>,
) -> Result<Vec<Product>, String> {
    let tenant_id = get_tenant_id(&state)?;
    let filters = filters.unwrap_or_default();
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    let mut sql = String::from(
        "SELECT id, tenant_id, sku, barcode, name, description, category_id, unit_id, product_type_id,
                COALESCE(cost_price, 0) as cost_price, COALESCE(sale_price, unit_price) as sale_price,
                COALESCE(margin_percent, 0) as margin_percent, COALESCE(margin_amount, 0) as margin_amount,
                COALESCE(tax_rate, 16.0) as tax_rate, COALESCE(stock_quantity, 0) as stock_quantity,
                COALESCE(min_stock, 0) as min_stock, COALESCE(max_stock, 0) as max_stock,
                supplier_reference, image_url, COALESCE(has_variants, 0) as has_variants,
                COALESCE(track_expiration, 0) as track_expiration, COALESCE(cost_method, 'manual') as cost_method,
                is_active, created_at, updated_at
         FROM products WHERE tenant_id = ?1"
    );

    // Apply filters
    if let Some(is_active) = filters.is_active {
        sql.push_str(&format!(
            " AND is_active = {}",
            if is_active { 1 } else { 0 }
        ));
    } else {
        sql.push_str(" AND is_active = 1");
    }

    if let Some(ref category_id) = filters.category_id {
        sql.push_str(&format!(
            " AND category_id = '{}'",
            category_id.replace('\'', "''")
        ));
    }

    if let Some(ref product_type_id) = filters.product_type_id {
        sql.push_str(&format!(
            " AND product_type_id = '{}'",
            product_type_id.replace('\'', "''")
        ));
    }

    if let Some(ref search) = filters.search {
        sql.push_str(&format!(
            " AND (name LIKE '%{}%' OR sku LIKE '%{}%' OR barcode LIKE '%{}%' OR description LIKE '%{}%')",
            search.replace('\'', "''"),
            search.replace('\'', "''"),
            search.replace('\'', "''"),
            search.replace('\'', "''")
        ));
    }

    if filters.low_stock == Some(true) {
        sql.push_str(" AND stock_quantity <= min_stock AND min_stock > 0");
    }

    sql.push_str(" ORDER BY name ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let products = stmt
        .query_map([&tenant_id], |row| {
            Ok(Product {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                sku: row.get(2)?,
                barcode: row.get(3)?,
                name: row.get(4)?,
                description: row.get(5)?,
                category_id: row.get(6)?,
                unit_id: row.get(7)?,
                product_type_id: row.get(8)?,
                cost_price: row.get(9)?,
                sale_price: row.get(10)?,
                margin_percent: row.get(11)?,
                margin_amount: row.get(12)?,
                tax_rate: row.get(13)?,
                stock_quantity: row.get(14)?,
                min_stock: row.get(15)?,
                max_stock: row.get(16)?,
                supplier_reference: row.get(17)?,
                image_url: row.get(18)?,
                has_variants: row.get::<_, i32>(19)? == 1,
                track_expiration: row.get::<_, i32>(20)? == 1,
                cost_method: row.get(21)?,
                is_active: row.get::<_, i32>(22)? == 1,
                created_at: row.get(23)?,
                updated_at: row.get(24)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(products)
}

/// Get a single product by ID
#[tauri::command]
pub async fn get_product(state: State<'_, AppState>, id: String) -> Result<Product, String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;

    conn.query_row(
        "SELECT id, tenant_id, sku, barcode, name, description, category_id, unit_id, product_type_id,
                COALESCE(cost_price, 0), COALESCE(sale_price, unit_price), COALESCE(margin_percent, 0),
                COALESCE(margin_amount, 0), COALESCE(tax_rate, 16.0), COALESCE(stock_quantity, 0),
                COALESCE(min_stock, 0), COALESCE(max_stock, 0), supplier_reference, image_url,
                COALESCE(has_variants, 0), COALESCE(track_expiration, 0), COALESCE(cost_method, 'manual'),
                is_active, created_at, updated_at
         FROM products WHERE id = ?1 AND tenant_id = ?2",
        [&id, &tenant_id],
        |row| {
            Ok(Product {
                id: row.get(0)?,
                tenant_id: row.get(1)?,
                sku: row.get(2)?,
                barcode: row.get(3)?,
                name: row.get(4)?,
                description: row.get(5)?,
                category_id: row.get(6)?,
                unit_id: row.get(7)?,
                product_type_id: row.get(8)?,
                cost_price: row.get(9)?,
                sale_price: row.get(10)?,
                margin_percent: row.get(11)?,
                margin_amount: row.get(12)?,
                tax_rate: row.get(13)?,
                stock_quantity: row.get(14)?,
                min_stock: row.get(15)?,
                max_stock: row.get(16)?,
                supplier_reference: row.get(17)?,
                image_url: row.get(18)?,
                has_variants: row.get::<_, i32>(19)? == 1,
                track_expiration: row.get::<_, i32>(20)? == 1,
                cost_method: row.get(21)?,
                is_active: row.get::<_, i32>(22)? == 1,
                created_at: row.get(23)?,
                updated_at: row.get(24)?,
            })
        },
    )
    .map_err(|e| format!("Producto no encontrado: {}", e))
}

/// Create a new product
#[tauri::command]
pub async fn create_product(
    state: State<'_, AppState>,
    data: CreateProductDto,
) -> Result<Product, String> {
    let tenant_id = get_tenant_id(&state)?;
    let id = Uuid::new_v4().to_string();

    // Generate SKU if not provided
    let sku = match &data.sku {
        Some(s) if !s.is_empty() => s.clone(),
        _ => generate_next_sku(&state, &tenant_id, "PRD")?,
    };

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();

        let cost_price = data.cost_price.unwrap_or(0.0);
        let sale_price = data.sale_price.unwrap_or(0.0);
        let (margin_percent, margin_amount) = calculate_margins(cost_price, sale_price);
        let tax_rate = data.tax_rate.unwrap_or(16.0);

        conn.execute(
            "INSERT INTO products (
                id, tenant_id, sku, barcode, name, description, category_id, unit_id, product_type_id,
                cost_price, unit_price, sale_price, margin_percent, margin_amount, tax_rate,
                stock_quantity, min_stock, max_stock, supplier_reference, image_url,
                has_variants, track_expiration, cost_method, is_active, created_at, updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, ?12, ?13, ?14,
                0, ?15, ?16, ?17, ?18, ?19, ?20, 'manual', 1, ?21, ?21
            )",
            rusqlite::params![
                &id,
                &tenant_id,
                &sku,
                &data.barcode,
                &data.name,
                &data.description,
                &data.category_id,
                &data.unit_id,
                &data.product_type_id,
                cost_price,
                sale_price,
                margin_percent,
                margin_amount,
                tax_rate,
                data.min_stock.unwrap_or(0.0),
                data.max_stock.unwrap_or(0.0),
                &data.supplier_reference,
                &data.image_url,
                if data.has_variants.unwrap_or(false) { 1 } else { 0 },
                if data.track_expiration.unwrap_or(false) { 1 } else { 0 },
                &now
            ],
        )
        .map_err(|e| format!("Error al crear producto: {}", e))?;
    }

    get_product(state, id).await
}

/// Update a product
#[tauri::command]
pub async fn update_product(
    state: State<'_, AppState>,
    id: String,
    data: UpdateProductDto,
) -> Result<Product, String> {
    let tenant_id = get_tenant_id(&state)?;

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();

        // Get current prices for margin calculation
        let (current_cost, current_sale): (f64, f64) = conn.query_row(
            "SELECT COALESCE(cost_price, 0), COALESCE(sale_price, unit_price) FROM products WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap_or((0.0, 0.0));

        let new_cost = data.cost_price.unwrap_or(current_cost);
        let new_sale = data.sale_price.unwrap_or(current_sale);
        let (margin_percent, margin_amount) = calculate_margins(new_cost, new_sale);

        let mut set_clauses = vec![
            format!("updated_at = '{}'", now),
            format!("margin_percent = {}", margin_percent),
            format!("margin_amount = {}", margin_amount),
        ];

        if let Some(ref sku) = data.sku {
            set_clauses.push(format!("sku = '{}'", sku.replace('\'', "''")));
        }
        if let Some(ref barcode) = data.barcode {
            set_clauses.push(format!("barcode = '{}'", barcode.replace('\'', "''")));
        }
        if let Some(ref name) = data.name {
            set_clauses.push(format!("name = '{}'", name.replace('\'', "''")));
        }
        if let Some(ref description) = data.description {
            set_clauses.push(format!(
                "description = '{}'",
                description.replace('\'', "''")
            ));
        }
        if let Some(ref category_id) = data.category_id {
            set_clauses.push(format!(
                "category_id = '{}'",
                category_id.replace('\'', "''")
            ));
        }
        if let Some(ref unit_id) = data.unit_id {
            set_clauses.push(format!("unit_id = '{}'", unit_id.replace('\'', "''")));
        }
        if let Some(ref product_type_id) = data.product_type_id {
            set_clauses.push(format!(
                "product_type_id = '{}'",
                product_type_id.replace('\'', "''")
            ));
        }
        if data.cost_price.is_some() {
            set_clauses.push(format!("cost_price = {}", new_cost));
        }
        if data.sale_price.is_some() {
            set_clauses.push(format!("sale_price = {}", new_sale));
            set_clauses.push(format!("unit_price = {}", new_sale));
        }
        if let Some(tax_rate) = data.tax_rate {
            set_clauses.push(format!("tax_rate = {}", tax_rate));
        }
        if let Some(min_stock) = data.min_stock {
            set_clauses.push(format!("min_stock = {}", min_stock));
        }
        if let Some(max_stock) = data.max_stock {
            set_clauses.push(format!("max_stock = {}", max_stock));
        }
        if let Some(ref supplier_reference) = data.supplier_reference {
            set_clauses.push(format!(
                "supplier_reference = '{}'",
                supplier_reference.replace('\'', "''")
            ));
        }
        if let Some(ref image_url) = data.image_url {
            set_clauses.push(format!("image_url = '{}'", image_url.replace('\'', "''")));
        }
        if let Some(has_variants) = data.has_variants {
            set_clauses.push(format!(
                "has_variants = {}",
                if has_variants { 1 } else { 0 }
            ));
        }
        if let Some(track_expiration) = data.track_expiration {
            set_clauses.push(format!(
                "track_expiration = {}",
                if track_expiration { 1 } else { 0 }
            ));
        }

        let query = format!(
            "UPDATE products SET {} WHERE id = '{}' AND tenant_id = '{}'",
            set_clauses.join(", "),
            id.replace('\'', "''"),
            tenant_id.replace('\'', "''")
        );

        conn.execute(&query, [])
            .map_err(|e| format!("Error al actualizar producto: {}", e))?;
    }

    get_product(state, id).await
}

/// Delete (soft) a product
#[tauri::command]
pub async fn delete_product(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE products SET is_active = 0, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
        rusqlite::params![&now, &id, &tenant_id],
    )
    .map_err(|e| format!("Error al eliminar producto: {}", e))?;

    Ok(())
}

/// Restore a product
#[tauri::command]
pub async fn restore_product(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let tenant_id = get_tenant_id(&state)?;
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al acceder a la base de datos")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE products SET is_active = 1, updated_at = ?1 WHERE id = ?2 AND tenant_id = ?3",
        rusqlite::params![&now, &id, &tenant_id],
    )
    .map_err(|e| format!("Error al restaurar producto: {}", e))?;

    Ok(())
}

/// Adjust product stock
#[tauri::command]
pub async fn adjust_stock(
    state: State<'_, AppState>,
    product_id: String,
    quantity: f64,
    reason: Option<String>,
) -> Result<Product, String> {
    let tenant_id = get_tenant_id(&state)?;

    {
        let conn = state
            .db
            .lock()
            .map_err(|_| "Error al acceder a la base de datos")?;
        let now = chrono::Utc::now().to_rfc3339();

        // Update stock
        conn.execute(
            "UPDATE products SET stock_quantity = stock_quantity + ?1, updated_at = ?2 WHERE id = ?3 AND tenant_id = ?4",
            rusqlite::params![quantity, &now, &product_id, &tenant_id],
        )
        .map_err(|e| format!("Error al ajustar stock: {}", e))?;

        // Record movement
        let movement_id = Uuid::new_v4().to_string();
        let movement_type = if quantity >= 0.0 { "ENTRADA" } else { "SALIDA" };

        conn.execute(
            "INSERT INTO inventory_movements (id, tenant_id, product_id, movement_type, quantity, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                &movement_id,
                &tenant_id,
                &product_id,
                movement_type,
                quantity.abs(),
                &reason,
                &now
            ],
        )
        .map_err(|e| format!("Error al registrar movimiento: {}", e))?;
    }

    get_product(state, product_id).await
}

/// Get products with low stock
#[tauri::command]
pub async fn get_low_stock_products(state: State<'_, AppState>) -> Result<Vec<Product>, String> {
    list_products(
        state,
        Some(ProductFilters {
            low_stock: Some(true),
            is_active: Some(true),
            ..Default::default()
        }),
    )
    .await
}
