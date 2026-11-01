-- Keep customer balances aligned with the amount already recorded on each sale.
-- The production view and the original repo migrations have different output
-- columns, so preserve either supported shape while replacing the calculation.
-- Invoice-linked payments are already reflected in sales.paid_amount. Only
-- unallocated customer_payments credits are applied separately.

DO $migration$
DECLARE
  existing_columns text[];
BEGIN
  SELECT array_agg(column_name ORDER BY ordinal_position)
  INTO existing_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'customer_balances';

  IF existing_columns = ARRAY[
    'customer_id',
    'customer_name',
    'total_sales',
    'total_paid',
    'outstanding_balance'
  ] THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.customer_balances AS
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        COALESCE(sales_summary.total_sales, 0)::numeric AS total_sales,
        LEAST(
          COALESCE(sales_summary.total_sales, 0),
          COALESCE(sales_summary.invoice_paid, 0) +
            COALESCE(credits_summary.unallocated_credit, 0)
        )::numeric AS total_paid,
        GREATEST(
          COALESCE(sales_summary.total_sales, 0) -
            COALESCE(sales_summary.invoice_paid, 0) -
            COALESCE(credits_summary.unallocated_credit, 0),
          0
        )::numeric AS outstanding_balance
      FROM public.customers AS c
      LEFT JOIN (
        SELECT
          customer_id,
          SUM(total)::numeric AS total_sales,
          SUM(LEAST(total, paid_amount))::numeric AS invoice_paid
        FROM public.sales
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) AS sales_summary ON sales_summary.customer_id = c.id
      LEFT JOIN (
        SELECT
          customer_id,
          SUM(amount)::numeric AS unallocated_credit
        FROM public.customer_payments
        WHERE customer_id IS NOT NULL
          AND sale_id IS NULL
        GROUP BY customer_id
      ) AS credits_summary ON credits_summary.customer_id = c.id
    $view$;
  ELSIF existing_columns = ARRAY[
    'customer_id',
    'customer_code',
    'name',
    'phone',
    'total_sales',
    'total_paid',
    'outstanding_balance'
  ] THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.customer_balances AS
      SELECT
        c.id AS customer_id,
        c.customer_code,
        c.name,
        c.phone,
        COALESCE(sales_summary.total_sales, 0)::numeric AS total_sales,
        LEAST(
          COALESCE(sales_summary.total_sales, 0),
          COALESCE(sales_summary.invoice_paid, 0) +
            COALESCE(credits_summary.unallocated_credit, 0)
        )::numeric AS total_paid,
        GREATEST(
          COALESCE(sales_summary.total_sales, 0) -
            COALESCE(sales_summary.invoice_paid, 0) -
            COALESCE(credits_summary.unallocated_credit, 0),
          0
        )::numeric AS outstanding_balance
      FROM public.customers AS c
      LEFT JOIN (
        SELECT
          customer_id,
          SUM(total)::numeric AS total_sales,
          SUM(LEAST(total, paid_amount))::numeric AS invoice_paid
        FROM public.sales
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) AS sales_summary ON sales_summary.customer_id = c.id
      LEFT JOIN (
        SELECT
          customer_id,
          SUM(amount)::numeric AS unallocated_credit
        FROM public.customer_payments
        WHERE customer_id IS NOT NULL
          AND sale_id IS NULL
        GROUP BY customer_id
      ) AS credits_summary ON credits_summary.customer_id = c.id
    $view$;
  ELSE
    RAISE EXCEPTION
      'Unexpected public.customer_balances columns: %',
      existing_columns;
  END IF;
END
$migration$;
