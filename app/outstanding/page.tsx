"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  sale_date: string;
  total: number;
  paid_amount: number;
};

type Customer = {
  id: string;
  name: string;
  customer_code: string | null;
  phone: string | null;
};

type OutstandingInvoice = Sale & {
  customerName: string;
  customerCode: string | null;
  balance: number;
  ageInDays: number;
  isOverdue: boolean;
};

const OVERDUE_AFTER_DAYS = 30;

function money(value: number) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysSince(value: string) {
  const date = new Date(value);
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
}

export default function OutstandingPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadOutstanding = async () => {
      setLoading(true);
      setError("");

      const [salesResult, customersResult] = await Promise.all([
        supabase
          .from("sales")
          .select("id, invoice_number, customer_id, sale_date, total, paid_amount")
          .order("sale_date", { ascending: false }),
        supabase
          .from("customers")
          .select("id, name, customer_code, phone")
          .order("name", { ascending: true }),
      ]);

      if (cancelled) return;

      if (salesResult.error || customersResult.error) {
        setError(
          salesResult.error
            ? `Unable to load invoices: ${salesResult.error.message}`
            : `Unable to load customers: ${customersResult.error?.message}`
        );
        setLoading(false);
        return;
      }

      setSales((salesResult.data || []) as Sale[]);
      setCustomers((customersResult.data || []) as Customer[]);
      setLoading(false);
    };

    void loadOutstanding();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const customerById = useMemo(
    () =>
      customers.reduce<Record<string, Customer>>((result, customer) => {
        result[customer.id] = customer;
        return result;
      }, {}),
    [customers]
  );

  const outstandingInvoices = useMemo<OutstandingInvoice[]>(
    () =>
      sales
        .map((sale) => {
          const balance = Math.max(0, Number(sale.total || 0) - Number(sale.paid_amount || 0));
          const ageInDays = daysSince(sale.sale_date);
          const customer = sale.customer_id ? customerById[sale.customer_id] : undefined;

          return {
            ...sale,
            balance,
            ageInDays,
            isOverdue: ageInDays > OVERDUE_AFTER_DAYS,
            customerName: customer?.name || "Walk-in customer",
            customerCode: customer?.customer_code || null,
          };
        })
        .filter((sale) => sale.balance > 0),
    [customerById, sales]
  );

  const visibleInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return outstandingInvoices.filter((invoice) => {
      const matchesFilter = filter === "all" || invoice.isOverdue;
      const matchesSearch =
        !query ||
        invoice.invoice_number.toLowerCase().includes(query) ||
        invoice.customerName.toLowerCase().includes(query) ||
        (invoice.customerCode || "").toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, outstandingInvoices, search]);

  const totalOutstanding = outstandingInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const overdueInvoices = outstandingInvoices.filter((invoice) => invoice.isOverdue);
  const overdueTotal = overdueInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const customersWithBalances = new Set(
    outstandingInvoices.filter((invoice) => invoice.customer_id).map((invoice) => invoice.customer_id)
  ).size;

  function sendPaymentReminder(invoice: OutstandingInvoice) {
    const customer = invoice.customer_id ? customerById[invoice.customer_id] : undefined;
    const phone = (customer?.phone || "").replace(/\D/g, "").replace(/^0/, "94");
    if (!phone) { alert("This customer does not have a WhatsApp number."); return; }
    const message = [`Hello ${invoice.customerName},`, "", "This is a friendly reminder from Print & Craft.", `Invoice: ${invoice.invoice_number}`, `Outstanding balance: ${money(invoice.balance)}`, "", "Please contact us if you have already paid or need assistance. Thank you."].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Accounts receivable</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Outstanding Balances</h1>
            <p className="mt-1 text-sm text-slate-500">Unpaid invoice balances, ordered from newest to oldest.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/customer-payments" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Record payment
            </Link>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total outstanding</p>
            <p className="mt-2 text-2xl font-black text-red-600">{money(totalOutstanding)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Overdue (over 30 days)</p>
            <p className="mt-2 text-2xl font-black text-orange-600">{money(overdueTotal)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Customers with balances</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{customersWithBalances}</p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Outstanding invoices</h2>
              <p className="mt-1 text-sm text-slate-500">{outstandingInvoices.length} unpaid invoice{outstandingInvoices.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice or customer..." className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <select value={filter} onChange={(event) => setFilter(event.target.value as "all" | "overdue")} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">
                <option value="all">All outstanding</option>
                <option value="overdue">Overdue only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading outstanding balances...</div>
          ) : visibleInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No outstanding invoices found.</p>
              <p className="mt-1 text-sm text-slate-500">Try another search or filter, or all invoices are fully paid.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Invoice date</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th><th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">{invoice.invoice_number}</td>
                      <td className="px-4 py-4"><p className="font-medium text-slate-800">{invoice.customerName}</p>{invoice.customerCode && <p className="mt-0.5 text-xs text-slate-400">{invoice.customerCode}</p>}</td>
                      <td className="px-4 py-4"><p className="text-slate-600">{formatDate(invoice.sale_date)}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${invoice.isOverdue ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{invoice.isOverdue ? `${invoice.ageInDays} days overdue` : `${invoice.ageInDays} days old`}</span></td>
                      <td className="px-4 py-4 text-right text-slate-700">{money(invoice.total)}</td>
                      <td className="px-4 py-4 text-right text-emerald-700">{money(invoice.paid_amount)}</td>
                      <td className="px-4 py-4 text-right font-bold text-red-600">{money(invoice.balance)}</td>
                      <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => sendPaymentReminder(invoice)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">WhatsApp</button><Link href={`/sales/invoice/${invoice.id}`} className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">View invoice</Link></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
