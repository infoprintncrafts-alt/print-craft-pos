-- Public deployment hardening: only a signed-in Supabase user can access POS data.
-- Existing broad anon policies from development are replaced below.

DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('customers','products','sales','sale_items','customer_payments','expenses','purchases','purchase_items','supplier_payments','returns','stock_movements','settings','staff','categories','suppliers','orders','order_items','order_status_history')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', item.policyname, item.tablename);
  END LOOP;
END $$;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_authenticated_access ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY products_authenticated_access ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY sales_authenticated_access ON sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY sale_items_authenticated_access ON sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY customer_payments_authenticated_access ON customer_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY expenses_authenticated_access ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY purchases_authenticated_access ON purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY purchase_items_authenticated_access ON purchase_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY supplier_payments_authenticated_access ON supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY returns_authenticated_access ON returns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY stock_movements_authenticated_access ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY settings_authenticated_access ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY staff_authenticated_access ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY categories_authenticated_access ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY suppliers_authenticated_access ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY orders_authenticated_access ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY order_items_authenticated_access ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY order_status_history_authenticated_access ON order_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER VIEW customer_balances SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION record_customer_payment(uuid, uuid, numeric, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION convert_order_to_sale(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION record_supplier_payment(uuid, uuid, numeric, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION record_customer_payment(uuid, uuid, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_order_to_sale(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION record_supplier_payment(uuid, uuid, numeric, text, text) TO authenticated;
