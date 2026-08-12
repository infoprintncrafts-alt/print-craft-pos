ALTER TABLE IF EXISTS purchases DROP CONSTRAINT IF EXISTS purchases_payment_status_check;
ALTER TABLE IF EXISTS purchases
  ADD CONSTRAINT purchases_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'partial', 'unpaid'));
