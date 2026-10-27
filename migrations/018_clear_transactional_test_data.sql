-- One-time test-data cleanup. Intentionally preserves products, inventory/stock
-- movements, customers, suppliers, staff, settings, and catalog configuration.
BEGIN;

DELETE FROM customer_payments;
DELETE FROM supplier_payments;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM order_status_history;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM returns;

COMMIT;
