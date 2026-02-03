//! Database Migrations

use rusqlite::Connection;

/// Run all pending migrations
pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Create migrations tracking table
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    "#,
    )?;

    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    println!("DEBUG: Current DB Schema Version: {}", current_version);

    // Migration 1: Core tables
    if current_version < 1 {
        conn.execute_batch(
            r#"
            -- Organizations
            CREATE TABLE IF NOT EXISTS organizations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                tax_id TEXT,
                plan TEXT NOT NULL DEFAULT 'starter',
                subscription_expires_at TEXT,
                settings TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Tenants (branches)
            CREATE TABLE IF NOT EXISTS tenants (
                id TEXT PRIMARY KEY,
                org_id TEXT NOT NULL,
                name TEXT NOT NULL,
                hardware_id TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (org_id) REFERENCES organizations(id)
            );
            
            -- Users
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                org_id TEXT NOT NULL,
                tenant_id TEXT,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'operator',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (org_id) REFERENCES organizations(id),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            );
            
            -- Clients
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                code TEXT,
                name TEXT NOT NULL,
                tax_id TEXT,
                tax_type TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                notes TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                synced_at TEXT,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            );
            
            -- Products
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                sku TEXT,
                barcode TEXT,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                unit TEXT DEFAULT 'UND',
                unit_price REAL NOT NULL,
                cost_price REAL,
                tax_rate REAL DEFAULT 16.0,
                stock_quantity REAL DEFAULT 0,
                min_stock REAL DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                synced_at TEXT,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            );
            
            -- Inventory Movements
            CREATE TABLE IF NOT EXISTS inventory_movements (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                movement_type TEXT NOT NULL,
                quantity REAL NOT NULL,
                reference_type TEXT,
                reference_id TEXT,
                notes TEXT,
                created_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
            
            -- Invoices
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                client_id TEXT,
                client_name TEXT NOT NULL,
                client_tax_id TEXT,
                invoice_number TEXT NOT NULL,
                control_number TEXT,
                invoice_date TEXT NOT NULL,
                due_date TEXT,
                status TEXT DEFAULT 'draft',
                currency TEXT DEFAULT 'VES',
                exchange_rate REAL DEFAULT 1.0,
                subtotal REAL DEFAULT 0,
                tax_amount REAL DEFAULT 0,
                exempt_amount REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                total REAL DEFAULT 0,
                prev_hash TEXT,
                hash TEXT,
                notes TEXT,
                created_by TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, invoice_number),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                FOREIGN KEY (client_id) REFERENCES clients(id)
            );
            
            -- Invoice Items
            CREATE TABLE IF NOT EXISTS invoice_items (
                id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                product_id TEXT,
                description TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                tax_rate REAL DEFAULT 16.0,
                discount_percent REAL DEFAULT 0,
                subtotal REAL NOT NULL,
                tax_amount REAL DEFAULT 0,
                total REAL NOT NULL,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
            
            -- Audit Logs
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT,
                user_id TEXT,
                event_type TEXT NOT NULL,
                entity_type TEXT,
                entity_id TEXT,
                details TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Security Metadata
            CREATE TABLE IF NOT EXISTS security_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
            CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
            CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
            CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
        "#,
        )?;

        conn.execute("INSERT INTO schema_migrations (version) VALUES (1)", [])?;
    }

    // Migration 2: Enhanced Inventory System
    if current_version < 2 {
        conn.execute_batch(
            r#"
            -- Categories (hierarchical)
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                parent_id TEXT,
                name TEXT NOT NULL,
                description TEXT,
                sort_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                FOREIGN KEY (parent_id) REFERENCES categories(id)
            );

            -- Units of Measurement
            CREATE TABLE IF NOT EXISTS units (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                name TEXT NOT NULL,
                abbreviation TEXT NOT NULL,
                unit_type TEXT DEFAULT 'unit',
                base_unit_id TEXT,
                conversion_factor REAL DEFAULT 1.0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                FOREIGN KEY (base_unit_id) REFERENCES units(id)
            );

            -- Product Types
            CREATE TABLE IF NOT EXISTS product_types (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                affects_stock INTEGER DEFAULT 1,
                is_system INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            );

            -- Enhanced Products (add new columns to existing table)
            ALTER TABLE products ADD COLUMN category_id TEXT REFERENCES categories(id);
            ALTER TABLE products ADD COLUMN unit_id TEXT REFERENCES units(id);
            ALTER TABLE products ADD COLUMN product_type_id TEXT REFERENCES product_types(id);
            ALTER TABLE products ADD COLUMN sale_price REAL DEFAULT 0;
            ALTER TABLE products ADD COLUMN margin_percent REAL DEFAULT 0;
            ALTER TABLE products ADD COLUMN margin_amount REAL DEFAULT 0;
            ALTER TABLE products ADD COLUMN supplier_reference TEXT;
            ALTER TABLE products ADD COLUMN max_stock REAL DEFAULT 0;
            ALTER TABLE products ADD COLUMN image_url TEXT;
            ALTER TABLE products ADD COLUMN has_variants INTEGER DEFAULT 0;
            ALTER TABLE products ADD COLUMN track_expiration INTEGER DEFAULT 0;
            ALTER TABLE products ADD COLUMN cost_method TEXT DEFAULT 'manual';

            -- Product Variants
            CREATE TABLE IF NOT EXISTS product_variants (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                sku TEXT,
                name TEXT NOT NULL,
                attributes TEXT,
                cost_price REAL DEFAULT 0,
                sale_price REAL DEFAULT 0,
                barcode TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            -- Variant Stock
            CREATE TABLE IF NOT EXISTS variant_stock (
                id TEXT PRIMARY KEY,
                variant_id TEXT NOT NULL,
                quantity REAL DEFAULT 0,
                reserved_quantity REAL DEFAULT 0,
                last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (variant_id) REFERENCES product_variants(id)
            );

            -- Inventory Lots (for expiration tracking)
            CREATE TABLE IF NOT EXISTS inventory_lots (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                variant_id TEXT,
                lot_number TEXT NOT NULL,
                quantity REAL DEFAULT 0,
                cost_price REAL,
                expiration_date TEXT,
                received_date TEXT DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (variant_id) REFERENCES product_variants(id)
            );

            -- Price History
            CREATE TABLE IF NOT EXISTS price_history (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                variant_id TEXT,
                price_type TEXT NOT NULL,
                old_price REAL,
                new_price REAL NOT NULL,
                changed_by TEXT,
                reason TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (variant_id) REFERENCES product_variants(id)
            );

            -- Indexes for inventory
            CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
            CREATE INDEX IF NOT EXISTS idx_units_tenant ON units(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
            CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type_id);
            CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
            CREATE INDEX IF NOT EXISTS idx_lots_product ON inventory_lots(product_id);
            CREATE INDEX IF NOT EXISTS idx_lots_expiration ON inventory_lots(expiration_date);
            CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
        "#,
        )?;

        conn.execute("INSERT INTO schema_migrations (version) VALUES (2)", [])?;
    }

    // Migration 3: Billing Settings
    if current_version < 3 {
        conn.execute_batch(include_str!("migrations/002_billing_settings.sql"))?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (3)", [])?;
    }

    // Migration 4: Price Lists and Discounts
    if current_version < 4 {
        conn.execute_batch(include_str!("migrations/003_price_lists_discounts.sql"))?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (4)", [])?;
    }

    // Migration 5: Billing Invoices and Payments
    if current_version < 5 {
        conn.execute_batch(include_str!("migrations/004_billing_invoices.sql"))?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (5)", [])?;
    }

    // Migration 6: Add Bank Account to Payments
    if current_version < 6 {
        conn.execute_batch(include_str!(
            "migrations/005_add_bank_account_to_payments.sql"
        ))?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (6)", [])?;
    }

    // Migration 7: Add received_amount to payments
    if current_version < 7 {
        conn.execute_batch(include_str!("migrations/006_add_received_amount.sql"))?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (7)", [])?;
    }

    // Migration 8: Add invoice_pattern to company_settings
    if current_version < 8 {
        conn.execute(
            "ALTER TABLE company_settings ADD COLUMN invoice_pattern TEXT DEFAULT '{PREFIX}-{NUMBER}'",
            [],
        )
        .ok(); // Ignore if exists
        conn.execute("INSERT INTO schema_migrations (version) VALUES (8)", [])?;
    }

    Ok(())
}

