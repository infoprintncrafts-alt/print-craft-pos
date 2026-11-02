"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReportMetrics = {
  salesCount: number;
  salesTotal: number;
  paymentsTotal: number;
  outstandingBalance: number;
  outstandingPurchases: number;
  productsCount: number;
  lowStockCount: number;
  expensesTotal: number;
  totalJobs: number;
};

type ReportCategory =
  | "sales"
  | "payments"
  | "outstanding"
  | "tracked-products"
  | "low-stock"
  | "expenses"
  | "customers"
  | "suppliers";

type DateFilter = "weekly" | "monthly" | "yearly" | "all-time";

type ReportRow = {
  id: string;
  date: string | null;
  reference: string;
  name: string;
  details: string;
  amount: number | null;
  valueType: "money" | "units" | "none";
  status: string;
};

type CustomerTotals = {
  sales: number;
  paid: number;
  credit: number;
};

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type SaleBalanceRecord = {
  customer_id: string | null;
  total: number;
  paid_amount: number;
};

type CreditRecord = {
  customer_id: string | null;
  amount: number;
};

type CustomerRecord = {
  id: string;
  customer_code: string | null;
  name: string;
};

type CustomerLookup = { id: string; name: string };
type SalesTableRecord = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  sale_date: string;
  total: number;
  paid_amount: number;
  payment_status: string;
};
type PaymentTableRecord = {
  id: string;
  payment_number: string;
  customer_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
};
type ProductTableRecord = {
  id: string;
  product_code?: string | null;
  sku?: string | null;
  name: string;
  track_stock: boolean;
  is_active: boolean;
  stock_quantity: number;
  minimum_stock: number;
};
type ExpenseTableRecord = {
  id: string;
  expense_date: string;
  category: string | null;
  amount: number;
  payment_method: string | null;
  notes: string | null;
};
type CustomerCreatedRecord = CustomerRecord & {
  is_active: boolean;
  created_at: string;
};
type SupplierTableRecord = {
  id: string;
  supplier_name?: string | null;
  name?: string | null;
  is_active?: boolean;
  created_at: string;
};
type PurchaseBalanceRecord = {
  total_amount: number;
  paid_amount: number;
};
type JobMetricsRecord = { id: string };

async function fetchAllPages<T>(
  loadPage: (from: number, to: number) => Promise<PageResult<T>>
): Promise<T[]> {
  const pageSize = 1000;
  const allRows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);

    const page = data ?? [];
    allRows.push(...page);
    if (page.length < pageSize) return allRows;
  }
}

const emptyMetrics: ReportMetrics = {
  salesCount: 0,
  salesTotal: 0,
  paymentsTotal: 0,
  outstandingBalance: 0,
  outstandingPurchases: 0,
  productsCount: 0,
  lowStockCount: 0,
  expensesTotal: 0,
  totalJobs: 0,
};

const categories: { value: ReportCategory; label: string }[] = [
  { value: "sales", label: "Total Sales" },
  { value: "payments", label: "Payments Received" },
  { value: "outstanding", label: "Outstanding Balance" },
  { value: "tracked-products", label: "Tracked Products" },
  { value: "low-stock", label: "Low Stock" },
  { value: "expenses", label: "Expenses" },
  { value: "customers", label: "Customers" },
  { value: "suppliers", label: "Suppliers" },
];

const dateFilters: { value: DateFilter; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "all-time", label: "Up to date (from the beginning)" },
];

