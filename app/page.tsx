"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type DashboardSale = {
  id: string;
  sale_date: string;
  total: number;
  discount: number;
};

type DashboardExpense = { amount: number };
type DashboardReturn = { refund_amount: number };
type DashboardSaleItem = {
  sale_id: string;
  product_id: string | null;
  quantity: number;
  discount: number;
  total: number;
};
type DashboardProductCost = { id: string; cost_price: number };

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

async function fetchRowsByIds<T>(
  ids: string[],
  loadPage: (ids: string[], from: number, to: number) => Promise<PageResult<T>>
): Promise<T[]> {
  const uniqueIds = [...new Set(ids)];
  const allRows: T[] = [];
  const batchSize = 200;

  for (let start = 0; start < uniqueIds.length; start += batchSize) {
    const batch = uniqueIds.slice(start, start + batchSize);
    allRows.push(
      ...(await fetchAllPages((from, to) => loadPage(batch, from, to)))
    );
  }

  return allRows;
}

function amount(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

const emptyMetrics = { todaySales: 0, todayInvoices: 0, monthSales: 0, debt: 0, outstandingPurchases: 0, pendingJobs: 0, dueToday: 0, lowStock: 0, monthProfit: 0, monthItemRevenue: 0, monthCostOfGoods: 0, monthExpenses: 0, monthRefunds: 0, unlinkedItemRevenue: 0, zeroCostProductCount: 0 };

function money(value: number) { return `LKR ${value.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function DashboardIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    sales: "M3 3v18h18M7 15l4-4 3 3 6-7M16 7h4v4", invoice: "M6 2h9l4 4v16H6zM15 2v5h5M9 13h6M9 17h6", debt: "M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20M9 14.5c.4.9 1.4 1.5 3 1.5 1.8 0 3-1 3-2.3 0-1.6-1.4-2-3-2.5s-3-.9-3-2.5C9 7.5 10.2 6.5 12 6.5c1.5 0 2.5.6 3 1.5M12 5v14", purchase: "M4 7h16l-1 13H5zm4 0V4h8v3M8 12h8", jobs: "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5", due: "M7 2v3M17 2v3M4 9h16M5 5h14v16H5zM12 12v4l3 2", stock: "M4 7l8-4 8 4-8 4zm0 0v10l8 4 8-4V7M12 11v10", profit: "M4 19V5M4 19h16M8 16v-4M12 16V8M16 16V4" };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d={paths[name] ?? paths.sales} /></svg>;
}

type ChartPoint = {
  key: string;
  label: string;
  displayLabel: string;
  value: number;
  height: number;
};

function localDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function QuickActionIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    sale: "M4 4h16v16H4zM8 8h8M8 12h5M16 16l2 2 3-4", job: "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5", customer: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6", payment: "M3 7h18v12H3zM3 11h18M7 16h3", stock: "M4 7l8-4 8 4-8 4zm0 0v10l8 4 8-4V7M12 11v10", expense: "M12 3v18M17 7.5c-.6-1.2-2-2-4-2-2.2 0-4 1.1-4 3s1.7 2.6 4 3 4 1.1 4 3-1.8 3-4 3c-2 0-3.4-.8-4-2", reports: "M4 19V5M4 19h16M8 16v-4M12 16V8M16 16V4", invoice: "M6 2h9l4 4v16H6zM15 2v5h5M9 13h6M9 17h6" };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d={paths[name] ?? paths.sale} /></svg>;
}

function getKpis(metrics: typeof emptyMetrics) { return [
  { label: "Today's sales", value: money(metrics.todaySales), detail: `${metrics.todayInvoices} invoice${metrics.todayInvoices === 1 ? "" : "s"} today`, tone: "blue", icon: "sales", href: "/invoices" }, { label: "Invoices today", value: String(metrics.todayInvoices), detail: "Completed invoices", tone: "indigo", icon: "invoice", href: "/invoices" }, { label: "This month's sales", value: money(metrics.monthSales), detail: "Current calendar month", tone: "violet", icon: "sales", href: "/reports" }, { label: "Outstanding debt", value: money(metrics.debt), detail: "Derived from invoice balances", tone: "amber", icon: "debt", href: "/outstanding" }, { label: "Outstanding purchases", value: money(metrics.outstandingPurchases), detail: "Supplier payments still due", tone: "rose", icon: "purchase", href: "/purchases" }, { label: "Pending jobs", value: String(metrics.pendingJobs), detail: "Across all production stages", tone: "orange", icon: "jobs", href: "/production" }, { label: "Due today", value: String(metrics.dueToday), detail: "Jobs with estimated delivery today", tone: "rose", icon: "due", href: "/production" }, { label: "Low stock items", value: String(metrics.lowStock), detail: metrics.lowStock ? "Needs restocking" : "Everything is in stock", tone: "emerald", icon: "stock", href: "/inventory" }, { label: "Profit this month", value: money(metrics.monthProfit), detail: `Estimate: items ${money(metrics.monthItemRevenue)} - costs ${money(metrics.monthCostOfGoods)} - expenses ${money(metrics.monthExpenses)} - refunds ${money(metrics.monthRefunds)}${metrics.unlinkedItemRevenue > 0 ? `; ${money(metrics.unlinkedItemRevenue)} unlinked items excluded` : ""}${metrics.zeroCostProductCount > 0 ? `; ${metrics.zeroCostProductCount} sold product${metrics.zeroCostProductCount === 1 ? " has" : "s have"} zero cost` : ""}`, tone: "teal", icon: "profit", href: "/reports" },
] as const; }

const quickActions = [
  { label: "New sale", description: "Create an invoice", href: "/sales", icon: "sale", primary: true },
  { label: "New printing job", description: "Start a custom order", href: "/orders", icon: "job", primary: true },
  { label: "New customer", description: "Add a customer", href: "/customers", icon: "customer" },
  { label: "Record payment", description: "Collect an outstanding balance", href: "/customer-payments", icon: "payment" },
  { label: "Add stock", description: "Update inventory", href: "/inventory", icon: "stock" },
  { label: "Add expense", description: "Log a business cost", href: "/expenses", icon: "expense" },
  { label: "View reports", description: "See business performance", href: "/reports", icon: "reports" },
  { label: "Print invoice", description: "Find an invoice to print", href: "/invoices", icon: "invoice" },
] as const;

const toneClasses = {
  blue: "bg-blue-50 text-blue-600",
  indigo: "bg-indigo-50 text-indigo-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  orange: "bg-orange-50 text-orange-600",
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  teal: "bg-teal-50 text-teal-600",
} as const;

function SectionTitle({ eyebrow, title, href, hrefLabel = "View all" }: { eyebrow: string; title: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">{title}</h2>
      </div>
      {href && <Link href={href} className="text-xs font-bold text-blue-600 transition hover:text-blue-700">{hrefLabel} <span aria-hidden>→</span></Link>}
    </div>
  );
}

const pipelineTemplate = [
  { label: "New order", status: "new", color: "bg-slate-400" },
  { label: "Designing", status: "designing", color: "bg-violet-500" },
  { label: "Approved", status: "approved", color: "bg-indigo-500" },
  { label: "In production", status: "production", color: "bg-blue-500" },
  { label: "Quality check", status: "quality_check", color: "bg-amber-500" },
  { label: "Ready", status: "ready", color: "bg-emerald-500" },
];

type RecentSale = {
  invoice_number: string;
  customers: { name: string | null } | { name: string | null }[] | null;
  total: number;
  paid_amount: number;
  sale_date: string;
};

export default function Home() {
  const [period, setPeriod] = useState("Today");
  const [staffName, setStaffName] = useState("Staff member");
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [chartTotal, setChartTotal] = useState(0);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");
  const [customStartDate, setCustomStartDate] = useState(() => localDateInputValue(new Date()));
  const [customEndDate, setCustomEndDate] = useState(() => localDateInputValue(new Date()));
  const chartRequest = useRef(0);
  const [pipeline, setPipeline] = useState(pipelineTemplate.map(p => ({ ...p, value: 0 })));
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  async function loadChartData(
    selectedPeriod: string,
    selectedCustomStart: string,
    selectedCustomEnd: string
  ) {
    const requestId = ++chartRequest.current;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;
    let endDate: Date;
    let bucketType: "two-hour" | "weekday" | "day";

    switch (selectedPeriod) {
      case "Today":
        startDate = todayStart;
        endDate = now;
        bucketType = "two-hour";
        break;
      case "Yesterday":
        startDate = new Date(todayStart);
        startDate.setDate(startDate.getDate() - 1);
        endDate = todayStart;
        bucketType = "two-hour";
        break;
      case "This week":
        startDate = new Date(todayStart);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate = now;
        bucketType = "weekday";
        break;
      case "This month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        bucketType = "day";
        break;
      case "Custom": {
        const [startYear, startMonth, startDay] = selectedCustomStart.split("-").map(Number);
        const [endYear, endMonth, endDay] = selectedCustomEnd.split("-").map(Number);
        startDate = new Date(startYear, startMonth - 1, startDay);
        const selectedEndDate = new Date(endYear, endMonth - 1, endDay);
        if (
          !selectedCustomStart ||
          !selectedCustomEnd ||
          Number.isNaN(startDate.getTime()) ||
          Number.isNaN(selectedEndDate.getTime()) ||
          selectedEndDate < startDate
        ) {
          if (requestId === chartRequest.current) {
            setChartPoints([]);
            setChartTotal(0);
            setChartError("Choose a valid custom date range.");
            setChartLoading(false);
          }
          return;
        }
        endDate = new Date(selectedEndDate);
        endDate.setDate(endDate.getDate() + 1);
        bucketType = startDate.getTime() === selectedEndDate.getTime()
          ? "two-hour"
          : "day";
        break;
      }
      default:
        return;
    }

    setChartLoading(true);
    setChartError("");
    setChartPoints([]);
    setChartTotal(0);

    try {
      const sales: { sale_date: string; total: number }[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("sales")
          .select("sale_date,total")
          .gte("sale_date", startDate.toISOString())
          .lt("sale_date", endDate.toISOString())
          .order("sale_date", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;

        const page = data ?? [];
        sales.push(...page);
        if (page.length < pageSize) break;
      }

      const bucketValues = new Map<string, number>();
      const bucketDefinitions: { key: string; label: string; displayLabel: string }[] = [];

      if (bucketType === "two-hour") {
        for (let hour = 0; hour < 24; hour += 2) {
          const key = `hour-${hour}`;
          const label = `${String(hour).padStart(2, "0")}:00–${String(hour + 1).padStart(2, "0")}:59`;
          bucketDefinitions.push({
            key,
            label,
            displayLabel: hour % 4 === 0 ? `${String(hour).padStart(2, "0")}:00` : "",
          });
          bucketValues.set(key, 0);
        }
      } else if (bucketType === "weekday") {
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        weekdays.forEach((label, day) => {
          const key = `weekday-${day}`;
          bucketDefinitions.push({ key, label, displayLabel: label });
          bucketValues.set(key, 0);
        });
      } else {
        const lastBucketDate = new Date(endDate);
        lastBucketDate.setHours(0, 0, 0, 0);
        if (endDate.getTime() === lastBucketDate.getTime()) {
          lastBucketDate.setDate(lastBucketDate.getDate() - 1);
        }
        const dates: Date[] = [];
        for (const date = new Date(startDate); date <= lastBucketDate; date.setDate(date.getDate() + 1)) {
          dates.push(new Date(date));
        }
        const labelEvery = Math.max(1, Math.ceil(dates.length / 7));
        dates.forEach((date, index) => {
          const dateKey = localDateInputValue(date);
          const key = `day-${dateKey}`;
          const label = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          bucketDefinitions.push({
            key,
            label,
            displayLabel: index % labelEvery === 0 || index === dates.length - 1
              ? date.toLocaleDateString("en-GB", { day: "numeric" })
              : "",
          });
          bucketValues.set(key, 0);
        });
      }

      for (const sale of sales) {
        const saleDate = new Date(sale.sale_date);
        let key: string;
        if (bucketType === "two-hour") {
          key = `hour-${Math.floor(saleDate.getHours() / 2) * 2}`;
        } else if (bucketType === "weekday") {
          key = `weekday-${saleDate.getDay()}`;
        } else {
          key = `day-${localDateInputValue(saleDate)}`;
        }
        if (bucketValues.has(key)) {
          bucketValues.set(key, (bucketValues.get(key) ?? 0) + Number(sale.total || 0));
        }
      }

      const maximum = Math.max(...bucketValues.values(), 0);
      const points = bucketDefinitions.map((bucket) => {
        const value = bucketValues.get(bucket.key) ?? 0;
        return {
          ...bucket,
          value,
          height: maximum > 0 ? (value / maximum) * 100 : 0,
        };
      });

      if (requestId === chartRequest.current) {
        setChartPoints(points);
        setChartTotal(sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0));
      }
    } catch (error) {
      console.error("Dashboard chart load error:", error);
      if (requestId === chartRequest.current) {
        setChartError("Unable to load sales data for this period.");
      }
    } finally {
      if (requestId === chartRequest.current) setChartLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadChartData(period, customStartDate, customEndDate));
  }, [period, customStartDate, customEndDate]);

  useEffect(() => {
    async function loadDashboard() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: staff } = await supabase
          .from("staff")
          .select("name")
          .eq("auth_user_id", authData.user.id)
          .maybeSingle();
        setStaffName(staff?.name || authData.user.email || "Staff member");
      }
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const [sales, expenses, productsResult, debtsResult, purchasesResult, jobsResult, returns] = await Promise.all([
        fetchAllPages<DashboardSale>(async (from, to) => {
          const { data, error } = await supabase
            .from("sales")
            .select("id,sale_date,total,discount")
            .gte("sale_date", startMonth)
            .lt("sale_date", endMonth)
            .order("id", { ascending: true })
            .range(from, to);
          return { data: data as unknown as DashboardSale[] | null, error };
        }),
        fetchAllPages<DashboardExpense>(async (from, to) => {
          const { data, error } = await supabase
            .from("expenses")
            .select("amount")
            .gte("expense_date", startMonth)
            .lt("expense_date", endMonth)
            .order("id", { ascending: true })
            .range(from, to);
          return { data: data as unknown as DashboardExpense[] | null, error };
        }),
        supabase.from("products").select("stock_quantity,minimum_stock").eq("is_active", true),
        supabase.from("sales").select("total,paid_amount"),
        supabase.from("purchases").select("total_amount,paid_amount,purchase_date").gte("purchase_date", startMonth).lt("purchase_date", endMonth),
        supabase.from("orders").select("status,due_date"),
        fetchAllPages<DashboardReturn>(async (from, to) => {
          const { data, error } = await supabase
            .from("returns")
            .select("refund_amount")
            .gte("return_date", startMonth)
            .lt("return_date", endMonth)
            .order("id", { ascending: true })
            .range(from, to);
          return { data: data as unknown as DashboardReturn[] | null, error };
        }),
      ]);
      const allSales = debtsResult.data ?? [];
      const todaySales = sales.filter((sale) => new Date(sale.sale_date).toISOString() >= startToday);
      const pendingStatuses = new Set(["new", "quotation", "designing", "approved", "production", "quality_check"]);
      const jobs = jobsResult.data ?? [];
      
      // Calculate total debt from sales directly
      const totalDebt = allSales.reduce((sum, sale) => {
        const unpaid = Number(sale.total || 0) - Number(sale.paid_amount || 0);
        return sum + Math.max(unpaid, 0);
      }, 0);
      
      const outstandingPurchases = (purchasesResult.data ?? []).reduce((sum, purchase) => {
        return sum + Math.max(Number(purchase.total_amount || 0) - Number(purchase.paid_amount || 0), 0);
      }, 0);
      const monthSalesTotal = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
      const monthExpensesTotal = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
      );

      const saleItems = await fetchRowsByIds<DashboardSaleItem>(
        sales.map((sale) => sale.id),
        async (saleIds, from, to) => {
          const { data, error } = await supabase
            .from("sale_items")
            .select("sale_id,product_id,quantity,discount,total")
            .in("sale_id", saleIds)
            .order("id", { ascending: true })
            .range(from, to);
          return { data: data as unknown as DashboardSaleItem[] | null, error };
        }
      );
      const productCosts = await fetchRowsByIds<DashboardProductCost>(
        saleItems.flatMap((item) => item.product_id ? [item.product_id] : []),
        async (productIds, from, to) => {
          const { data, error } = await supabase
            .from("products")
            .select("id,cost_price")
            .in("id", productIds)
            .order("id", { ascending: true })
            .range(from, to);
          return { data: data as unknown as DashboardProductCost[] | null, error };
        }
      );
      const costsByProduct = new Map(
        productCosts.map((product) => [product.id, amount(product.cost_price)])
      );
      const itemsBySale = new Map<string, DashboardSaleItem[]>();
      for (const item of saleItems) {
        const items = itemsBySale.get(item.sale_id) ?? [];
        items.push(item);
        itemsBySale.set(item.sale_id, items);
      }
      let monthItemRevenue = 0;
      let monthCostOfGoods = 0;
      let unlinkedItemRevenue = 0;
      const zeroCostProductIds = new Set<string>();
      for (const sale of sales) {
        const saleLines = itemsBySale.get(sale.id) ?? [];
        const itemRevenueTotal = saleLines.reduce(
          (sum, item) => sum + Math.max(amount(item.total), 0),
          0
        );
        if (itemRevenueTotal <= 0) continue;

        const itemDiscountTotal = saleLines.reduce(
          (sum, item) => sum + Math.max(amount(item.discount), 0),
          0
        );
        const invoiceDiscount = Math.max(
          amount(sale.discount) - itemDiscountTotal,
          0
        );

        for (const item of saleLines) {
          const lineRevenue = Math.max(amount(item.total), 0);
          const discountShare = invoiceDiscount * (lineRevenue / itemRevenueTotal);
          const netLineRevenue = lineRevenue - discountShare;
          if (!item.product_id || !costsByProduct.has(item.product_id)) {
            unlinkedItemRevenue += netLineRevenue;
            continue;
          }

          const unitCost = costsByProduct.get(item.product_id)!;
          monthItemRevenue += netLineRevenue;
          monthCostOfGoods += unitCost * Math.max(amount(item.quantity), 0);
          if (unitCost <= 0) zeroCostProductIds.add(item.product_id);
        }
      }
      const monthRefundTotal = returns.reduce(
        (sum, item) => sum + amount(item.refund_amount),
        0
      );
      const monthProfit =
        monthItemRevenue - monthCostOfGoods - monthExpensesTotal - monthRefundTotal;

      // Load recent sales with customer names
      const { data: salesWithCustomers } = await supabase
        .from("sales")
        .select("invoice_number,total,paid_amount,sale_date,customers(name)")
        .order("sale_date", { ascending: false })
        .limit(10);
      
      setRecentSales(
        (salesWithCustomers ?? []).map((sale) => ({
          invoice_number: String(sale.invoice_number ?? ""),
          customers: sale.customers as RecentSale["customers"],
          total: Number(sale.total ?? 0),
          paid_amount: Number(sale.paid_amount ?? 0),
          sale_date: String(sale.sale_date ?? ""),
        }))
      );
      
      // Count jobs by status for pipeline
      const statusCounts: Record<string, number> = {};
      pipelineTemplate.forEach(stage => {
        statusCounts[stage.status] = jobs.filter(job => job.status === stage.status).length;
      });
      setPipeline(pipelineTemplate.map(stage => ({ ...stage, value: statusCounts[stage.status] || 0 })));
      
      setMetrics({
        todaySales: todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
        todayInvoices: todaySales.length,
        monthSales: monthSalesTotal,
        debt: totalDebt,
        outstandingPurchases,
        pendingJobs: jobs.filter((job) => pendingStatuses.has(job.status)).length,
        dueToday: jobs.filter((job) => job.due_date && new Date(job.due_date).toISOString().slice(0, 10) === now.toISOString().slice(0, 10)).length,
        lowStock: (productsResult.data ?? []).filter((product) => Number(product.stock_quantity) <= Number(product.minimum_stock)).length,
        monthProfit,
        monthItemRevenue,
        monthCostOfGoods,
        monthExpenses: monthExpensesTotal,
        monthRefunds: monthRefundTotal,
        unlinkedItemRevenue,
        zeroCostProductCount: zeroCostProductIds.size,
      });
    }
    void loadDashboard().catch((error) => {
      console.error("Dashboard metrics load error:", error);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 px-5 py-5 backdrop-blur sm:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Print & Craft POS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Your daily production and business snapshot.</p>
          </div>
          <div className="flex items-center gap-3">
            <button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /></button>
            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{staffName.slice(0, 1).toUpperCase()}</span><span><span className="block text-xs font-bold">{staffName}</span><span className="block text-[10px] text-slate-400">Signed in</span></span></div>
          </div>
        </div>
      </header>

      <main className="space-y-6 p-5 sm:p-8 lg:p-10">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {getKpis(metrics).map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-500">{kpi.label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[kpi.tone]}`}><DashboardIcon name={kpi.icon} /></span></div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{kpi.value}</p><p className="mt-1 break-words text-xs leading-4 text-slate-400">{kpi.detail}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><SectionTitle eyebrow="Shortcuts" title="Quick actions" /><div className="flex flex-wrap gap-2">{quickActions.slice(0, 2).map((action) => <Link key={action.label} href={action.href} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><QuickActionIcon name={action.icon} /> <span className="ml-1">{action.label}</span></Link>)}</div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{quickActions.slice(2).map((action) => <Link key={action.label} href={action.href} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-blue-200 hover:bg-blue-50"><span className="text-blue-600"><QuickActionIcon name={action.icon} /></span><span className="mt-2 block text-xs font-bold text-slate-800">{action.label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-400">{action.description}</span></Link>)}</div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <SectionTitle eyebrow="Revenue" title="Sales overview" />
              <div className="flex flex-col items-end gap-2">
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
                  aria-label="Sales chart period"
                >
                  <option>Today</option>
                  <option>Yesterday</option>
                  <option>This week</option>
                  <option>This month</option>
                  <option>Custom</option>
                </select>
                {period === "Custom" && (
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
                    <label className="flex items-center gap-1">
                      From
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(event) => setCustomStartDate(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      To
                      <input
                        type="date"
                        value={customEndDate}
                        min={customStartDate}
                        onChange={(event) => setCustomEndDate(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-slate-950">{money(chartTotal)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {period === "Custom"
                  ? `Revenue from ${customStartDate} to ${customEndDate}`
                  : `Total revenue ${period.toLowerCase()}`}
              </p>
            </div>
            <div className="relative mt-6 flex h-56 items-end gap-2 border-b border-l border-slate-100 px-3 pb-0 pt-5 sm:gap-3">
              {chartPoints.map((point) => (
                <div
                  key={point.key}
                  title={`${point.label}: ${money(point.value)}`}
                  aria-label={`${point.label}: ${money(point.value)}`}
                  className="group flex h-full flex-1 items-end"
                >
                  {point.value > 0 && (
                    <div
                      className="w-full rounded-t-lg bg-blue-500/80 transition group-hover:bg-blue-600"
                      style={{ height: `${Math.max(point.height, 1.5)}%` }}
                    />
                  )}
                </div>
              ))}
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-slate-400">
                {chartLoading
                  ? "Loading sales…"
                  : chartError
                    ? chartError
                    : chartTotal === 0
                      ? "No sales in this period"
                      : null}
              </div>
            </div>
            <div className="mt-3 flex pl-3 text-[10px] font-semibold text-slate-400">
              {chartPoints.map((point) => (
                <span key={point.key} className="flex-1 text-center">
                  {point.displayLabel}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Production" title="Printing jobs" href="/production" hrefLabel="Open jobs" /><div className="mt-6 space-y-4">{pipeline.map((stage) => <div key={stage.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">{stage.label}</span><span className="font-bold text-slate-950">{stage.value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${stage.color}`} style={{ width: `${stage.value ? Math.min(100, stage.value * 10) : 3}%` }} /></div></div>)}</div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Track each custom order from design to delivery in one place.</div></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Priority queue" title="Jobs due today" href="/production" hrefLabel="View all jobs" /><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-y border-slate-100 text-[11px] uppercase tracking-wider text-slate-400"><tr><th className="py-3 pr-4 font-bold">Job</th><th className="px-4 py-3 font-bold">Customer</th><th className="px-4 py-3 font-bold">Due</th><th className="px-4 py-3 font-bold">Status</th><th className="py-3 pl-4 text-right font-bold">Action</th></tr></thead><tbody><tr><td colSpan={5} className="py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><DashboardIcon name="jobs" /></div><p className="mt-3 text-sm font-bold text-slate-700">No jobs due today</p><p className="mt-1 text-xs text-slate-400">New printing jobs will appear here.</p></td></tr></tbody></table></div></section>

        <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Collections" title="Customer debts" href="/outstanding" /><div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Total outstanding</p><p className="mt-1 text-2xl font-bold text-amber-950">{money(metrics.debt)}</p><p className="mt-1 text-xs text-amber-700">{metrics.debt > 0 ? `${Math.ceil(metrics.debt / 5000)} customer${Math.ceil(metrics.debt / 5000) === 1 ? "" : "s"} owe balances.` : "No customers currently owe a balance."}</p></div><div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Payment reminders and balances will appear here.</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Materials" title="Inventory alerts" href="/inventory" hrefLabel="View inventory" /><div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 p-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Stock health</p><p className="mt-1 text-lg font-bold text-emerald-950">{metrics.lowStock > 0 ? `${metrics.lowStock} item${metrics.lowStock === 1 ? "" : "s"} low` : "All stocked up"}</p><p className="mt-1 text-xs text-emerald-700">{metrics.lowStock > 0 ? "Action needed for restocking" : "No low-stock items to review."}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">{metrics.lowStock > 0 ? "!" : "Ã¢Å“â€œ"}</span></div><div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Paper, vinyl, ink and other materials will be listed here.</div></div></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Activity" title="Recent sales" href="/sales-history" /><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-y border-slate-100 text-[11px] uppercase tracking-wider text-slate-400"><tr><th className="py-3 pr-4 font-bold">Invoice</th><th className="px-4 py-3 font-bold">Customer</th><th className="px-4 py-3 font-bold">Amount</th><th className="px-4 py-3 font-bold">Payment</th><th className="py-3 pl-4 text-right font-bold">Date</th></tr></thead><tbody>{recentSales.length > 0 ? recentSales.map((sale) => <tr key={sale.invoice_number} className="border-b border-slate-100 hover:bg-slate-50"><td className="py-3 pr-4"><Link href={`/invoices/${sale.invoice_number}`} className="text-xs font-bold text-blue-600">{sale.invoice_number}</Link></td><td className="px-4 py-3 text-sm font-semibold text-slate-800">{Array.isArray(sale.customers) ? sale.customers[0]?.name : sale.customers?.name || "Walk-in"}</td><td className="px-4 py-3 text-sm font-bold text-slate-950">{money(Number(sale.total || 0))}</td><td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${Number(sale.paid_amount) >= Number(sale.total) ? "bg-emerald-50 text-emerald-700" : Number(sale.paid_amount) > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{Number(sale.paid_amount) >= Number(sale.total) ? "Paid" : Number(sale.paid_amount) > 0 ? "Partial" : "Unpaid"}</span></td><td className="py-3 pl-4 text-right text-xs text-slate-400">{new Date(sale.sale_date).toLocaleDateString("en-GB")}</td></tr>) : <tr><td colSpan={5} className="py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-400">Ã¢â€“Â¤</div><p className="mt-3 text-sm font-bold text-slate-700">No recent sales</p><p className="mt-1 text-xs text-slate-400">Create your first sale to see activity here.</p></td></tr>}</tbody></table></div></section>

        <footer className="pb-4 text-center text-xs text-slate-400">© 2026 Print & Craft (Pvt) Ltd. · POS System</footer>
      </main>
    </div>
  );
}
