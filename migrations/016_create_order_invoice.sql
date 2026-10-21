-- Saves the job and its invoice as a single transaction.
CREATE OR REPLACE FUNCTION create_order_with_invoice(p_customer_id uuid, p_title text, p_due_date timestamptz, p_advance numeric, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order_id uuid; v_sale_id uuid; v_order_number text; v_invoice_number text; v_total numeric := 0; v_paid numeric; v_item jsonb; v_quantity integer; v_price numeric; v_name text;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Add at least one product or service'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_name := trim(COALESCE(v_item->>'item_name', '')); v_quantity := GREATEST(COALESCE((v_item->>'quantity')::integer, 1), 1); v_price := GREATEST(COALESCE((v_item->>'unit_price')::numeric, 0), 0);
    IF v_name = '' THEN RAISE EXCEPTION 'Every item needs a description'; END IF;
    v_total := v_total + v_quantity * v_price;
  END LOOP;
  v_paid := LEAST(GREATEST(COALESCE(p_advance, 0), 0), v_total);
  v_order_number := 'JOB-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'); v_invoice_number := 'INV-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
  INSERT INTO orders (order_number, customer_id, title, due_date, total, advance_paid) VALUES (v_order_number, p_customer_id, COALESCE(NULLIF(trim(p_title), ''), 'Printing job'), p_due_date, v_total, v_paid) RETURNING id INTO v_order_id;
  INSERT INTO sales (invoice_number, customer_id, subtotal, total, paid_amount, payment_status, notes) VALUES (v_invoice_number, p_customer_id, v_total, v_total, v_paid, CASE WHEN v_paid >= v_total THEN 'paid' WHEN v_paid > 0 THEN 'partial' ELSE 'unpaid' END, 'Created for ' || v_order_number) RETURNING id INTO v_sale_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_name := trim(v_item->>'item_name'); v_quantity := GREATEST(COALESCE((v_item->>'quantity')::integer, 1), 1); v_price := GREATEST(COALESCE((v_item->>'unit_price')::numeric, 0), 0);
    INSERT INTO order_items (order_id, product_id, item_name, quantity, unit_price) VALUES (v_order_id, NULLIF(v_item->>'product_id', '')::uuid, v_name, v_quantity, v_price);
    INSERT INTO sale_items (sale_id, product_id, item_name, quantity, unit_price, total) VALUES (v_sale_id, NULLIF(v_item->>'product_id', '')::uuid, v_name, v_quantity, v_price, v_quantity * v_price);
  END LOOP;
  IF v_paid > 0 THEN INSERT INTO customer_payments (payment_number, customer_id, sale_id, amount, payment_method, notes) VALUES ('PAY-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'), p_customer_id, v_sale_id, v_paid, 'advance', 'Advance for ' || v_order_number); END IF;
  UPDATE orders SET sale_id = v_sale_id WHERE id = v_order_id;
  RETURN jsonb_build_object('order_id', v_order_id, 'sale_id', v_sale_id, 'invoice_number', v_invoice_number);
END; $$;
GRANT EXECUTE ON FUNCTION create_order_with_invoice(uuid, text, timestamptz, numeric, jsonb) TO anon, authenticated;
