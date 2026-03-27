-- Migration: Multi-branch support + Employee Schedules
-- Date: 2026-03-27

-- ============================================
-- BRANCHES (SUCURSALES)
-- ============================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Info de la sucursal
    name TEXT NOT NULL,
    code TEXT, -- Código corto para identificar (ej: "TDA-01")
    address TEXT,
    phone TEXT,
    email TEXT,
    
    -- Ubicación
    city TEXT,
    state TEXT,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Configuración
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Horario default
    default_open_time TIME DEFAULT '09:00',
    default_close_time TIME DEFAULT '21:00',
    timezone TEXT DEFAULT 'America/Mexico_City',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para branches
CREATE INDEX IF NOT EXISTS idx_branches_org ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(organization_id, is_active);

-- RLS para branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view branches" ON branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = branches.organization_id
        )
    );

CREATE POLICY "Admins can manage branches" ON branches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
            AND users.organization_id = branches.organization_id
        )
    );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EMPLOYEE SCHEDULES (HORARIOS DE EMPLEADOS)
-- ============================================
CREATE TABLE IF NOT EXISTS employee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL = todas
    
    -- Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    
    -- Horario
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INTEGER DEFAULT 0,
    
    -- Configuración
    is_active BOOLEAN DEFAULT true,
    is_recurring BOOLEAN DEFAULT true, -- Si es horario fijo semanal
    effective_from DATE, -- Fecha desde que aplica
    effective_until DATE, -- Fecha hasta que aplica (NULL = indefinido)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, day_of_week, branch_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_schedules_user ON employee_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_org ON employee_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedules_branch ON employee_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON employee_schedules(day_of_week);

-- RLS para schedules
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view schedules" ON employee_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = employee_schedules.organization_id
        )
    );

CREATE POLICY "Admins can manage all schedules" ON employee_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
            AND users.organization_id = employee_schedules.organization_id
        )
    );

CREATE POLICY "Users can manage own schedules" ON employee_schedules
    FOR UPDATE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON employee_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADD BRANCH TO USERS (migración users existente)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'default_branch_id'
    ) THEN
        ALTER TABLE users ADD COLUMN default_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add branch to retail_sales
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'retail_sales' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE retail_sales ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add branch to retail_products (inventario por sucursal)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'retail_products' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE retail_products ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
        
        -- Agregar índice para consulta de inventario por sucursal
        CREATE INDEX IF NOT EXISTS idx_products_branch ON retail_products(branch_id);
    END IF;
END $$;

-- ============================================
-- CREATE DEFAULT BRANCH for existing orgs
-- ============================================
INSERT INTO branches (organization_id, name, code, is_main, default_open_time, default_close_time)
SELECT 
    id, 
    COALESCE(name, 'Sucursal Principal'), 
    'MAIN-01',
    true,
    '09:00',
    '21:00'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM branches WHERE branches.organization_id = organizations.id
);

-- ============================================
-- TIME OFF / VACACIONES
-- ============================================
CREATE TABLE IF NOT EXISTS employee_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    
    -- Tipo de ausencia
    type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
    reason TEXT,
    
    -- Fechas
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Estatus
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_off_user ON employee_time_off(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_dates ON employee_time_off(start_date, end_date);

ALTER TABLE employee_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view time off" ON employee_time_off
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = employee_time_off.organization_id
        )
    );

CREATE POLICY "Admins can manage time off" ON employee_time_off
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
            AND users.organization_id = employee_time_off.organization_id
        )
    );
