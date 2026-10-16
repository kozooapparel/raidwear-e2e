-- ===========================================
-- SKEMA DATABASE SUPABASE - ERP KOZO KPK
-- Jersey Convection Management System
-- ===========================================

-- =====================
-- 1. TABEL USERS (Profiles)
-- Role: Owner & Admin
-- =====================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk profiles
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- =====================
-- 2. TABEL CUSTOMERS (CRM Sederhana)
-- Fields: Name, Phone (unique untuk auto-recognize)
-- =====================
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE, -- Unique untuk auto-recognize repeat customer
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_name ON public.customers(name);

-- =====================
-- 3. TABEL ORDERS
-- 10-Stage Kanban + Order Data + Gatekeeper System
-- =====================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    
    -- Order Data (Spesifikasi Section 4.B)
    total_quantity INT NOT NULL CHECK (total_quantity > 0), -- Total Pcs
    order_description TEXT, -- Flexible description text area
    mockup_url TEXT, -- URL gambar mockup dari Supabase Storage
    deadline DATE,
    
    -- Kanban Stage (10 stages, sama dengan migration 20260829091920_sync_stage_constraint_to_ui.sql)
    stage TEXT NOT NULL DEFAULT 'customer_dp_desain' CHECK (stage IN (
        'customer_dp_desain',   -- 1. Customer DP Desain
        'proses_desain',        -- 2. Proses Desain
        'dp_produksi',          -- 3. DP Produksi (Gatekeeper - 50%)
        'proses_layout',        -- 4. Proses Layout
        'antrean_produksi',     -- 5. Antrean Produksi
        'print_press',          -- 6. Print & Press
        'cutting_jahit',        -- 7. Cutting & Jahit (Bottleneck monitoring >3 hari)
        'packing',              -- 8. Packing
        'pelunasan',            -- 9. Pelunasan (Gatekeeper - Full payment)
        'pengiriman'            -- 10. Pengiriman
    )),
    
    -- Payment Fields (Gatekeeper System)
    dp_desain_amount NUMERIC(12,2) DEFAULT 0,
    dp_desain_verified BOOLEAN DEFAULT FALSE,
    dp_desain_proof_url TEXT,
    dp_desain_verified_at TIMESTAMPTZ,
    dp_desain_verified_by UUID REFERENCES public.profiles(id),
    
    dp_produksi_amount NUMERIC(12,2) DEFAULT 0, -- 50% production deposit
    dp_produksi_verified BOOLEAN DEFAULT FALSE,
    dp_produksi_proof_url TEXT,
    dp_produksi_verified_at TIMESTAMPTZ,
    dp_produksi_verified_by UUID REFERENCES public.profiles(id),
    
    pelunasan_amount NUMERIC(12,2) DEFAULT 0, -- Full payment
    pelunasan_verified BOOLEAN DEFAULT FALSE,
    pelunasan_proof_url TEXT,
    pelunasan_verified_at TIMESTAMPTZ,
    pelunasan_verified_by UUID REFERENCES public.profiles(id),
    
    -- Shipping (Stage 11 - No. Resi)
    tracking_number TEXT,
    shipped_at TIMESTAMPTZ,
    
    -- Bottleneck Tracking
    stage_entered_at TIMESTAMPTZ DEFAULT NOW(), -- Untuk tracking >3 hari di Cutting & Jahit
    
    -- Audit
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_stage ON public.orders(stage);
CREATE INDEX idx_orders_deadline ON public.orders(deadline);
CREATE INDEX idx_orders_stage_entered_at ON public.orders(stage_entered_at);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

-- =====================
-- 4. FUNCTIONS & TRIGGERS
-- =====================

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function untuk update stage_entered_at saat stage berubah
CREATE OR REPLACE FUNCTION public.handle_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        NEW.stage_entered_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function untuk auto-create profile setelah user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk profiles
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger untuk customers
CREATE TRIGGER on_customers_updated
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger untuk orders - updated_at
CREATE TRIGGER on_orders_updated
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger untuk orders - stage_entered_at
CREATE TRIGGER on_orders_stage_changed
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_stage_change();

-- Trigger untuk auto-create profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies untuk profiles
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Policies untuk customers (Full CRUD untuk authenticated users)
CREATE POLICY "Authenticated users can view customers"
    ON public.customers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create customers"
    ON public.customers FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers"
    ON public.customers FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete customers"
    ON public.customers FOR DELETE
    USING (auth.role() = 'authenticated');

-- Policies untuk orders (Full CRUD untuk authenticated users)
CREATE POLICY "Authenticated users can view orders"
    ON public.orders FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update orders"
    ON public.orders FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete orders"
    ON public.orders FOR DELETE
    USING (auth.role() = 'authenticated');

-- =====================
-- 6. VIEWS (Dashboard Metrics Helper)
-- Isi di bawah ini mengikuti migration 20260918010000_fix_dashboard_bottleneck_stage.sql:
-- stage bottleneck adalah `cutting_jahit`, bukan lagi `jahit`.
-- =====================

-- View untuk dashboard metrics
CREATE VIEW public.dashboard_metrics AS
SELECT
    COUNT(*) FILTER (WHERE stage != 'pengiriman') AS total_active_orders,
    COUNT(*) FILTER (WHERE NOT pelunasan_verified) AS total_unpaid_orders,
    COALESCE(SUM(dp_desain_amount + dp_produksi_amount + pelunasan_amount) FILTER (WHERE NOT pelunasan_verified), 0) AS total_receivables,
    COUNT(*) FILTER (WHERE stage = 'cutting_jahit' AND stage_entered_at < NOW() - INTERVAL '3 days') AS bottleneck_count
FROM public.orders;

-- View untuk bottleneck orders (di Cutting & Jahit > 3 hari)
CREATE VIEW public.bottleneck_orders AS
SELECT 
    o.*,
    c.name AS customer_name,
    c.phone AS customer_phone,
    EXTRACT(DAY FROM NOW() - o.stage_entered_at) AS days_in_stage
FROM public.orders o
JOIN public.customers c ON o.customer_id = c.id
WHERE o.stage = 'cutting_jahit' 
AND o.stage_entered_at < NOW() - INTERVAL '3 days';

-- =====================
-- SCHEMA COMPLETE!
-- =====================