/// Apply SENIAT compliance triggers
pub fn apply_compliance_triggers(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Prevent UPDATE on audit_logs
    conn.execute_batch(r#"
        DROP TRIGGER IF EXISTS trg_audit_logs_no_update;
        CREATE TRIGGER trg_audit_logs_no_update
        BEFORE UPDATE ON audit_logs
        BEGIN
            SELECT RAISE(ABORT, '⛔ INTEGRITY VIOLATION: Audit logs are immutable');
        END;
        
        DROP TRIGGER IF EXISTS trg_audit_logs_no_delete;
        CREATE TRIGGER trg_audit_logs_no_delete
        BEFORE DELETE ON audit_logs
        BEGIN
            SELECT RAISE(ABORT, '⛔ INTEGRITY VIOLATION: Audit logs cannot be deleted');
        END;
        
        DROP TRIGGER IF EXISTS trg_invoices_no_delete;
        CREATE TRIGGER trg_invoices_no_delete
        BEFORE DELETE ON invoices
        WHEN OLD.status != 'draft'
        BEGIN
            SELECT RAISE(ABORT, '⛔ INTEGRITY VIOLATION: Issued invoices cannot be deleted');
        END;
        
        DROP TRIGGER IF EXISTS trg_invoices_no_modify_hash;
        CREATE TRIGGER trg_invoices_no_modify_hash
        BEFORE UPDATE ON invoices
        WHEN OLD.status != 'draft' AND (OLD.hash != NEW.hash OR OLD.prev_hash != NEW.prev_hash)
        BEGIN
            SELECT RAISE(ABORT, '⛔ INTEGRITY VIOLATION: Invoice hash cannot be modified after issuance');
        END;
    "#)?;

    Ok(())
}
