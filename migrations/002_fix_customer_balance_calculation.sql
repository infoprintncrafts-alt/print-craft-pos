-- Keep customer-level balances consistent with invoice-level balances.
--
-- `sales.paid_amount` is the authoritative amount applied to each invoice.
-- Payments linked to an invoice must not be subtracted again here, otherwise
-- totals can become inconsistent. Only payments with no sale_id are customer
-- credits that can reduce the remaining customer balance.

CREATE OR REPLACE VIEW customer_balances AS
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
FROM customers c
LEFT JOIN (
  SELECT
    customer_id,
    SUM(total)::numeric AS total_sales,
    SUM(LEAST(total, paid_amount))::numeric AS invoice_paid
  FROM sales
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) sales_summary ON sales_summary.customer_id = c.id
LEFT JOIN (
  SELECT
    customer_id,
    SUM(amount)::numeric AS unallocated_credit
  FROM customer_payments
  WHERE customer_id IS NOT NULL
    AND sale_id IS NULL
  GROUP BY customer_id
) credits_summary ON credits_summary.customer_id = c.id;
