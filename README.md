This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database migrations

SQL files in `migrations/` are not applied by Next.js or Vercel deployments. For a database change, run the new migration in the SQL Editor of the Supabase project connected to the deployed app, confirm it succeeds, and verify the affected data afterward. Use a new, unique, increasing migration number for each change. Do not rerun older migrations without checking their contents; some are one-time data changes.

The customer balance view is maintained by `migrations/020_fix_customer_balances_paid_amount.sql`. It treats `sales.paid_amount` as the amount paid on invoices and applies only unallocated customer credits separately. Invoice payments recorded from the Payments page use the atomic database function in `migrations/021_atomic_customer_payment_batch.sql`, so payment-ledger rows and invoice balances cannot be left half-updated.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