function money(value: number) {
  return (
    "LKR " +
    Number(value || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function amount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string | null) {
  if (!value) return "Snapshot";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateBounds(filter: DateFilter) {
  const now = new Date();
  const end = now.toISOString();
  let start: Date | null = null;

  if (filter === "weekly") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  } else if (filter === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (filter === "yearly") {
    start = new Date(now.getFullYear(), 0, 1);
  }

  return { start: start?.toISOString() ?? null, end };
}

async function loadOutstandingRows(): Promise<ReportRow[]> {
  const [sales, credits, customers] = await Promise.all([
    fetchAllPages<SaleBalanceRecord>(async (from, to) => {
      const { data, error } = await supabase
        .from("sales")
        .select("customer_id, total, paid_amount")
        .not("customer_id", "is", null)
        .order("id", { ascending: true })
        .range(from, to);
      return { data: data as unknown as SaleBalanceRecord[] | null, error };
    }),
    fetchAllPages<CreditRecord>(async (from, to) => {
      const { data, error } = await supabase
        .from("customer_payments")
        .select("customer_id, amount")
        .is("sale_id", null)
        .not("customer_id", "is", null)
        .order("id", { ascending: true })
        .range(from, to);
      return { data: data as unknown as CreditRecord[] | null, error };
    }),
    fetchAllPages<CustomerRecord>(async (from, to) => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, customer_code, name")
        .order("id", { ascending: true })
        .range(from, to);
      return { data: data as unknown as CustomerRecord[] | null, error };
    }),
  ]);

  const totals = new Map<string, CustomerTotals>();
  for (const sale of sales) {
    if (!sale.customer_id) continue;
    const total = Math.max(amount(sale.total), 0);
    const paid = Math.min(total, Math.max(amount(sale.paid_amount), 0));
    const current = totals.get(sale.customer_id) ?? {
      sales: 0,
      paid: 0,
      credit: 0,
    };
    current.sales += total;
    current.paid += paid;
    totals.set(sale.customer_id, current);
  }

  for (const credit of credits) {
    if (!credit.customer_id) continue;
    const current = totals.get(credit.customer_id) ?? {
      sales: 0,
      paid: 0,
      credit: 0,
    };
    current.credit += Math.max(amount(credit.amount), 0);
    totals.set(credit.customer_id, current);
  }

  return customers
    .flatMap((customer) => {
      const current = totals.get(customer.id) ?? {
        sales: 0,
        paid: 0,
        credit: 0,
      };
      const outstanding = Math.max(
        current.sales - current.paid - current.credit,
        0
      );

      if (outstanding <= 0) return [];

      return [{
        id: customer.id,
        date: null,
        reference: customer.customer_code || customer.id.slice(0, 8),
        name: customer.name,
        details: `Sales ${money(current.sales)} · Paid and credit ${money(current.paid + current.credit)}`,
        amount: outstanding,
        valueType: "money" as const,
        status: "Outstanding",
      }];
    })
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
}

function getCategoryLabel(category: ReportCategory) {
  return categories.find((item) => item.value === category)?.label ?? "Report";
}

function getDateFilterLabel(filter: DateFilter) {
  return dateFilters.find((item) => item.value === filter)?.label ?? "All time";
}

function isCurrentSnapshot(category: ReportCategory) {
  return (
    category === "outstanding" ||
    category === "tracked-products" ||
    category === "low-stock"
  );
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<ReportMetrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportCategory, setReportCategory] = useState<ReportCategory>("sales");
  const [dateFilter, setDateFilter] = useState<DateFilter>("monthly");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState("");
  const tableRequest = useRef(0);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [sales, payments, outstandingRows, products, expenses, purchases, jobs] =
        await Promise.all([
          fetchAllPages<{ total: number }>(async (from, to) => {
            const { data, error } = await supabase
              .from("sales")
              .select("total")
              .order("id", { ascending: true })
              .range(from, to);
            return { data: data as unknown as { total: number }[] | null, error };
          }),
          fetchAllPages<{ amount: number }>(async (from, to) => {
            const { data, error } = await supabase
              .from("customer_payments")
              .select("amount")
              .order("id", { ascending: true })
              .range(from, to);
            return { data: data as unknown as { amount: number }[] | null, error };
          }),
          loadOutstandingRows(),
          fetchAllPages<{
            stock_quantity: number;
            minimum_stock: number;
            track_stock: boolean;
            is_active: boolean;
          }>(async (from, to) => {
            const { data, error } = await supabase
              .from("products")
              .select("stock_quantity, minimum_stock, track_stock, is_active")
              .order("id", { ascending: true })
              .range(from, to);
            return {
              data: data as unknown as {
                stock_quantity: number;
                minimum_stock: number;
                track_stock: boolean;
                is_active: boolean;
              }[] | null,
              error,
            };
          }),
          fetchAllPages<{ amount: number }>(async (from, to) => {
            const { data, error } = await supabase
              .from("expenses")
              .select("amount")
              .order("id", { ascending: true })
              .range(from, to);
            return { data: data as unknown as { amount: number }[] | null, error };
          }),
          fetchAllPages<PurchaseBalanceRecord>(async (from, to) => {
            const { data, error } = await supabase
              .from("purchases")
              .select("total_amount, paid_amount")
              .order("id", { ascending: true })
              .range(from, to);
            return {
              data: data as unknown as PurchaseBalanceRecord[] | null,
              error,
            };
          }),
          fetchAllPages<JobMetricsRecord>(async (from, to) => {
            const { data, error } = await supabase
              .from("orders")
              .select("id")
              .order("id", { ascending: true })
              .range(from, to);
            return { data: data as unknown as JobMetricsRecord[] | null, error };
          }),
        ]);

      const trackedProducts = products.filter(
        (product) => product.is_active && product.track_stock
      );

      setMetrics({
        salesCount: sales.length,
        salesTotal: sales.reduce((sum, sale) => sum + amount(sale.total), 0),
        paymentsTotal: payments.reduce((sum, payment) => sum + amount(payment.amount), 0),
        outstandingBalance: outstandingRows.reduce(
          (sum, customer) => sum + amount(customer.amount),
          0
        ),
        outstandingPurchases: purchases.reduce(
          (sum, purchase) =>
            sum +
            Math.max(
              amount(purchase.total_amount) - amount(purchase.paid_amount),
              0
            ),
          0
        ),
        productsCount: trackedProducts.length,
        lowStockCount: trackedProducts.filter(
          (product) =>
            amount(product.stock_quantity) <= amount(product.minimum_stock)
        ).length,
        expensesTotal: expenses.reduce(
          (sum, item) => sum + amount(item.amount),
          0
        ),
        totalJobs: jobs.length,
      });
    } catch (err) {
      console.error("Reports load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTable = useCallback(async () => {
    const requestId = ++tableRequest.current;
    const { start, end } = dateBounds(dateFilter);

    try {
      setTableLoading(true);
      setTableError("");

      let nextRows: ReportRow[] = [];

      if (reportCategory === "sales") {
        const [salesResult, customersResult] = await Promise.all([
          fetchAllPages<SalesTableRecord>(async (from, to) => {
            let query = supabase
              .from("sales")
              .select("id, invoice_number, customer_id, sale_date, total, paid_amount, payment_status")
              .order("sale_date", { ascending: false })
              .order("id", { ascending: false });
            if (start) query = query.gte("sale_date", start);
            query = query.lte("sale_date", end);
            const { data, error } = await query.range(from, to);
            return { data: data as unknown as SalesTableRecord[] | null, error };
          }),
          fetchAllPages<CustomerLookup>(async (from, to) => {
            const { data, error } = await supabase
              .from("customers")
              .select("id, name")
              .order("id", { ascending: true })
              .range(from, to);
            return { data: data as unknown as CustomerLookup[] | null, error };
          }),
        ]);
        const customerNames = new Map(customersResult.map((customer) => [customer.id, customer.name]));
        nextRows = salesResult.map((sale) => ({
          id: sale.id,
          date: sale.sale_date,
          reference: sale.invoice_number,
          name: sale.customer_id
            ? customerNames.get(sale.customer_id) ?? "Customer"
            : "Walk-in sale",
          details: `Paid ${money(amount(sale.paid_amount))} of ${money(amount(sale.total))}`,
          amount: amount(sale.total),
          valueType: "money",
          status: sale.payment_status || "—",
        }));
      } else if (reportCategory === "payments") {
        const [paymentsResult, customersResult] = await Promise.all([
          fetchAllPages<PaymentTableRecord>(async (from, to) => {
            let query = supabase
              .from("customer_payments")
              .select("id, payment_number, customer_id, payment_date, amount, payment_method, reference_number, notes")
              .order("payment_date", { ascending: false })
              .order("id", { ascending: false });
            if (start) query = query.gte("payment_date", start);
            query = query.lte("payment_date", end);
            const { data, error } = await query.range(from, to);
            return { data: data as unknown as PaymentTableRecord[] | null, error };
          }),
          fetchAllPages<CustomerLookup>(async (from, to) => {
            const { data, error } = await supabase
              .from("customers")
              .select("id, name")
              .order("id", { ascending: true })
              .range(from, to);
            return { data: data as unknown as CustomerLookup[] | null, error };
          }),
        ]);
        const customerNames = new Map(customersResult.map((customer) => [customer.id, customer.name]));
        nextRows = paymentsResult.map((payment) => ({
          id: payment.id,
          date: payment.payment_date,
          reference: payment.payment_number,
          name: payment.customer_id
            ? customerNames.get(payment.customer_id) ?? "Customer"
            : "Unassigned payment",
          details: [payment.payment_method, payment.reference_number, payment.notes]
            .filter(Boolean)
            .join(" · ") || "Payment received",
          amount: amount(payment.amount),
          valueType: "money",
          status: "Received",
        }));
      } else if (reportCategory === "outstanding") {
        nextRows = await loadOutstandingRows();
      } else if (reportCategory === "tracked-products" || reportCategory === "low-stock") {
        const products = await fetchAllPages<ProductTableRecord>(async (from, to) => {
          const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("track_stock", true)
            .eq("is_active", true)
            .order("name", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to);
          return { data: data as unknown as ProductTableRecord[] | null, error };
        });
        nextRows = products.filter((product) =>
          reportCategory === "tracked-products" ||
          amount(product.stock_quantity) <= amount(product.minimum_stock)
        ).map((product) => ({
          id: product.id,
          date: null,
          reference: String(product.product_code || product.sku || product.id.slice(0, 8)),
          name: String(product.name || "Unnamed product"),
          details: `Minimum stock ${amount(product.minimum_stock).toLocaleString()}`,
          amount: amount(product.stock_quantity),
          valueType: "units",
          status: amount(product.stock_quantity) <= amount(product.minimum_stock)
            ? "Low stock"
            : "In stock",
        }));
      } else if (reportCategory === "expenses") {
        const expenses = await fetchAllPages<ExpenseTableRecord>(async (from, to) => {
          let query = supabase
            .from("expenses")
            .select("id, expense_date, category, amount, payment_method, notes")
            .order("expense_date", { ascending: false })
            .order("id", { ascending: false });
          if (start) query = query.gte("expense_date", start);
          query = query.lte("expense_date", end);
          const { data, error } = await query.range(from, to);
          return { data: data as unknown as ExpenseTableRecord[] | null, error };
        });
        nextRows = expenses.map((expense) => ({
          id: expense.id,
          date: expense.expense_date,
          reference: expense.category || "Expense",
          name: expense.payment_method || "Business expense",
          details: expense.notes || expense.category || "Recorded expense",
          amount: amount(expense.amount),
          valueType: "money",
          status: "Recorded",
        }));
      } else if (reportCategory === "customers") {
        const customers = await fetchAllPages<CustomerCreatedRecord>(async (from, to) => {
          let query = supabase
            .from("customers")
            .select("id, customer_code, name, is_active, created_at")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false });
          if (start) query = query.gte("created_at", start);
          query = query.lte("created_at", end);
          const { data, error } = await query.range(from, to);
          return { data: data as unknown as CustomerCreatedRecord[] | null, error };
        });
        nextRows = customers.map((customer) => ({
          id: customer.id,
          date: customer.created_at,
          reference: customer.customer_code || customer.id.slice(0, 8),
          name: customer.name,
          details: "Customer account",
          amount: null,
          valueType: "none",
          status: customer.is_active ? "Active" : "Inactive",
        }));
      } else {
        const suppliersResult = await fetchAllPages<SupplierTableRecord>(async (from, to) => {
          let query = supabase
            .from("suppliers")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false });
          if (start) query = query.gte("created_at", start);
          query = query.lte("created_at", end);
          const { data, error } = await query.range(from, to);
          return { data: data as unknown as SupplierTableRecord[] | null, error };
        });
        nextRows = suppliersResult.map((supplier) => ({
            id: supplier.id,
            date: supplier.created_at,
            reference: supplier.id.slice(0, 8),
            name: supplier.supplier_name || supplier.name || "Supplier",
            details: "Supplier account",
            amount: null,
            valueType: "none",
            status: supplier.is_active === false ? "Inactive" : "Active",
          }));
      }

      if (requestId === tableRequest.current) setRows(nextRows);
    } catch (err) {
      console.error("Report table load error:", err);
      if (requestId === tableRequest.current) {
        setTableError(err instanceof Error ? err.message : "Unable to load this report.");
        setRows([]);
      }
    } finally {
      if (requestId === tableRequest.current) setTableLoading(false);
    }
  }, [reportCategory, dateFilter]);

  useEffect(() => {
    void Promise.resolve().then(() => loadMetrics());
  }, [loadMetrics]);

  useEffect(() => {
    void Promise.resolve().then(() => loadTable());
  }, [loadTable]);

  const snapshot = isCurrentSnapshot(reportCategory);
  const selectedRange = getDateFilterLabel(dateFilter);
  const rowTotal = rows.reduce((sum, row) =>
    row.valueType === "money" ? sum + amount(row.amount) : sum, 0);

  function exportReport() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:hidden">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
              <p className="mt-2 text-sm text-slate-500">
                Financial and inventory summary metrics for your POS.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadMetrics();
                void loadTable();
              }}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Total Sales" value={loading ? "Loading…" : money(metrics.salesTotal)} detail="Total value of all recorded sales" />
            <MetricCard label="Total Invoices" value={loading ? "Loading…" : metrics.salesCount.toLocaleString()} detail="All recorded invoices" />
            <MetricCard label="Payments Received" value={loading ? "Loading…" : money(metrics.paymentsTotal)} detail="Invoice and customer credit payments" />
            <MetricCard label="Outstanding Balance" value={loading ? "Loading…" : money(metrics.outstandingBalance)} detail="Calculated from invoice paid amounts and unapplied credits" />
            <MetricCard label="Total Outstanding Purchases" value={loading ? "Loading…" : money(metrics.outstandingPurchases)} detail="Unpaid supplier purchase balances" />
            <MetricCard label="Total Jobs" value={loading ? "Loading…" : metrics.totalJobs.toLocaleString()} detail="All recorded production jobs" />
            <MetricCard label="Tracked Products" value={loading ? "Loading…" : metrics.productsCount.toLocaleString()} detail="Active products with stock tracking" />
            <MetricCard label="Low Stock" value={loading ? "Loading…" : metrics.lowStockCount.toLocaleString()} detail="Tracked products at or below minimum stock" />
            <MetricCard label="Expenses" value={loading ? "Loading…" : money(metrics.expensesTotal)} detail="All recorded costs" />
          </div>
        </section>

        <section
          id="reports-print-area"
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Detailed report table</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a report category and date range to review its records.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Report category
                <select
                  value={reportCategory}
                  onChange={(event) => setReportCategory(event.target.value as ReportCategory)}
                  className="min-w-52 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Date filter
                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                  className="min-w-56 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                >
                  {dateFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={exportReport}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Print / Save PDF
              </button>
            </div>
          </div>

          <div className="hidden print:block">
            <h1 className="text-xl font-bold">{getCategoryLabel(reportCategory)} Report</h1>
            <p className="mt-1 text-sm">{selectedRange}</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm print:mt-3">
            <p className="text-slate-600">
              {snapshot
                ? "Current snapshot; the date filter does not change this report."
                : `Date range: ${selectedRange}`}
            </p>
            <div className="flex gap-4 text-slate-500">
              <span>{rows.length.toLocaleString()} records</span>
              {rows.some((row) => row.valueType === "money") ? (
                <strong className="text-slate-900">Total: {money(rowTotal)}</strong>
              ) : null}
            </div>
          </div>

          {tableError ? (
            <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 print:hidden">
              {tableError}
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-bold">Date</th>
                  <th className="px-3 py-3 font-bold">Reference</th>
                  <th className="px-3 py-3 font-bold">Customer / Product / Supplier</th>
                  <th className="px-3 py-3 font-bold">Details</th>
                  <th className="px-3 py-3 text-right font-bold">Amount / Value</th>
                  <th className="px-3 py-3 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr><td colSpan={6} className="px-3 py-12 text-center text-slate-500">Loading report records…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-12 text-center text-slate-500">{tableError ? "Report data could not be loaded." : "No records found for this selection."}</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(row.date)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{row.reference}</td>
                    <td className="px-3 py-3 text-slate-800">{row.name}</td>
                    <td className="max-w-sm px-3 py-3 text-slate-500">{row.details}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">
                      {row.valueType === "money" && row.amount !== null
                        ? money(row.amount)
                        : row.valueType === "units" && row.amount !== null
                          ? `${row.amount.toLocaleString()} units`
                          : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right capitalize text-slate-600">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #reports-print-area,
          #reports-print-area * { visibility: visible !important; }
          #reports-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          #reports-print-area table { min-width: 0 !important; font-size: 9pt; }
          #reports-print-area thead { display: table-header-group; }
          #reports-print-area tr { break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-4 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
