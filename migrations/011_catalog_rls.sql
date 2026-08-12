ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suppliers_pos_access ON suppliers;
CREATE POLICY suppliers_pos_access ON suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_pos_access ON categories;
CREATE POLICY categories_pos_access ON categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_pos_access ON products;
CREATE POLICY products_pos_access ON products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchases_pos_access ON purchases;
CREATE POLICY purchases_pos_access ON purchases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_items_pos_access ON purchase_items;
CREATE POLICY purchase_items_pos_access ON purchase_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
