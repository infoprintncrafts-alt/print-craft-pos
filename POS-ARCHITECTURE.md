# Print & Craft POS Architecture

This document defines the current application structure, the target POS architecture, and the implementation plan for the Print & Craft POS system.

## Current working baseline
The current app already includes:
- `/` — Dashboard
- `/sales` — Sales page
- `/sales/[id]` — Existing sale/invoice page
- `/sales/invoice/[id]` — Invoice preview page
- `/customers` — Customer list
- `/customers/[id]` — Customer profile
- `/customers/debts` — Customer debt summary
- `/products` — Product list
- `/payments` — Payment entry
- `/payment-history` — Payment history
- `/invoices/[id]` — Invoice detail
- `/payment-receipt/[id]` — Payment receipt
- `/customer-payments` — Customer payment flow

## Target module breakdown
1. Dashboard
2. Sales
3. Invoices
4. Customers
5. Products
6. Inventory
7. Purchases
8. Payments
9. Expenses
10. Returns
11. Reports
12. Staff / Settings

## Recommended app route structure
```
/app
  /dashboard
  /sales
    /history
    /[id]
    /invoice/[id]
  /customers
    /[id]
    /debts
  /products
  /inventory
  /purchases
  /payments
  /expenses
  /returns
  /reports
  /staff
  /settings
```

## Data model overview
### Core entities
- `customers`
- `products`
- `categories`
- `sales`
- `sale_items`
- `customer_payments`
- `purchases`
- `purchase_items`
- `stock_movements`
- `expenses`
- `returns`
- `settings`
- `users`

### Relationships
- `customers` → `sales` → `sale_items`
- `sales` → `customer_payments`
- `products` → `sale_items`
- `products` → `purchase_items`
- `products` → `stock_movements`

## Immediate plan
### Phase 1 — Stabilize core POS
- Freeze current Sales + Invoice system
- Keep existing invoice / payment flow stable
- Fix any outstanding debt/payment calculations
- Create skeleton pages for new modules
- Document architecture and route plan

### Phase 2 — Customer and payment management
- Add customer profile / history enhancements
- Add credit/debt reporting
- Improve payment recording and payment methods

### Phase 3 — Product and inventory management
- Add product categories and inventory tracking
- Add stock movement and low-stock alerts
- Add purchase entry and supplier support

### Phase 4 — Financial reporting
- Add expenses, profit/loss, and reports
- Add staff roles and settings

## Notes
- The current application is the working foundation. New pages should integrate with existing flows rather than replace them immediately.
- This repo is using Next.js App Router and Supabase.
- The first deliverable is the skeleton and architecture documentation. After that, build features in phases.
