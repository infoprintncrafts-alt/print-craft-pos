"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  whatsapp: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  sale_date: string;
  total: number;
  paid_amount: number;
  payment_status: string;
};

type CustomerCredit = {
  customer_id: string;
  amount: number;
};

type CustomerDebt = Customer & {
  totalSales: number;
  totalPaid: number;
  balance: number;
  invoices: Sale[];
};

export default function CustomerDebtsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customerCredits, setCustomerCredits] = useState<
    CustomerCredit[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session) {
        throw new Error("You are not logged in.");
      }

      const [
        customersResult,
        salesResult,
        paymentsResult,
      ] = await Promise.all([
        // =====================================================
        // CUSTOMERS
        // =====================================================

        supabase
          .from("customers")
          .select(`
            id,
            customer_code,
            name,
            phone,
            whatsapp
          `)
          .eq("is_active", true)
          .order("name"),

        // =====================================================
        // ALL SALES
        // =====================================================
        //
        // IMPORTANT:
        // We load ALL sales.
        //
        // paid_amount is the authoritative amount already
        // applied against each invoice.
        //

        supabase
          .from("sales")
          .select(`
            id,
            invoice_number,
            customer_id,
            sale_date,
            total,
            paid_amount,
            payment_status
          `)
          .order("sale_date", {
            ascending: false,
          }),

        // =====================================================
        // CUSTOMER PAYMENTS
        // =====================================================
        //
        // We only need customer_id, sale_id and amount here.
        //
        // If sale_id IS NOT NULL:
        //     payment belongs to an invoice.
        //
        // If sale_id IS NULL:
        //     payment is unallocated customer credit.
        //
        // Invoice payments are ALREADY reflected in
        // sales.paid_amount, so we must NOT add them again.
        //

        supabase
          .from("customer_payments")
          .select(`
            customer_id,
            sale_id,
            amount
          `)
          .order("payment_date", {
            ascending: false,
          }),
      ]);

      // =====================================================
      // ERROR CHECKING
      // =====================================================

      if (customersResult.error) {
        throw new Error(
          `Customer error: ${customersResult.error.message}`
        );
      }

      if (salesResult.error) {
        throw new Error(
          `Sales error: ${salesResult.error.message}`
        );
      }

      if (paymentsResult.error) {
        throw new Error(
          `Payment error: ${paymentsResult.error.message}`
        );
      }

      // =====================================================
      // SAVE CUSTOMERS
      // =====================================================

      setCustomers(
        (customersResult.data || []) as Customer[]
      );

      // =====================================================
      // SAVE SALES
      // =====================================================

      setSales(
        (salesResult.data || []) as Sale[]
      );

      // =====================================================
      // SAVE ONLY UNALLOCATED CUSTOMER CREDITS
      // =====================================================
      //
      // This is very important.
      //
      // A payment against an invoice already increases
      // sales.paid_amount.
      //
      // Therefore we MUST NOT count that payment again.
      //
      // Only payments with sale_id = null are additional
      // customer credits.
      //

      const creditsOnly = (
        paymentsResult.data || []
      )
        .filter(
          (payment) =>
            !payment.sale_id &&
            payment.customer_id
        )
        .map((payment) => ({
          customer_id: String(payment.customer_id),
          amount: Number(payment.amount || 0),
        }));

      setCustomerCredits(creditsOnly);
    } catch (err) {
      console.error(
        "Load payment/debt data error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load debt information."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // MONEY
  // =========================================================

  function money(value: number) {
    return `LKR ${Number(value || 0).toLocaleString(
      "en-LK",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  // =========================================================
  // CUSTOMER DEBTS
  // =========================================================

  const customerDebts = useMemo(() => {
    // -------------------------------------------------------
    // Group unallocated credits by customer
    // -------------------------------------------------------

    const creditsByCustomer =
      customerCredits.reduce<Record<string, number>>(
        (totals, payment) => {
          const customerId = String(
            payment.customer_id || ""
          );

          if (!customerId) {
            return totals;
          }

          totals[customerId] =
            (totals[customerId] || 0) +
            Number(payment.amount || 0);

          return totals;
        },
        {}
      );

    const result: CustomerDebt[] = [];

    // -------------------------------------------------------
    // Calculate every customer's debt
    // -------------------------------------------------------

    for (const customer of customers) {
      const customerSales = sales.filter(
        (sale) =>
          sale.customer_id === customer.id
      );

      if (customerSales.length === 0) {
        continue;
      }

      // -----------------------------------------------------
      // Total purchases
      // -----------------------------------------------------

      const totalSales =
        customerSales.reduce(
          (sum, sale) =>
            sum + Number(sale.total || 0),
          0
        );

      // -----------------------------------------------------
      // Payments already applied to invoices
      // -----------------------------------------------------
      //
      // This comes directly from sales.paid_amount.
      //
      // Example:
      //
      // Invoice = 43,600
      // Paid     = 26,200
      // Balance  = 17,400
      //
      // -----------------------------------------------------

      const invoicePaidAmount =
        customerSales.reduce(
          (sum, sale) =>
            sum +
            Number(sale.paid_amount || 0),
          0
        );

      // -----------------------------------------------------
      // Unallocated customer credit
      // -----------------------------------------------------

      const customerCredit =
        creditsByCustomer[customer.id] || 0;

      // -----------------------------------------------------
      // Total paid
      // -----------------------------------------------------
      //
      // Invoice payments + unallocated credits
      //
      // IMPORTANT:
      // Invoice payments are NOT read from
      // customer_payments here because they are already
      // represented in sales.paid_amount.
      //
      // -----------------------------------------------------

      const totalPaid =
        invoicePaidAmount +
        customerCredit;

      // -----------------------------------------------------
      // Outstanding balance
      // -----------------------------------------------------

      const balance = Math.max(
        totalSales - totalPaid,
        0
      );

      // Customer has no outstanding debt
      if (balance <= 0) {
        continue;
      }

      result.push({
        ...customer,
        totalSales,
        totalPaid,
        balance,
        invoices: customerSales.filter(
          (sale) =>
            Number(sale.total || 0) >
            Number(sale.paid_amount || 0)
        ),
      });
    }

    return result;
  }, [
    customers,
    sales,
    customerCredits,
  ]);

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredCustomers =
    customerDebts.filter((customer) => {
      const searchText =
        search.toLowerCase().trim();

      if (!searchText) {
        return true;
      }

      return (
        customer.name
          .toLowerCase()
          .includes(searchText) ||
        (customer.phone || "")
          .toLowerCase()
          .includes(searchText) ||
        (customer.whatsapp || "")
          .toLowerCase()
          .includes(searchText) ||
        (customer.customer_code || "")
          .toLowerCase()
          .includes(searchText)
      );
    });

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalDebt =
    customerDebts.reduce(
      (sum, customer) =>
        sum + customer.balance,
      0
    );

  const totalCustomers =
    customerDebts.length;

  const totalInvoices =
    customerDebts.reduce(
      (sum, customer) =>
        sum + customer.invoices.length,
      0
    );

  const totalCustomerCredit =
    customerCredits.reduce(
      (sum, credit) =>
        sum + Number(credit.amount || 0),
      0
    );

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-3xl">
              ⏳
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading customer debts...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>Dashboard</span>
              <span>›</span>
              <span>Customers</span>
              <span>›</span>
              <span className="text-slate-500">
                Debts
              </span>
            </div>

            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Customer Debts
            </h1>
          </div>

          <Link
            href="/customers"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Customers
          </Link>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* ===================================================
            SUMMARY
        =================================================== */}

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Total Outstanding
            </p>

            <p className="mt-2 text-2xl font-black text-red-600">
              {money(totalDebt)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Customers With Debt
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {totalCustomers}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Outstanding Invoices
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {totalInvoices}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Unallocated Credit
            </p>

            <p className="mt-2 text-2xl font-black text-green-600">
              {money(totalCustomerCredit)}
            </p>
          </div>
        </div>

        {/* ===================================================
            SEARCH
        =================================================== */}

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search customer by name, phone or customer code..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </section>

        {/* ===================================================
            CUSTOMER TABLE
        =================================================== */}

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              Outstanding Customers
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              Customers who currently have unpaid balances
            </p>
          </div>

          {filteredCustomers.length ===
          0 ? (
            <div className="px-5 py-14 text-center">
              <div className="text-4xl">
                💰
              </div>

              <p className="mt-3 text-sm font-bold text-slate-700">
                No outstanding debts
              </p>

              <p className="mt-1 text-xs text-slate-400">
                There are no customers matching your search.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Customer
                    </th>

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Phone
                    </th>

                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Purchases
                    </th>

                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Paid
                    </th>

                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Outstanding
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map(
                    (customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                              {customer.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {
                                  customer.name
                                }
                              </p>

                              {customer.customer_code && (
                                <p className="text-xs text-slate-400">
                                  {
                                    customer.customer_code
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-500">
                          {customer.phone ||
                            customer.whatsapp ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {money(
                            customer.totalSales
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-semibold text-green-600">
                          {money(
                            customer.totalPaid
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <span className="rounded-md bg-red-50 px-2.5 py-1 text-sm font-bold text-red-600">
                            {money(
                              customer.balance
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/customers/debts/${customer.id}`}
                            className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            View Debt
                          </Link>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}