"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: string;
  customer_id: string | null;
  sale_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  received_by: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  customer_code: string | null;
  phone: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
};

type PaymentRow = Payment & {
  customer: Customer | null;
  sale: Sale | null;
};

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You are not logged in.");
      }

      const { data, error } = await supabase
        .from("customer_payments")
        .select(`
          id,
          customer_id,
          sale_id,
          payment_date,
          amount,
          payment_method,
          reference_number,
          notes,
          received_by,
          created_at,
          customers (
            id,
            name,
            customer_code,
            phone
          ),
          sales (
            id,
            invoice_number
          )
        `)
        .order("payment_date", {
          ascending: false,
        });

      if (error) {
        throw new Error(
          `Unable to load payment history: ${error.message}`
        );
      }

      const rows: PaymentRow[] = (data || []).map(
        (payment: any) => ({
          ...payment,

          customer: Array.isArray(payment.customers)
            ? payment.customers[0] || null
            : payment.customers || null,

          sale: Array.isArray(payment.sales)
            ? payment.sales[0] || null
            : payment.sales || null,
        })
      );

      setPayments(rows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment history."
      );
    } finally {
      setLoading(false);
    }
  }

  function money(value: number) {
    return `LKR ${Number(value || 0).toLocaleString(
      "en-LK",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  const filteredPayments = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    return payments.filter((payment) => {
      if (query) {
        const customerName =
          payment.customer?.name || "";

        const customerCode =
          payment.customer?.customer_code || "";

        const phone =
          payment.customer?.phone || "";

        const invoice =
          payment.sale?.invoice_number || "";

        const reference =
          payment.reference_number || "";

        const matchesSearch =
          customerName
            .toLowerCase()
            .includes(query) ||
          customerCode
            .toLowerCase()
            .includes(query) ||
          phone
            .toLowerCase()
            .includes(query) ||
          invoice
            .toLowerCase()
            .includes(query) ||
          reference
            .toLowerCase()
            .includes(query);

        if (!matchesSearch) {
          return false;
        }
      }

      if (
        paymentMethod !== "all" &&
        payment.payment_method !== paymentMethod
      ) {
        return false;
      }

      if (dateFrom) {
        const paymentDate = new Date(
          payment.payment_date
        );

        const fromDate = new Date(
          `${dateFrom}T00:00:00`
        );

        if (paymentDate < fromDate) {
          return false;
        }
      }

      if (dateTo) {
        const paymentDate = new Date(
          payment.payment_date
        );

        const toDate = new Date(
          `${dateTo}T23:59:59`
        );

        if (paymentDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [
    payments,
    search,
    paymentMethod,
    dateFrom,
    dateTo,
  ]);

  const totalReceived =
    filteredPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const cashTotal =
    filteredPayments
      .filter(
        (payment) =>
          payment.payment_method === "cash"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

  const bankTotal =
    filteredPayments
      .filter(
        (payment) =>
          payment.payment_method ===
          "bank_transfer"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

  const cardTotal =
    filteredPayments
      .filter(
        (payment) =>
          payment.payment_method === "card"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

  function clearFilters() {
    setSearch("");
    setPaymentMethod("all");
    setDateFrom("");
    setDateTo("");
  }

  function paymentMethodLabel(method: string) {
    switch (method) {
      case "cash":
        return "Cash";

      case "bank_transfer":
        return "Bank Transfer";

      case "card":
        return "Card";

      case "other":
        return "Other";

      default:
        return method;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">

        <div className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">

          <div>

            <div className="flex items-center gap-2 text-xs text-slate-400">

              <Link
                href="/"
                className="hover:text-blue-600"
              >
                Dashboard
              </Link>

              <span>›</span>

              <span className="text-slate-500">
                Payment History
              </span>

            </div>

            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Payment History
            </h1>

          </div>

          <div className="flex items-center gap-2">

            <Link
              href="/customer-payments"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Customer Payments
            </Link>

            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Dashboard
            </Link>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Total Received
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {money(totalReceived)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {filteredPayments.length} payment
              {filteredPayments.length !== 1
                ? "s"
                : ""}
            </p>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Cash
            </p>

            <p className="mt-2 text-2xl font-black text-green-600">
              {money(cashTotal)}
            </p>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Bank Transfer
            </p>

            <p className="mt-2 text-2xl font-black text-blue-600">
              {money(bankTotal)}
            </p>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Card
            </p>

            <p className="mt-2 text-2xl font-black text-purple-600">
              {money(cardTotal)}
            </p>

          </div>

        </div>

        {/* FILTERS */}

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_170px_170px_auto]">

            <div>

              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Customer, invoice, phone..."
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <div>

              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Method
              </label>

              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value
                  )
                }
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              >

                <option value="all">
                  All Methods
                </option>

                <option value="cash">
                  Cash
                </option>

                <option value="bank_transfer">
                  Bank Transfer
                </option>

                <option value="card">
                  Card
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </div>

            <div>

              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                From
              </label>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) =>
                  setDateFrom(
                    e.target.value
                  )
                }
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />

            </div>

            <div>

              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                To
              </label>

              <input
                type="date"
                value={dateTo}
                onChange={(e) =>
                  setDateTo(
                    e.target.value
                  )
                }
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />

            </div>

            <div className="flex items-end">

              <button
                type="button"
                onClick={clearFilters}
                className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>

            </div>

          </div>

        </section>

        {/* PAYMENT TABLE */}

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">

            <h2 className="text-sm font-bold text-slate-900">
              Payment Records
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              All recorded customer payments
            </p>

          </div>

          {loading ? (

            <div className="p-12 text-center">

              <p className="text-sm text-slate-500">
                Loading payment history...
              </p>

            </div>

          ) : filteredPayments.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-4xl">
                💳
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No payment records found
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Try changing your search or filters.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1050px]">

                <thead>

                  <tr className="bg-slate-50 text-left">

                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-400">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">
                      Method
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">
                      Reference
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">
                      Note
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredPayments.map(
                    (payment) => (

                      <tr
                        key={payment.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >

                        {/* DATE */}

                        <td className="whitespace-nowrap px-5 py-4">

                          <p className="text-sm font-semibold text-slate-800">
                            {formatDate(
                              payment.payment_date
                            )}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {formatTime(
                              payment.payment_date
                            )}
                          </p>

                        </td>

                        {/* CUSTOMER */}

                        <td className="px-5 py-4">

                          <p className="text-sm font-bold text-slate-800">
                            {payment.customer?.name ||
                              "Unknown Customer"}
                          </p>

                          {payment.customer
                            ?.customer_code && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {
                                payment.customer
                                  .customer_code
                              }
                            </p>
                          )}

                        </td>

                        {/* INVOICE */}

                        <td className="px-5 py-4">

                          {payment.sale?.invoice_number ? (

                            <Link
                              href={`/sales/${payment.sale.id}`}
                              className="text-sm font-bold text-blue-600 hover:underline"
                            >
                              {
                                payment.sale
                                  .invoice_number
                              }
                            </Link>

                          ) : (

                            <span className="text-xs text-slate-400">
                              —
                            </span>

                          )}

                        </td>

                        {/* AMOUNT */}

                        <td className="whitespace-nowrap px-5 py-4 text-right">

                          <span className="text-sm font-black text-green-600">
                            {money(
                              Number(
                                payment.amount
                              )
                            )}
                          </span>

                        </td>

                        {/* METHOD */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              payment.payment_method ===
                              "cash"
                                ? "bg-green-100 text-green-700"
                                : payment.payment_method ===
                                  "bank_transfer"
                                ? "bg-blue-100 text-blue-700"
                                : payment.payment_method ===
                                  "card"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {paymentMethodLabel(
                              payment.payment_method
                            )}
                          </span>

                        </td>

                        {/* REFERENCE */}

                        <td className="px-5 py-4">

                          <span className="text-xs text-slate-500">
                            {payment.reference_number ||
                              "—"}
                          </span>

                        </td>

                        {/* NOTE */}

                        <td className="max-w-[220px] px-5 py-4">

                          <span className="text-xs text-slate-500">
                            {payment.notes || "—"}
                          </span>

                        </td>

                        {/* RECEIPT */}

                        <td className="px-5 py-4">

                          <Link
                            href={`/payment-receipt/${payment.id}`}
                            className="inline-flex whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            🧾 Receipt
                          </Link>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

                <tfoot>

                  <tr className="border-t-2 border-slate-200 bg-slate-50">

                    <td
                      colSpan={3}
                      className="px-5 py-4 text-right text-sm font-bold text-slate-700"
                    >
                      Filtered Total
                    </td>

                    <td className="px-5 py-4 text-right text-base font-black text-slate-900">
                      {money(totalReceived)}
                    </td>

                    <td colSpan={4} />

                  </tr>

                </tfoot>

              </table>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}