-- Migration: Add billing settings tables
-- Created: 2026-01-21

-- Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    legal_id TEXT NOT NULL, -- RIF / Tax ID
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_path TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'FAC',
    invoice_counter INTEGER NOT NULL DEFAULT 0,
    default_currency TEXT NOT NULL DEFAULT 'USD',
    legal_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT NOT NULL, -- chęcking, savings
    currency TEXT NOT NULL DEFAULT 'USD',
    is_default INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Tax Settings Table
CREATE TABLE IF NOT EXISTS tax_settings (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL, -- IVA, IGTF, ISR
    rate REAL NOT NULL, -- 16.0 for 16%
    applies_to TEXT NOT NULL, -- all, products, services, foreign_currency
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_settings_tenant ON company_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_tenant ON tax_settings(tenant_id);
