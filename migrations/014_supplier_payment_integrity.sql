-- Record supplier payments atomically and prevent payments beyond a purchase balance.
ALTER TABLE IF EXISTS purchases
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;

DROP FUNCTION IF EXISTS record_supplier_payment(uuid, uuid, numeric, text, text);

CREATE OR REPLACE FUNCTION record_supplier_payment(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase purchases%ROWTYPE;
  v_remaining numeric;
  v_paid numeric;
  v_status text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT * INTO v_purchase FROM purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase not found'; END IF;

  v_remaining := GREATEST(COALESCE(v_purchase.total_amount, 0) - COALESCE(v_purchase.paid_amount, 0), 0);
  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Payment exceeds the remaining supplier balance of %', v_remaining;
  END IF;

  v_paid := COALESCE(v_purchase.paid_amount, 0) + p_amount;
  v_status := CASE WHEN v_paid >= v_purchase.total_amount THEN 'paid' WHEN v_paid > 0 THEN 'partial' ELSE 'pending' END;

  INSERT INTO supplier_payments (purchase_id, supplier_id, payment_date, amount, payment_method, reference)
  VALUES (p_purchase_id, COALESCE(p_supplier_id, v_purchase.supplier_id), now(), p_amount, p_payment_method, p_reference);

  UPDATE purchases
  SET paid_amount = v_paid, payment_status = v_status
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object('paid_amount', v_paid, 'remaining_balance', GREATEST(v_purchase.total_amount - v_paid, 0), 'payment_status', v_status);
END;
$$;

GRANT EXECUTE ON FUNCTION record_supplier_payment(uuid, uuid, numeric, text, text) TO anon, authenticated;
