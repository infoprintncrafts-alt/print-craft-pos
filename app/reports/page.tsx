"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReportMetrics = {
  salesCount: number;
  salesTotal: number;
  paymentsTotal: number;
  outstandingBalance: number;
  productsCount: number;
  lowStockCount: number;
  expensesTotal: number;
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

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<ReportMetrics>({
    salesCount: 0,
    salesTotal: 0,
    paymentsTotal: 0,
    outstandingBalance: 0,
    productsCount: 0,
    lowStockCount: 0,
    expensesTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    try {
      setLoading(true);
      setError("");

      const [salesResult, paymentsResult, balancesResult, productsResult, expensesResult] =
        await Promise.all([
          supabase
            .from("sales")
            .select("total", { count: "exact" })
            .order("sale_date", { ascending: false }),
          supabase
            .from("customer_payments")
            .select("amount"),
          supabase
            .from("customer_balances")
            .select("outstanding_balance"),
          supabase
            .from("products")
            .select("stock_quantity, minimum_stock, track_stock"),
          supabase
            .from("expenses")
            .select("amount"),
        ]);

      if (salesResult.error) throw salesResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (balancesResult.error) throw balancesResult.error;
      if (productsResult.error) throw productsResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const totalsSales = Array.isArray(salesResult.data)
        ? salesResult.data.reduce((sum, item) => sum + Number(item?.total || 0), 0)
        : 0;

      const totalsPayments = Array.isArray(paymentsResult.data)
        ? paymentsResult.data.reduce((sum, item) => sum + Number(item?.amount || 0), 0)
        : 0;

      const outstandingBalance = Array.isArray(balancesResult.data)
        ? balancesResult.data.reduce(
            (sum, item) => sum + Number(item?.outstanding_balance || 0),
            0
          )
        : 0;

      const products = Array.isArray(productsResult.data) ? productsResult.data : [];
      const lowStockCount = products.filter(
        (product) =>
          product?.track_stock &&
          Number(product.stock_quantity || 0) <= Number(product.minimum_stock || 0)
      ).length;

      const expensesTotal = Array.isArray(expensesResult.data)
        ? expensesResult.data.reduce((sum, item) => sum + Number(item?.amount || 0), 0)
        : 0;

      setMetrics({
        salesCount: salesResult.count ?? 0,
        salesTotal: totalsSales,
        paymentsTotal: totalsPayments,
        outstandingBalance,
        productsCount: products.length,
        lowStockCount,
        expensesTotal,
      });
    } catch (err) {
      console.error("Reports load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            <p className="mt-2 text-sm text-slate-500">
              Financial and inventory summary metrics for your POS.
            </p>
          </div>
          <button
            type="button"
            onClick={loadMetrics}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">Calculating report metrics...</div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-500">Total Sales</p>
              <p className="mt-4 text-3xl font-black text-slate-900">{money(metrics.salesTotal)}</p>
              <p className="mt-2 text-sm text-slate-500">{metrics.salesCount} invoices</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-500">Payments Received</p>
              <p className="mt-4 text-3xl font-black text-slate-900">{money(metrics.paymentsTotal)}</p>
              <p className="mt-2 text-sm text-slate-500">Includes invoice and credit payments</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-500">Outstanding Balance</p>
              <p className="mt-4 text-3xl font-black text-slate-900">{money(metrics.outstandingBalance)}</p>
              <p className="mt-2 text-sm text-slate-500">Customer credit and unpaid invoices</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-500">Tracked Products</p>
              <p className="mt-4 text-3xl font-black text-slate-900">{metrics.productsCount}</p>
              <p className="mt-2 text-sm text-slate-500">Inventory items loaded</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-500">Low Stock</p>
              <p className="mt-4 text-3xl font-black text-slate-900">{metrics.lowStockCount}</p>
              <p className="mt-2 text-sm text-slate-500">Items below minimum stock</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-500">Expenses</p>
              <p className="mt-4 text-3xl font-black text-slate-900">{money(metrics.expensesTotal)}</p>
              <p className="mt-2 text-sm text-slate-500">Total recorded costs</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
