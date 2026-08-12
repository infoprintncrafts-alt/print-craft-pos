-- Cleanup script to remove all test data before deployment
-- Run this in your Supabase SQL editor
-- This will delete all sales, returns, debts (customer_payments), and invoices

BEGIN;

-- Step 1: Delete customer payments (no cascading dependencies)
DELETE FROM customer_payments;

-- Step 2: Delete returns
DELETE FROM returns;

-- Step 3: Delete expenses
DELETE FROM expenses;

-- Step 4: Delete orders and related data
DELETE FROM order_items;
DELETE FROM order_status_history;
DELETE FROM orders;

-- Step 5: Delete purchases and purchase_items
DELETE FROM purchase_items;
DELETE FROM supplier_payments;
DELETE FROM purchases;

-- Step 6: Delete sales and sale_items (sale_items cascade deletes with sales)
DELETE FROM sales;

-- Step 7: Reset any sequences/counters if needed
-- Uncomment if you have invoice number sequences that need resetting
-- ALTER SEQUENCE invoice_number_seq RESTART WITH 1;

COMMIT;

-- Verify cleanup
SELECT 'Sales' as table_name, COUNT(*) as row_count FROM sales
UNION ALL
SELECT 'Sale Items', COUNT(*) FROM sale_items
UNION ALL
SELECT 'Customer Payments', COUNT(*) FROM customer_payments
UNION ALL
SELECT 'Returns', COUNT(*) FROM returns
UNION ALL
SELECT 'Expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Purchases', COUNT(*) FROM purchases
UNION ALL
SELECT 'Purchase Items', COUNT(*) FROM purchase_items
UNION ALL
SELECT 'Supplier Payments', COUNT(*) FROM supplier_payments;
