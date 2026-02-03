-- Migration 7: Multi-Currency Cash Registers
-- Created: 2026-02-03

-- physical cash registers / points of sale
CREATE TABLE IF NOT EXISTS cash_registers (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'closed', -- open, closed
    current_session_id TEXT, -- Optimization to quickly find active session
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- cash register sessions (shifts)
CREATE TABLE IF NOT EXISTS cash_register_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    register_id TEXT NOT NULL,
    user_id TEXT NOT NULL, -- Who opened it
    
    status TEXT NOT NULL DEFAULT 'active', -- active, closed
    
    start_time TEXT NOT NULL,
    end_time TEXT,
    
    -- Opening Counts (Declared)
    opening_amount_usd REAL NOT NULL DEFAULT 0,
    opening_amount_ves REAL NOT NULL DEFAULT 0,
    opening_amount_eur REAL NOT NULL DEFAULT 0,
    opening_exchange_rate_ves REAL NOT NULL DEFAULT 0,
    opening_exchange_rate_eur REAL NOT NULL DEFAULT 0,
    opening_notes TEXT,

    -- Closing Counts (Declared by user)
    closing_amount_usd REAL,
    closing_amount_ves REAL,
    closing_amount_eur REAL,
    closing_notes TEXT,

    -- System Totals (Snapshot at close for reconciliation)
    expected_amount_usd REAL,
    expected_amount_ves REAL,
    expected_amount_eur REAL,
    
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (register_id) REFERENCES cash_registers(id)
);

-- cash movements (drops, payouts, adjustments)
CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    type TEXT NOT NULL, -- deposit, withdrawal
    amount REAL NOT NULL,
    currency TEXT NOT NULL, -- USD, VES, EUR
    exchange_rate REAL NOT NULL DEFAULT 1.0,
    
    reason TEXT,
    reference TEXT,
    
    created_at TEXT NOT NULL,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (session_id) REFERENCES cash_register_sessions(id)
);

-- Link billing payments to sessions
ALTER TABLE billing_payments ADD COLUMN session_id TEXT REFERENCES cash_register_sessions(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant ON cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_register ON cash_register_sessions(register_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON cash_register_sessions(status);
CREATE INDEX IF NOT EXISTS idx_movements_session ON cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON billing_payments(session_id);
