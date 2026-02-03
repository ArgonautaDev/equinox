-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tax_id TEXT,
    plan TEXT NOT NULL DEFAULT 'starter',
    subscription_expires_at TIMESTAMPTZ,
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants (Branches)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    hardware_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    tenant_id UUID REFERENCES public.tenants(id),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on core tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- Sellers
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    name TEXT NOT NULL,
    code TEXT,
    email TEXT,
    phone TEXT,
    commission_rate DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit TEXT DEFAULT 'UND',
    unit_price DECIMAL(20, 2) NOT NULL,
    cost_price DECIMAL(20, 2),
    tax_rate DECIMAL(5, 2) DEFAULT 16.0,
    product_type TEXT DEFAULT 'sale',
    applies_tax BOOLEAN DEFAULT TRUE,
    stock_quantity DECIMAL(20, 4) DEFAULT 0,
    min_stock DECIMAL(20, 4) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- Inventory Movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    movement_type TEXT NOT NULL,
    quantity DECIMAL(20, 4) NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    client_id UUID REFERENCES public.clients(id),
    client_name TEXT NOT NULL,
    client_tax_id TEXT,
    invoice_number TEXT NOT NULL,
    control_number TEXT,
    invoice_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'draft',
    currency TEXT DEFAULT 'VES',
    exchange_rate DECIMAL(20, 4) DEFAULT 1.0,
    exchange_rate_bs DECIMAL(20, 4) DEFAULT 0,
    subtotal DECIMAL(20, 2) DEFAULT 0,
    tax_amount DECIMAL(20, 2) DEFAULT 0,
    exempt_amount DECIMAL(20, 2) DEFAULT 0,
    discount_amount DECIMAL(20, 2) DEFAULT 0,
    total DECIMAL(20, 2) DEFAULT 0,
    prev_hash TEXT,
    hash TEXT,
    notes TEXT,
    seller_id UUID REFERENCES public.sellers(id),
    payment_condition TEXT DEFAULT 'cash',
    credit_days INTEGER DEFAULT 0,
    delivery_type TEXT DEFAULT 'pickup',
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id),
    product_id UUID REFERENCES public.products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(20, 4) NOT NULL,
    unit_price DECIMAL(20, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 16.0,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    subtotal DECIMAL(20, 2) NOT NULL,
    tax_amount DECIMAL(20, 2) DEFAULT 0,
    total DECIMAL(20, 2) NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id),
    sku TEXT
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id),
    amount DECIMAL(20, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Sequences
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    prefix TEXT DEFAULT 'FAC',
    next_number INTEGER DEFAULT 1,
    pattern TEXT DEFAULT '{PREFIX}-{NUMBER}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT invoice_sequences_tenant_key UNIQUE (tenant_id)
);

-- Enable RLS on all business tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

-- Generic Tenant Isolation Policy
CREATE POLICY "Tenant Isolation" ON public.clients USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant Isolation" ON public.sellers USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant Isolation" ON public.warehouses USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant Isolation" ON public.products USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant Isolation" ON public.inventory_movements USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant Isolation" ON public.invoices USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Tenant Isolation" ON public.invoice_sequences USING (tenant_id = get_auth_tenant_id());

-- Policies for joined tables (via invoice)
CREATE POLICY "Tenant Isolation" ON public.invoice_items
    USING (invoice_id IN (SELECT id FROM public.invoices WHERE tenant_id = get_auth_tenant_id()));

CREATE POLICY "Tenant Isolation" ON public.payments
    USING (invoice_id IN (SELECT id FROM public.invoices WHERE tenant_id = get_auth_tenant_id()));

-- Users policies
CREATE POLICY "Can view own user" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Grant access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
