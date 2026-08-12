-- Bring older customer_payments tables up to the current payment-ledger shape.
ALTER TABLE IF EXISTS customer_payments
  ADD COLUMN IF NOT EXISTS payment_number text;

UPDATE customer_payments
SET payment_number = 'PAY-' || replace(gen_random_uuid()::text, '-', '')
WHERE payment_number IS NULL OR payment_number = '';

ALTER TABLE IF EXISTS customer_payments
  ALTER COLUMN payment_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_payments_payment_number_key
  ON customer_payments(payment_number);
