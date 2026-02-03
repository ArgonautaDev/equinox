-- Migration 4: Price Lists and Discounts
-- Created: 2026-01-21

-- Price Lists
CREATE TABLE IF NOT EXISTS price_lists (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    discount_percent REAL NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Product Prices (specific prices per product in price list)
CREATE TABLE IF NOT EXISTS product_prices (
    id TEXT PRIMARY KEY NOT NULL,
    price_list_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    price REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (price_list_id) REFERENCES price_lists(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- Discounts
CREATE TABLE IF NOT EXISTS discounts (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL, -- percentage, fixed, volume
    value REAL NOT NULL,
    applies_to TEXT NOT NULL, -- product, category, client, payment_method, all
    target_id TEXT,
    min_quantity REAL,
    max_uses INTEGER,
    times_used INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_price_lists_tenant ON price_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_list ON product_prices(price_list_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_discounts_tenant ON discounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discounts_applies_to ON discounts(applies_to, target_id);
