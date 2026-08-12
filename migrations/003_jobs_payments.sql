-- Atomic invoice payment ledger and printing job workflow.

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'new',
  due_date timestamptz,
  total numeric NOT NULL DEFAULT 0,
  advance_paid numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP FUNCTION IF EXISTS record_customer_payment(uuid, uuid, numeric, text, text, text);

CREATE OR REPLACE FUNCTION record_customer_payment(
  p_customer_id uuid,
  p_sale_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale sales%ROWTYPE;
  v_applied numeric;
  v_credit numeric;
  v_number text;
  v_payment_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id AND customer_id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found for this customer'; END IF;

  v_applied := LEAST(p_amount, GREATEST(v_sale.total - v_sale.paid_amount, 0));
  v_credit := GREATEST(p_amount - v_applied, 0);
  v_number := 'PAY-' || to_char(now(), 'YYYYMMDDHH24MISSMS');

  INSERT INTO customer_payments (payment_number, customer_id, sale_id, payment_date, amount, payment_method, reference_number, notes)
  VALUES (v_number, p_customer_id, p_sale_id, now(), v_applied, p_payment_method, p_reference_number, p_notes)
  RETURNING id INTO v_payment_id;

  IF v_credit > 0 THEN
    INSERT INTO customer_payments (payment_number, customer_id, sale_id, payment_date, amount, payment_method, reference_number, notes)
    VALUES (v_number || '-C', p_customer_id, NULL, now(), v_credit, p_payment_method, p_reference_number, 'Customer credit from overpayment' || COALESCE(': ' || p_notes, ''));
  END IF;

  UPDATE sales
  SET paid_amount = LEAST(total, paid_amount + v_applied),
      payment_status = CASE WHEN LEAST(total, paid_amount + v_applied) >= total THEN 'paid' WHEN LEAST(total, paid_amount + v_applied) > 0 THEN 'partial' ELSE 'unpaid' END,
      updated_at = now()
  WHERE id = p_sale_id;

  RETURN jsonb_build_object('payment_id', v_payment_id, 'applied', v_applied, 'credit', v_credit);
END;
$$;
