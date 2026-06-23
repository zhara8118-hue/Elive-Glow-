-- ============================================================
-- Elive Glow Salon - Complete Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branches (name, location) VALUES
  ('Dubai – Al Faris Mall Branch', 'Al Faris Mall, Dubai'),
  ('Sharjah – Tilal City Branch', 'Tilal City, Sharjah');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager')),
  branch_id UUID REFERENCES branches(id),
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('invited', 'active', 'inactive')),
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STAFF MEMBERS
-- ============================================================
CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  role TEXT DEFAULT 'stylist',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO expense_categories (name, is_custom) VALUES
  ('Products & Supplies', false),
  ('Salaries', false),
  ('Rent & Utilities', false),
  ('Marketing', false),
  ('Equipment', false);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_number TEXT,
  first_visit DATE,
  last_visit DATE,
  visit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALE TRANSACTIONS
-- ============================================================
CREATE TABLE sale_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('new', 'returning')),
  service_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'card')),
  staff_id UUID REFERENCES staff_members(id),
  sale_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_modified BOOLEAN DEFAULT false,
  modification_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  service TEXT NOT NULL,
  staff_id UUID REFERENCES staff_members(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'confirmed', 'completed', 'cancelled', 'past')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  branch_id UUID REFERENCES branches(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICES (quick-select list, no fixed prices)
-- ============================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO services (name) VALUES
  ('Haircut'),
  ('Hair Color'),
  ('Highlights'),
  ('Blowout'),
  ('Keratin Treatment'),
  ('Manicure'),
  ('Pedicure'),
  ('Facial'),
  ('Eyebrow Threading'),
  ('Waxing'),
  ('Massage'),
  ('Makeup');

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get user branch
CREATE OR REPLACE FUNCTION get_user_branch(user_id UUID)
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- BRANCHES: Everyone can read
CREATE POLICY "branches_read" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_owner_all" ON branches FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');

-- PROFILES: Users see their own; owners see all
CREATE POLICY "profiles_own" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_role(auth.uid()) = 'owner');
CREATE POLICY "profiles_owner_manage" ON profiles FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- STAFF: Owner sees all, manager sees own branch
CREATE POLICY "staff_read" ON staff_members FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "staff_owner_all" ON staff_members FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "staff_manager_insert" ON staff_members FOR INSERT TO authenticated
  WITH CHECK (branch_id = get_user_branch(auth.uid()));

-- EXPENSE CATEGORIES: All can read
CREATE POLICY "categories_read" ON expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_owner_manage" ON expense_categories FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');

-- CUSTOMERS: Branch-scoped
CREATE POLICY "customers_read" ON customers FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "customers_write" ON customers FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "customers_delete" ON customers FOR DELETE TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );

-- SALES: Branch-scoped read/insert; manager one-time edit; owner can delete
CREATE POLICY "sales_read" ON sale_transactions FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "sales_insert" ON sale_transactions FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "sales_update" ON sale_transactions FOR UPDATE TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    (branch_id = get_user_branch(auth.uid()) AND is_modified = false)
  );
CREATE POLICY "sales_delete" ON sale_transactions FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');

-- EXPENSES: Branch-scoped
CREATE POLICY "expenses_read" ON expenses FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "expenses_write" ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');

-- APPOINTMENTS: Branch-scoped
CREATE POLICY "appointments_read" ON appointments FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );
CREATE POLICY "appointments_write" ON appointments FOR ALL TO authenticated
  USING (
    get_user_role(auth.uid()) = 'owner' OR
    branch_id = get_user_branch(auth.uid())
  );

-- AUDIT LOGS: Owner only
CREATE POLICY "audit_owner_only" ON audit_logs FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');
CREATE POLICY "audit_insert_all" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- SERVICES: All read; owner manage
CREATE POLICY "services_read" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_owner_manage" ON services FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');

-- ============================================================
-- FUNCTIONS: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sale_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager'),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKET for profile/staff photos
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "avatar_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatar_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatar_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
