CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'cash',
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE IF EXISTS purchases ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_payments_pos_access ON supplier_payments;
CREATE POLICY supplier_payments_pos_access ON supplier_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
