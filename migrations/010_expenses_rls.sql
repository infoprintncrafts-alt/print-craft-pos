ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expenses_pos_access ON expenses;
CREATE POLICY expenses_pos_access ON expenses
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
