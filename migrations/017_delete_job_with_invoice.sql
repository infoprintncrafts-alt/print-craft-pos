CREATE OR REPLACE FUNCTION delete_order_with_invoice(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sale_id uuid;
BEGIN
  SELECT sale_id INTO v_sale_id FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF v_sale_id IS NOT NULL THEN
    DELETE FROM customer_payments WHERE sale_id = v_sale_id;
    DELETE FROM sales WHERE id = v_sale_id;
  END IF;
  DELETE FROM orders WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION delete_order_with_invoice(uuid) TO anon, authenticated;
