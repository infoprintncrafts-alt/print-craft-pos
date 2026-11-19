-- Use short, sequential document numbers while keeping existing numbers intact.
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.quotation_number_seq;

DO $seed_sequences$
DECLARE
  v_max bigint;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 5)::bigint), 0)
    INTO v_max
    FROM public.sales
    WHERE invoice_number ~ '^INV-[0-9]{7}$';
  PERFORM setval('public.invoice_number_seq'::regclass, v_max + 1, false);

  SELECT COALESCE(MAX(SUBSTRING(order_number FROM 5)::bigint), 0)
    INTO v_max
    FROM public.orders
    WHERE order_number ~ '^ORD-[0-9]{7}$';
  PERFORM setval('public.order_number_seq'::regclass, v_max + 1, false);

  SELECT COALESCE(MAX(SUBSTRING(quote_number FROM 5)::bigint), 0)
    INTO v_max
    FROM public.quotations
    WHERE quote_number ~ '^QUO-[0-9]{7}$';
  PERFORM setval('public.quotation_number_seq'::regclass, v_max + 1, false);
END;
$seed_sequences$;

CREATE OR REPLACE FUNCTION public.next_document_number(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_prefix text := upper(p_prefix);
  v_sequence regclass;
  v_number bigint;
BEGIN
  CASE v_prefix
    WHEN 'INV' THEN v_sequence := 'public.invoice_number_seq'::regclass;
    WHEN 'ORD' THEN v_sequence := 'public.order_number_seq'::regclass;
    WHEN 'QUO' THEN v_sequence := 'public.quotation_number_seq'::regclass;
    ELSE RAISE EXCEPTION 'Unsupported document number prefix: %', p_prefix;
  END CASE;

  v_number := nextval(v_sequence);
  IF v_number > 9999999 THEN
    RAISE EXCEPTION 'The % document number sequence has reached its seven-digit limit', v_prefix;
  END IF;

  RETURN v_prefix || '-' || lpad(v_number::text, 7, '0');
END;
$function$;

REVOKE ALL ON FUNCTION public.next_document_number(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_document_number(text) TO authenticated, service_role;

-- Update the established RPCs in place so deployed databases use the same
-- number format as fresh installations.
DO $update_number_generators$
DECLARE
  v_function regprocedure;
  v_definition text;
BEGIN
  v_function := to_regprocedure(
    'public.create_order_with_invoice(uuid,text,timestamptz,numeric,jsonb)'
  );
  IF v_function IS NULL THEN
    RAISE EXCEPTION 'create_order_with_invoice function was not found';
  END IF;
  v_definition := pg_get_functiondef(v_function);
  v_definition := replace(replace(v_definition, E'\r\n', E'\n'), E'\r', E'\n');
  IF position('public.next_document_number(''ORD'')' IN v_definition) = 0 THEN
    v_definition := replace(
      v_definition,
      E'v_order_number := ''JOB-'' || to_char(clock_timestamp(), ''YYYYMMDDHH24MISSMS''); v_invoice_number := ''INV-'' || to_char(clock_timestamp(), ''YYYYMMDDHH24MISSMS'');',
      'v_order_number := public.next_document_number(''ORD''); v_invoice_number := public.next_document_number(''INV'');'
    );
    IF position('public.next_document_number(''ORD'')' IN v_definition) = 0 THEN
      RAISE EXCEPTION 'Could not update create_order_with_invoice number generation';
    END IF;
    EXECUTE v_definition;
  END IF;

  v_function := to_regprocedure('public.convert_order_to_sale(uuid)');
  IF v_function IS NULL THEN
    RAISE EXCEPTION 'convert_order_to_sale function was not found';
  END IF;
  v_definition := pg_get_functiondef(v_function);
  v_definition := replace(replace(v_definition, E'\r\n', E'\n'), E'\r', E'\n');
  IF position('public.next_document_number(''INV'')' IN v_definition) = 0 THEN
    v_definition := replace(
      v_definition,
      E'v_invoice := ''INV-'' || to_char(now(), ''YYYYMMDDHH24MISSMS'');',
      'v_invoice := public.next_document_number(''INV'');'
    );
    IF position('public.next_document_number(''INV'')' IN v_definition) = 0 THEN
      RAISE EXCEPTION 'Could not update convert_order_to_sale number generation';
    END IF;
    EXECUTE v_definition;
  END IF;

  v_function := to_regprocedure(
    'public.save_quotation(uuid,uuid,date,numeric,numeric,text,jsonb)'
  );
  IF v_function IS NULL THEN
    RAISE EXCEPTION 'save_quotation function was not found';
  END IF;
  v_definition := pg_get_functiondef(v_function);
  v_definition := replace(replace(v_definition, E'\r\n', E'\n'), E'\r', E'\n');
  IF position('public.next_document_number(''QUO'')' IN v_definition) = 0 THEN
    v_definition := replace(
      v_definition,
      E'v_quote_number := ''QUO-'' ||\n      to_char(clock_timestamp(), ''YYYYMMDDHH24MISSMS'') || ''-'' ||\n      upper(substr(replace(gen_random_uuid()::text, ''-'', ''''), 1, 6));',
      'v_quote_number := public.next_document_number(''QUO'');'
    );
    IF position('public.next_document_number(''QUO'')' IN v_definition) = 0 THEN
      RAISE EXCEPTION 'Could not update save_quotation number generation';
    END IF;
    EXECUTE v_definition;
  END IF;

  v_function := to_regprocedure(
    'public.convert_quotation_to_invoice(uuid,numeric,text)'
  );
  IF v_function IS NULL THEN
    RAISE EXCEPTION 'convert_quotation_to_invoice function was not found';
  END IF;
  v_definition := pg_get_functiondef(v_function);
  v_definition := replace(replace(v_definition, E'\r\n', E'\n'), E'\r', E'\n');
  IF position('public.next_document_number(''INV'')' IN v_definition) = 0 THEN
    v_definition := replace(
      v_definition,
      E'v_invoice_number := ''INV-'' ||\n    to_char(clock_timestamp(), ''YYYYMMDDHH24MISSMS'') || ''-'' ||\n    upper(substr(replace(gen_random_uuid()::text, ''-'', ''''), 1, 8));',
      'v_invoice_number := public.next_document_number(''INV'');'
    );
    IF position('public.next_document_number(''INV'')' IN v_definition) = 0 THEN
      RAISE EXCEPTION 'Could not update convert_quotation_to_invoice number generation';
    END IF;
    EXECUTE v_definition;
  END IF;
END;
$update_number_generators$;
