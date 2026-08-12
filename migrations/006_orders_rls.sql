-- The current POS client uses the Supabase publishable key directly.
-- Allow the app session to manage operational job records, matching the
-- existing client-side CRUD pages for sales, products and expenses.
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_pos_access ON orders;
CREATE POLICY orders_pos_access ON orders
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS order_items_pos_access ON order_items;
CREATE POLICY order_items_pos_access ON order_items
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS order_status_history_pos_access ON order_status_history;
CREATE POLICY order_status_history_pos_access ON order_status_history
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
