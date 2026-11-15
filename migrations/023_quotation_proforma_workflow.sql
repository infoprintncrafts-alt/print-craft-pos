-- Store quotations separately from invoices. Saving or editing a quotation
-- never writes to sales, customer_payments, products, or stock_movements.

CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by uuid,
  quote_date timestamptz NOT NULL DEFAULT now(),
  valid_until date,
  gross_subtotal numeric NOT NULL DEFAULT 0 CHECK (gross_subtotal >= 0),
  item_discount numeric NOT NULL DEFAULT 0 CHECK (item_discount >= 0),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  invoice_discount numeric NOT NULL DEFAULT 0 CHECK (invoice_discount >= 0),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'converted', 'cancelled')),
  converted_sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotations_created_at_idx
  ON public.quotations (created_at DESC);
CREATE INDEX IF NOT EXISTS quotations_customer_id_idx
  ON public.quotations (customer_id);
CREATE INDEX IF NOT EXISTS quotation_items_quotation_id_idx
  ON public.quotation_items (quotation_id);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotations_authenticated_access ON public.quotations;
CREATE POLICY quotations_authenticated_access ON public.quotations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quotation_items_authenticated_access ON public.quotation_items;
CREATE POLICY quotation_items_authenticated_access ON public.quotation_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.save_quotation(
  p_quotation_id uuid,
  p_customer_id uuid,
  p_valid_until date,
  p_invoice_discount numeric,
  p_tax numeric,
  p_notes text,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_quotation_id uuid;
  v_quote_number text;
  v_item jsonb;
  v_product_id uuid;
  v_item_name text;
  v_quantity integer;
  v_unit_price numeric;
  v_discount numeric;
  v_line_total numeric;
  v_gross_subtotal numeric := 0;
  v_item_discount numeric := 0;
  v_subtotal numeric;
  v_invoice_discount numeric;
  v_tax numeric;
  v_total numeric;
  v_item_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to save a quotation';
  END IF;
  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers WHERE id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one item to the quotation';
  END IF;

  IF p_quotation_id IS NULL THEN
    v_quote_number := 'QUO-' ||
      to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    INSERT INTO public.quotations (
      quote_number, customer_id, created_by, valid_until, notes
    ) VALUES (
      v_quote_number, p_customer_id, v_user_id, p_valid_until,
      NULLIF(BTRIM(p_notes), '')
    ) RETURNING id INTO v_quotation_id;
  ELSE
    SELECT id, quote_number
      INTO v_quotation_id, v_quote_number
      FROM public.quotations
      WHERE id = p_quotation_id
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Quotation not found';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.quotations
      WHERE id = v_quotation_id AND status = 'open'
    ) THEN
      RAISE EXCEPTION 'Only open quotations can be edited';
    END IF;
    UPDATE public.quotations
      SET customer_id = p_customer_id,
          valid_until = p_valid_until,
          notes = NULLIF(BTRIM(p_notes), ''),
          updated_at = now()
      WHERE id = v_quotation_id;
    DELETE FROM public.quotation_items WHERE quotation_id = v_quotation_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_item_name := BTRIM(COALESCE(v_item->>'item_name', ''));
    v_quantity := COALESCE(NULLIF(v_item->>'quantity', '')::integer, 0);
    v_unit_price := COALESCE(NULLIF(v_item->>'unit_price', '')::numeric, 0);
    v_discount := COALESCE(NULLIF(v_item->>'discount', '')::numeric, 0);
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;

    IF v_item_name = '' THEN
      RAISE EXCEPTION 'Every item needs a description';
    END IF;
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantities must be greater than zero';
    END IF;
    IF v_unit_price < 0 OR v_discount < 0 THEN
      RAISE EXCEPTION 'Prices and discounts cannot be negative';
    END IF;
    IF v_discount > v_quantity * v_unit_price THEN
      RAISE EXCEPTION 'An item discount cannot exceed its line amount';
    END IF;
    IF v_product_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.products WHERE id = v_product_id
    ) THEN
      RAISE EXCEPTION 'One of the selected products no longer exists';
    END IF;

    v_line_total := (v_quantity * v_unit_price) - v_discount;
    v_gross_subtotal := v_gross_subtotal + (v_quantity * v_unit_price);
    v_item_discount := v_item_discount + v_discount;
    v_item_count := v_item_count + 1;

    INSERT INTO public.quotation_items (
      quotation_id, product_id, item_name, quantity, unit_price, discount, total
    ) VALUES (
      v_quotation_id, v_product_id, v_item_name, v_quantity,
      v_unit_price, v_discount, v_line_total
    );
  END LOOP;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Add at least one item to the quotation';
  END IF;

  v_subtotal := v_gross_subtotal - v_item_discount;
  v_invoice_discount := COALESCE(p_invoice_discount, 0);
  v_tax := COALESCE(p_tax, 0);
  IF v_invoice_discount < 0 OR v_tax < 0 THEN
    RAISE EXCEPTION 'Discount and tax cannot be negative';
  END IF;
  IF v_invoice_discount > v_subtotal THEN
    RAISE EXCEPTION 'Invoice discount cannot exceed the subtotal';
  END IF;
  v_total := v_subtotal - v_invoice_discount + v_tax;

  UPDATE public.quotations
    SET gross_subtotal = v_gross_subtotal,
        item_discount = v_item_discount,
        subtotal = v_subtotal,
        invoice_discount = v_invoice_discount,
        tax = v_tax,
        total = v_total,
        updated_at = now()
    WHERE id = v_quotation_id;

  RETURN jsonb_build_object(
    'quotation_id', v_quotation_id,
    'quote_number', v_quote_number,
    'status', 'open'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_quotation(p_quotation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to cancel a quotation';
  END IF;
  SELECT status INTO v_status
    FROM public.quotations
    WHERE id = p_quotation_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;
  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'Only open quotations can be cancelled';
  END IF;
  UPDATE public.quotations
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_quotation_id;
  RETURN jsonb_build_object('quotation_id', p_quotation_id, 'status', 'cancelled');
END;
$function$;

CREATE OR REPLACE FUNCTION public.convert_quotation_to_invoice(
  p_quotation_id uuid,
  p_paid_amount numeric,
  p_payment_method text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_quotation public.quotations%ROWTYPE;
  v_sale_id uuid;
  v_invoice_number text;
  v_paid numeric;
  v_payment_number text;
  v_stock record;
  v_product public.products%ROWTYPE;
  v_new_quantity integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to convert a quotation';
  END IF;
  SELECT * INTO v_quotation
    FROM public.quotations
    WHERE id = p_quotation_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  IF v_quotation.status = 'converted' THEN
    SELECT invoice_number INTO v_invoice_number
      FROM public.sales WHERE id = v_quotation.converted_sale_id;
    IF v_invoice_number IS NULL THEN
      RAISE EXCEPTION 'The linked invoice is no longer available';
    END IF;
    RETURN jsonb_build_object(
      'quotation_id', v_quotation.id,
      'sale_id', v_quotation.converted_sale_id,
      'invoice_number', v_invoice_number,
      'already_converted', true
    );
  END IF;
  IF v_quotation.status <> 'open' THEN
    RAISE EXCEPTION 'Only open quotations can be converted';
  END IF;
  IF v_quotation.valid_until IS NOT NULL AND v_quotation.valid_until < current_date THEN
    RAISE EXCEPTION 'This quotation has expired; extend its validity before converting';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.quotation_items WHERE quotation_id = v_quotation.id
  ) THEN
    RAISE EXCEPTION 'This quotation has no items';
  END IF;

  v_paid := COALESCE(p_paid_amount, 0);
  IF v_paid < 0 OR v_paid > v_quotation.total THEN
    RAISE EXCEPTION 'Payment must be between zero and the invoice total';
  END IF;
  IF v_paid > 0 AND NULLIF(BTRIM(p_payment_method), '') IS NULL THEN
    RAISE EXCEPTION 'Select a payment method';
  END IF;

  v_invoice_number := 'INV-' ||
    to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.sales (
    invoice_number, customer_id, cashier_id, sale_date,
    subtotal, discount, tax, total, paid_amount, payment_status, notes
  ) VALUES (
    v_invoice_number,
    v_quotation.customer_id,
    v_user_id,
    now(),
    v_quotation.subtotal,
    v_quotation.item_discount + v_quotation.invoice_discount,
    v_quotation.tax,
    v_quotation.total,
    v_paid,
    CASE
      WHEN v_quotation.total > 0 AND v_paid >= v_quotation.total THEN 'paid'
      WHEN v_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    'Converted from quotation ' || v_quotation.quote_number ||
      COALESCE(E'\n' || NULLIF(BTRIM(v_quotation.notes), ''), '')
  ) RETURNING id INTO v_sale_id;

  INSERT INTO public.sale_items (
    sale_id, product_id, item_name, quantity, unit_price, discount, total
  )
  SELECT
    v_sale_id, product_id, item_name, quantity, unit_price, discount, total
  FROM public.quotation_items
  WHERE quotation_id = v_quotation.id
  ORDER BY created_at, id;

  -- Lock and update each tracked product only during conversion. Any stock
  -- failure raises inside this transaction and rolls back the invoice too.
  FOR v_stock IN
    SELECT product_id, SUM(quantity)::integer AS quantity
      FROM public.quotation_items
      WHERE quotation_id = v_quotation.id AND product_id IS NOT NULL
      GROUP BY product_id
      ORDER BY product_id
  LOOP
    SELECT * INTO v_product
      FROM public.products
      WHERE id = v_stock.product_id
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A selected product no longer exists';
    END IF;
    IF v_product.track_stock THEN
      IF v_product.stock_quantity < v_stock.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for %: requested %, available %',
          v_product.name, v_stock.quantity, v_product.stock_quantity;
      END IF;
      v_new_quantity := v_product.stock_quantity - v_stock.quantity;
      UPDATE public.products
        SET stock_quantity = v_new_quantity, updated_at = now()
        WHERE id = v_product.id;
      INSERT INTO public.stock_movements (
        product_id, movement_type, quantity_change, resulting_quantity,
        reference_type, reference_id, notes, created_by
      ) VALUES (
        v_product.id, 'sale', -v_stock.quantity, v_new_quantity,
        'sale', v_sale_id,
        'Sale ' || v_invoice_number || ' from quotation ' || v_quotation.quote_number,
        v_user_id
      );
    END IF;
  END LOOP;

  IF v_paid > 0 THEN
    v_payment_number := 'PAY-' ||
      to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    INSERT INTO public.customer_payments (
      payment_number, customer_id, sale_id, received_by,
      payment_date, amount, payment_method, notes
    ) VALUES (
      v_payment_number, v_quotation.customer_id, v_sale_id, v_user_id,
      now(), v_paid, lower(BTRIM(p_payment_method)),
      'Payment on conversion of ' || v_quotation.quote_number
    );
  END IF;

  UPDATE public.quotations
    SET status = 'converted', converted_sale_id = v_sale_id, updated_at = now()
    WHERE id = v_quotation.id;

  RETURN jsonb_build_object(
    'quotation_id', v_quotation.id,
    'sale_id', v_sale_id,
    'invoice_number', v_invoice_number,
    'already_converted', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.save_quotation(uuid, uuid, date, numeric, numeric, text, jsonb)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_quotation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.convert_quotation_to_invoice(uuid, numeric, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quotation(uuid, uuid, date, numeric, numeric, text, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_quotation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_invoice(uuid, numeric, text)
  TO authenticated;
