"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  sale_date: string;
  total: number;
  paid_amount: number;
  payment_status: string;
};

type Customer = {
  id: string;
  name: string;
};

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

export default function InvoicesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [salesResult, customersResult] = await Promise.all([
        supabase
          .from("sales")
          .select(
            "id, invoice_number, customer_id, sale_date, total, paid_amount, payment_status"
          )
          .order("sale_date", { ascending: false }),
        supabase
          .from("customers")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      if (salesResult.error) {
        throw new Error("Unable to load invoices: " + salesResult.error.message);
      }

      if (customersResult.error) {
        throw new Error("Unable to load customers: " + customersResult.error.message);
      }

      setSales((salesResult.data || []) as Sale[]);
      setCustomers((customersResult.data || []) as Customer[]);
    } catch (err) {
      console.error("Invoice page error:", err);
      setError(err instanceof Error ? err.message : "Unable to load invoices.");
    } finally {
      setLoading(false);
    }
  }

  const customersById = useMemo(() => {
    return customers.reduce<Record<string, string>>((map, customer) => {
      map[customer.id] = customer.name;
      return map;
    }, {});
  }, [customers]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return sales;
    }

    return sales.filter((sale) => {
      const invoice = sale.invoice_number.toLowerCase();
      const customer = (customersById[sale.customer_id || ""] || "").toLowerCase();

      return invoice.includes(query) || customer.includes(query);
    });
  }, [sales, customersById, search]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
            <p className="mt-2 text-sm text-slate-500">
              Invoice list, status, and quick access to printable receipts.
            </p>
          </div>

          <div className="space-y-2 text-right">
            <div className="text-sm text-slate-500">
              {sales.length} invoice{sales.length === 1 ? "" : "s"}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice or customer..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black md:w-[320px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            Loading invoices...
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Invoice</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Customer</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Total</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Paid</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const status = sale.payment_status || "unpaid";
                  return (
                    <tr key={sale.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {sale.invoice_number}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {customersById[sale.customer_id || ""] || "Walk-in"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(sale.sale_date)}</td>
                      <td className="px-4 py-4 text-slate-900">{money(sale.total)}</td>
                      <td className="px-4 py-4 text-slate-900">{money(sale.paid_amount)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : status === "partial"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/sales/invoice/${sale.id}`}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
