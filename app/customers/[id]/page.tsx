"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  credit_limit: number | null;
  notes: string | null;
  is_active: boolean;
};

type Balance = {
  total_sales: number;
  total_paid: number;
  outstanding_balance: number;
};

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  total: number;
  paid_amount: number;
  payment_status: string;
};

type Payment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  sale_id: string | null;
};

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    if (!customerId) return;

    loadCustomer();
  }, [customerId]);

  async function loadCustomer() {
  setLoading(true);
  setError("");

  try {
    const [customerResult, salesResult, paymentsResult] =
      await Promise.all([
        // =====================================================
        // CUSTOMER
        // =====================================================

        supabase
          .from("customers")
          .select(
            `
              id,
              customer_code,
              name,
              phone,
              whatsapp,
              email,
              address,
              credit_limit,
              notes,
              is_active
            `
          )
          .eq("id", customerId)
          .single(),

        // =====================================================
        // SALES
        // =====================================================

        supabase
          .from("sales")
          .select(
            `
              id,
              invoice_number,
              sale_date,
              total,
              paid_amount,
              payment_status
            `
          )
          .eq("customer_id", customerId)
          .order("sale_date", {
            ascending: false,
          }),

        // =====================================================
        // CUSTOMER PAYMENTS
        // =====================================================

        supabase
          .from("customer_payments")
          .select(
            `
              id,
              payment_date,
              amount,
              payment_method,
              sale_id
            `
          )
          .eq("customer_id", customerId)
          .order("payment_date", {
            ascending: false,
          }),
      ]);

    // =====================================================
    // CUSTOMER
    // =====================================================

    if (customerResult.error) {
      throw new Error(
        `Unable to load customer: ${customerResult.error.message}`
      );
    }

    if (!customerResult.data) {
      throw new Error("Customer not found.");
    }

    setCustomer(
      customerResult.data as Customer
    );

    // =====================================================
    // SALES
    // =====================================================

    if (salesResult.error) {
      throw new Error(
        `Unable to load purchase history: ${salesResult.error.message}`
      );
    }

    const loadedSales =
      (salesResult.data ?? []) as Sale[];

    setSales(loadedSales);

    // =====================================================
    // PAYMENTS
    // =====================================================

    if (paymentsResult.error) {
      throw new Error(
        `Unable to load payment history: ${paymentsResult.error.message}`
      );
    }

    const loadedPayments =
      (paymentsResult.data ?? []) as Payment[];

    setPayments(loadedPayments);

    // =====================================================
    // CUSTOMER BALANCE
    // =====================================================
    //
    // Do NOT use customer_balances here.
    //
    // Calculate the balance directly from the actual
    // sales and customer_payments records.
    //
    // =====================================================

    const totalSales = loadedSales.reduce(
  (sum, sale) => {
    return (
      sum +
      Math.max(
        Number(sale.total || 0),
        0
      )
    );
  },
  0
);

const totalPaid = loadedSales.reduce(
  (sum, sale) => {
    const saleTotal =
      Number(sale.total || 0);

    const salePaid =
      Math.min(
        Number(sale.paid_amount || 0),
        saleTotal
      );

    return sum + salePaid;
  },
  0
);

const outstandingBalance = loadedSales.reduce(
  (sum, sale) => {
    const saleTotal =
      Number(sale.total || 0);

    const salePaid =
      Number(sale.paid_amount || 0);

    const saleBalance =
      Math.max(
        saleTotal - salePaid,
        0
      );

    return sum + saleBalance;
  },
  0
);

setBalance({
  total_sales: totalSales,
  total_paid: totalPaid,
  outstanding_balance: outstandingBalance,
});
  } catch (err) {
    console.error(
      "Load customer profile error:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to load customer."
    );
  } finally {
    setLoading(false);
  }
}

  // =========================================================
  // MONEY / DATE
  // =========================================================

  function money(value: number) {
    return (
      "LKR " +
      Number(value || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // =========================================================
  // LOADING / ERROR
  // =========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-8 py-6 text-center shadow">
          <div className="text-2xl">⏳</div>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Loading customer...
          </p>
        </div>
      </main>
    );
  }

  if (error || !customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="text-5xl">⚠️</div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Customer Not Found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error || "Unable to load customer."}
          </p>

          <Link
            href="/customers"
            className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            ← Back to Customers
          </Link>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-[1000px]">
        {/* BACK LINK */}

        <Link
          href="/customers"
          className="mb-4 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back to Customers
        </Link>

        {/* HEADER */}

        <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {customer.name}
                </h1>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                    customer.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {customer.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {customer.customer_code && (
                <p className="mt-1 text-xs text-slate-400">
                  {customer.customer_code}
                </p>
              )}

              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {customer.phone && <p>📞 {customer.phone}</p>}
                {customer.whatsapp && customer.whatsapp !== customer.phone && (
                  <p>💬 {customer.whatsapp}</p>
                )}
                {customer.email && <p>✉️ {customer.email}</p>}
                {customer.address && <p>📍 {customer.address}</p>}
              </div>

              {customer.notes && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {customer.notes}
                </p>
              )}
            </div>

            <Link
              href={`/sales?customer=${customer.id}`}
              className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              🧾 New Sale
            </Link>
          </div>
        </div>

        {/* BALANCE SUMMARY */}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Purchases
            </p>

            <p className="mt-1 text-xl font-black text-slate-900">
              {money(balance?.total_sales ?? 0)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Paid
            </p>

            <p className="mt-1 text-xl font-black text-green-600">
              {money(balance?.total_paid ?? 0)}
            </p>
          </div>

          <div
            className={`rounded-2xl p-4 shadow-sm ${
              (balance?.outstanding_balance ?? 0) > 0
                ? "bg-orange-50"
                : "bg-white"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Outstanding
            </p>

            <p
              className={`mt-1 text-xl font-black ${
                (balance?.outstanding_balance ?? 0) > 0
                  ? "text-orange-600"
                  : "text-slate-900"
              }`}
            >
              {money(balance?.outstanding_balance ?? 0)}
            </p>

            {customer.credit_limit != null && (
              <p className="mt-1 text-[11px] text-slate-400">
                Credit limit: {money(customer.credit_limit)}
              </p>
            )}
          </div>
        </div>

        {/* PURCHASE HISTORY */}

        <section className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-bold">Purchase History</h2>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
              {sales.length} {sales.length === 1 ? "invoice" : "invoices"}
            </span>
          </div>

          {sales.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No purchases yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Invoice
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Date
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      Total
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      Paid
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      Balance
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sales.map((sale) => {
                    const saleBalance = Math.max(
                      Number(sale.total || 0) - Number(sale.paid_amount || 0),
                      0
                    );

                    return (
                      <tr
                        key={sale.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 align-middle">
                          <Link
                            href={`/sales/${sale.id}`}
                            className="text-sm font-semibold text-slate-900 hover:underline"
                          >
                            {sale.invoice_number}
                          </Link>
                        </td>

                        <td className="px-4 py-3 align-middle text-sm text-slate-600">
                          {formatDate(sale.sale_date)}
                        </td>

                        <td className="px-4 py-3 text-right align-middle text-sm font-semibold text-slate-800">
                          {money(sale.total)}
                        </td>

                        <td className="px-4 py-3 text-right align-middle text-sm text-green-700">
                          {money(sale.paid_amount)}
                        </td>

                        <td className="px-4 py-3 text-right align-middle text-sm font-semibold text-orange-600">
                          {saleBalance > 0 ? money(saleBalance) : "—"}
                        </td>

                        <td className="px-4 py-3 text-center align-middle">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                              sale.payment_status === "paid"
                                ? "bg-green-100 text-green-700"
                                : sale.payment_status === "partial"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {sale.payment_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* PAYMENT HISTORY */}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-bold">Payment History</h2>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
              {payments.length} {payments.length === 1 ? "payment" : "payments"}
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Method
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Against Invoice
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => {
                    const relatedSale = sales.find(
                      (sale) => sale.id === payment.sale_id
                    );

                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-4 py-3 align-middle text-sm text-slate-600">
                          {formatDate(payment.payment_date)}
                        </td>

                        <td className="px-4 py-3 align-middle text-sm capitalize text-slate-600">
                          {payment.payment_method.replace("_", " ")}
                        </td>

                        <td className="px-4 py-3 align-middle text-sm text-slate-600">
                          {relatedSale ? (
                            <Link
                              href={`/sales/${relatedSale.id}`}
                              className="font-semibold text-slate-800 hover:underline"
                            >
                              {relatedSale.invoice_number}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-4 py-3 text-right align-middle text-sm font-bold text-green-700">
                          {money(payment.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}