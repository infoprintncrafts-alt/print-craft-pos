ALTER TABLE IF EXISTS expenses ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS category_id uuid;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS low_stock_level integer;
ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS supplier_name text;

ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE IF EXISTS suppliers ALTER COLUMN name DROP NOT NULL;

CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), return_date timestamptz NOT NULL DEFAULT now(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL, product_name text,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL, quantity integer NOT NULL DEFAULT 1,
  refund_amount numeric NOT NULL DEFAULT 0, reason text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'cashier', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS returns_pos_access ON returns;
CREATE POLICY returns_pos_access ON returns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_pos_access ON staff;
CREATE POLICY staff_pos_access ON staff FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_pos_access ON settings;
CREATE POLICY settings_pos_access ON settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
