-- Record one customer payment and all invoice allocations atomically.
-- The ledger entries and sales.paid_amount updates either all commit or all
-- roll back, so a recorded invoice payment cannot leave a stale balance.

CREATE OR REPLACE FUNCTION public.record_customer_payment_batch(
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_allocations jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_requested numeric := 0;
  v_applied_total numeric := 0;
  v_credit numeric := 0;
  v_processed integer := 0;
  v_allocation record;
  v_applied numeric;
  v_payment_number text;
  v_received_by uuid := auth.uid();
BEGIN
  IF v_received_by IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to record a payment';
  END IF;
  IF p_customer_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM customers WHERE id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF NULLIF(BTRIM(p_payment_method), '') IS NULL THEN
    RAISE EXCEPTION 'Payment method is required';
  END IF;
  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'Payment allocations must be an array';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_allocations) AS item(sale_id uuid, amount numeric)
    WHERE item.sale_id IS NULL OR item.amount IS NULL OR item.amount <= 0
  ) THEN
    RAISE EXCEPTION 'Each invoice allocation must have a sale and a positive amount';
  END IF;
  IF EXISTS (
    SELECT item.sale_id
    FROM jsonb_to_recordset(p_allocations) AS item(sale_id uuid, amount numeric)
    GROUP BY item.sale_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'An invoice can only appear once in the allocations';
  END IF;

  SELECT COALESCE(SUM(item.amount), 0)
  INTO v_requested
  FROM jsonb_to_recordset(p_allocations) AS item(sale_id uuid, amount numeric);

  IF v_requested > p_amount THEN
    RAISE EXCEPTION 'Invoice allocations cannot exceed the payment amount';
  END IF;

  v_credit := p_amount - v_requested;

  FOR v_allocation IN
    SELECT
      s.id AS sale_id,
      s.total,
      s.paid_amount,
      item.amount AS requested_amount
    FROM jsonb_to_recordset(p_allocations) AS item(sale_id uuid, amount numeric)
    JOIN sales AS s
      ON s.id = item.sale_id
     AND s.customer_id = p_customer_id
    ORDER BY s.id
    FOR UPDATE OF s
  LOOP
    v_processed := v_processed + 1;
    v_applied := LEAST(
      v_allocation.requested_amount,
      GREATEST(v_allocation.total - v_allocation.paid_amount, 0)
    );
    v_credit := v_credit + v_allocation.requested_amount - v_applied;

    IF v_applied > 0 THEN
      v_payment_number := 'PAY-' ||
        TO_CHAR(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' ||
        SUBSTRING(gen_random_uuid()::text, 1, 8);

      INSERT INTO customer_payments (
        payment_number,
        customer_id,
        sale_id,
        received_by,
        payment_date,
        amount,
        payment_method,
        reference_number,
        notes
      ) VALUES (
        v_payment_number,
        p_customer_id,
        v_allocation.sale_id,
        v_received_by,
        now(),
        v_applied,
        p_payment_method,
        p_reference_number,
        p_notes
      );

      UPDATE sales
      SET paid_amount = LEAST(total, paid_amount + v_applied),
          payment_status = CASE
            WHEN LEAST(total, paid_amount + v_applied) >= total THEN 'paid'
            WHEN LEAST(total, paid_amount + v_applied) > 0 THEN 'partial'
            ELSE 'unpaid'
          END,
          updated_at = now()
      WHERE id = v_allocation.sale_id;

      v_applied_total := v_applied_total + v_applied;
    END IF;
  END LOOP;

  IF v_processed <> jsonb_array_length(p_allocations) THEN
    RAISE EXCEPTION 'One or more invoices were not found for this customer';
  END IF;

  IF v_credit > 0 THEN
    v_payment_number := 'PAY-' ||
      TO_CHAR(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' ||
      SUBSTRING(gen_random_uuid()::text, 1, 8);

    INSERT INTO customer_payments (
      payment_number,
      customer_id,
      sale_id,
      received_by,
      payment_date,
      amount,
      payment_method,
      reference_number,
      notes
    ) VALUES (
      v_payment_number,
      p_customer_id,
      NULL,
      v_received_by,
      now(),
      v_credit,
      p_payment_method,
      p_reference_number,
      COALESCE(NULLIF(BTRIM(p_notes), ''), 'Customer credit')
    );
  END IF;

  RETURN jsonb_build_object(
    'applied', v_applied_total,
    'credit', v_credit,
    'allocation_count', v_processed
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_customer_payment_batch(
  uuid, numeric, text, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_payment_batch(
  uuid, numeric, text, text, text, jsonb
) TO authenticated;
