-- Migration 5: Billing Invoices and Payments
-- Created: 2026-01-21

-- Billing Invoices
CREATE TABLE IF NOT EXISTS billing_invoices (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_type TEXT NOT NULL, -- quote, invoice, credit_note, debit_note
    status TEXT NOT NULL DEFAULT 'draft', -- draft, issued, paid, partial, cancelled
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_tax_id TEXT,
    client_address TEXT,
    price_list_id TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    exchange_rate REAL NOT NULL DEFAULT 1.0,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    payment_terms TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_total REAL NOT NULL DEFAULT 0,
    tax_total REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(tenant_id, invoice_number),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (price_list_id) REFERENCES price_lists(id)
);

-- Billing Invoice Items
CREATE TABLE IF NOT EXISTS billing_invoice_items (
    id TEXT PRIMARY KEY NOT NULL,
    invoice_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    lot_id TEXT,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_percent REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    FOREIGN KEY (lot_id) REFERENCES inventory_lots(id)
);

-- Billing Payments
CREATE TABLE IF NOT EXISTS billing_payments (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    exchange_rate REAL NOT NULL DEFAULT 1.0,
    payment_method TEXT NOT NULL, -- cash, transfer, card, mobile, check
    reference TEXT,
    payment_date TEXT NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_client ON billing_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_date ON billing_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_items_invoice ON billing_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_invoice ON billing_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_tenant ON billing_payments(tenant_id);
