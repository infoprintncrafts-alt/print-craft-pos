-- POS schema migration for Print & Craft
-- This migration creates the core tables and views used by the application.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text,
  name text NOT NULL,
  phone text,
  whatsapp text,
  email text,
  address text,
  credit_limit numeric,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text,
  product_code text,
  category text,
  item_type text,
  unit text,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  minimum_stock integer NOT NULL DEFAULT 0,
  track_stock boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id uuid,
  sale_date timestamptz NOT NULL DEFAULT now(),
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  received_by uuid,
  payment_date timestamptz NOT NULL DEFAULT now(),
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  reference_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date timestamptz NOT NULL DEFAULT now(),
  category text,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number text NOT NULL UNIQUE,
  supplier_name text NOT NULL,
  purchase_date timestamptz NOT NULL DEFAULT now(),
  total_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_date timestamptz NOT NULL DEFAULT now(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  refund_amount numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  quantity_change integer NOT NULL,
  resulting_quantity integer NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW customer_balances AS
SELECT
  c.id AS customer_id,
  c.customer_code,
  c.name,
  c.phone,
  COALESCE(sales_summary.total_sales, 0)::numeric AS total_sales,
  LEAST(
    COALESCE(sales_summary.total_sales, 0),
    COALESCE(sales_summary.invoice_paid, 0) + COALESCE(credits_summary.unallocated_credit, 0)
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
  SELECT customer_id, SUM(amount)::numeric AS unallocated_credit
  FROM customer_payments
  WHERE customer_id IS NOT NULL
    AND sale_id IS NULL
  GROUP BY customer_id
) credits_summary ON credits_summary.customer_id = c.id;
