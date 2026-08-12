DROP FUNCTION IF EXISTS convert_order_to_sale(uuid);

CREATE OR REPLACE FUNCTION convert_order_to_sale(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders%ROWTYPE; v_sale_id uuid; v_invoice text; v_total numeric; v_paid numeric;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.sale_id IS NOT NULL THEN RETURN jsonb_build_object('sale_id', v_order.sale_id, 'already_converted', true); END IF;
  v_total := GREATEST(COALESCE(v_order.total, 0), 0);
  v_paid := LEAST(v_total, GREATEST(COALESCE(v_order.advance_paid, 0), 0));
  v_invoice := 'INV-' || to_char(now(), 'YYYYMMDDHH24MISSMS');
  INSERT INTO sales (invoice_number, customer_id, sale_date, subtotal, total, paid_amount, payment_status, notes)
  VALUES (v_invoice, v_order.customer_id, now(), v_total, v_total, v_paid, CASE WHEN v_paid >= v_total THEN 'paid' WHEN v_paid > 0 THEN 'partial' ELSE 'unpaid' END, 'Converted from ' || v_order.order_number)
  RETURNING id INTO v_sale_id;
  INSERT INTO sale_items (sale_id, item_name, quantity, unit_price, total)
  VALUES (v_sale_id, v_order.title, GREATEST(v_order.quantity, 1), CASE WHEN v_order.quantity > 0 THEN v_total / v_order.quantity ELSE v_total END, v_total);
  UPDATE orders SET sale_id = v_sale_id, status = 'delivered', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('sale_id', v_sale_id, 'invoice_number', v_invoice, 'already_converted', false);
END; $$;

GRANT EXECUTE ON FUNCTION convert_order_to_sale(uuid) TO anon, authenticated;
