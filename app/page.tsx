"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const emptyMetrics = { todaySales: 0, todayInvoices: 0, monthSales: 0, debt: 0, pendingJobs: 0, dueToday: 0, lowStock: 0, monthProfit: 0 };

function money(value: number) { return `LKR ${value.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function getKpis(metrics: typeof emptyMetrics) {
  return [
  { label: "Today's sales", value: money(metrics.todaySales), detail: `${metrics.todayInvoices} invoice${metrics.todayInvoices === 1 ? "" : "s"} today`, tone: "blue", icon: "↗" },
  { label: "Invoices today", value: String(metrics.todayInvoices), detail: "Completed invoices", tone: "indigo", icon: "▤" },
  { label: "This month's sales", value: money(metrics.monthSales), detail: "Current calendar month", tone: "violet", icon: "▥" },
  { label: "Outstanding debt", value: money(metrics.debt), detail: "Derived from invoice balances", tone: "amber", icon: "!" },
  { label: "Pending jobs", value: String(metrics.pendingJobs), detail: "Across all production stages", tone: "orange", icon: "⚒" },
  { label: "Due today", value: String(metrics.dueToday), detail: "Jobs to complete", tone: "rose", icon: "◷" },
  { label: "Low stock items", value: String(metrics.lowStock), detail: metrics.lowStock ? "Needs restocking" : "Everything is in stock", tone: "emerald", icon: "□" },
  { label: "Profit this month", value: money(metrics.monthProfit), detail: "Sales less recorded expenses", tone: "teal", icon: "✦" },
] as const;
}

const quickActions = [
  { label: "New sale", description: "Create an invoice", href: "/sales", icon: "+", primary: true },
  { label: "New printing job", description: "Start a custom order", href: "/orders", icon: "✦", primary: true },
  { label: "New customer", description: "Add a customer", href: "/customers", icon: "♙" },
  { label: "Record payment", description: "Collect an outstanding balance", href: "/customer-payments", icon: "◉" },
  { label: "Add stock", description: "Update inventory", href: "/inventory", icon: "□" },
  { label: "Add expense", description: "Log a business cost", href: "/expenses", icon: "−" },
  { label: "View reports", description: "See business performance", href: "/reports", icon: "▥" },
  { label: "Print invoice", description: "Find an invoice to print", href: "/invoices", icon: "▤" },
] as const;

const pipeline = [
  { label: "New order", value: 0, color: "bg-slate-400" },
  { label: "Design pending", value: 0, color: "bg-violet-500" },
  { label: "In production", value: 0, color: "bg-blue-500" },
  { label: "Quality check", value: 0, color: "bg-amber-500" },
  { label: "Ready", value: 0, color: "bg-emerald-500" },
];
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

export default function Home() {
  const [period, setPeriod] = useState("Today");
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [chartBars, setChartBars] = useState<number[]>([]);
  const [chartTotal, setChartTotal] = useState(0);
  const [chartLabels, setChartLabels] = useState<string[]>([]);

  async function loadChartData(selectedPeriod: string) {
    const now = new Date();
    let startDate: Date;
    let groupByHour = true;

    switch (selectedPeriod) {
      case "Today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        groupByHour = true;
        break;
      case "Yesterday":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        groupByHour = true;
        break;
      case "This week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        groupByHour = false;
        break;
      case "This month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupByHour = false;
        break;
      default:
        return;
    }

    const { data: sales } = await supabase
      .from("sales")
      .select("sale_date,total")
      .gte("sale_date", startDate.toISOString());

    const salesByTime: Record<string, number> = {};
    (sales ?? []).forEach((sale) => {
      const saleDate = new Date(sale.sale_date);
      let key: string;

      if (groupByHour) {
        key = saleDate.getHours().toString().padStart(2, "0");
      } else {
        key = saleDate.toLocaleDateString("en-US", { weekday: "short" }).substring(0, 3);
      }

      salesByTime[key] = (salesByTime[key] || 0) + Number(sale.total || 0);
    });

    if (groupByHour) {
      const labels: string[] = [];
      const bars: number[] = [];
      const maxSale = Math.max(...Object.values(salesByTime), 1);

      for (let hour = 0; hour < 24; hour += 2) {
        const key = hour.toString().padStart(2, "0");
        labels.push(`${key}:00`);
        bars.push((salesByTime[key] || 0) / maxSale * 100);
      }

      setChartLabels(labels);
      setChartBars(bars);
      setChartTotal(Object.values(salesByTime).reduce((a, b) => a + b, 0));
    } else {
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const bars: number[] = [];
      const maxSale = Math.max(...Object.values(salesByTime), 1);

      dayLabels.forEach((label) => {
        bars.push((salesByTime[label] || 0) / maxSale * 100);
      });

      setChartLabels(dayLabels);
      setChartBars(bars);
      setChartTotal(Object.values(salesByTime).reduce((a, b) => a + b, 0));
    }
  }

  useEffect(() => {
    void loadChartData(period);
  }, [period]);

  useEffect(() => {
    async function loadDashboard() {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const [salesResult, expensesResult, productsResult, debtsResult, jobsResult] = await Promise.all([
        supabase.from("sales").select("sale_date,total,paid_amount").gte("sale_date", startMonth),
        supabase.from("expenses").select("expense_date,amount").gte("expense_date", startMonth),
        supabase.from("products").select("stock_quantity,minimum_stock").eq("is_active", true),
        supabase.from("customer_balances").select("outstanding_balance"),
        supabase.from("orders").select("status,due_date"),
      ]);
      const sales = salesResult.data ?? [];
      const expenses = expensesResult.data ?? [];
      const todaySales = sales.filter((sale) => new Date(sale.sale_date).toISOString() >= startToday);
      const pendingStatuses = new Set(["new", "quotation", "designing", "approved", "production", "quality_check"]);
      const jobs = jobsResult.data ?? [];
      setMetrics({
        todaySales: todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
        todayInvoices: todaySales.length,
        monthSales: sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
        debt: (debtsResult.data ?? []).reduce((sum, row) => sum + Number(row.outstanding_balance || 0), 0),
        pendingJobs: jobs.filter((job) => pendingStatuses.has(job.status)).length,
        dueToday: jobs.filter((job) => job.due_date && new Date(job.due_date).toISOString().slice(0, 10) === now.toISOString().slice(0, 10)).length,
        lowStock: (productsResult.data ?? []).filter((product) => Number(product.stock_quantity) <= Number(product.minimum_stock)).length,
        monthProfit: sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0) - expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      });
    }
    void loadDashboard();
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
            <button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600">♢<span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /></button>
            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">A</span><span><span className="block text-xs font-bold">Administrator</span><span className="block text-[10px] text-slate-400">Admin</span></span></div>
          </div>
        </div>
      </header>

      <main className="space-y-6 p-5 sm:p-8 lg:p-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {getKpis(metrics).map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-500">{kpi.label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${toneClasses[kpi.tone]}`}>{kpi.icon}</span></div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{kpi.value}</p><p className="mt-1 text-xs text-slate-400">{kpi.detail}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><SectionTitle eyebrow="Shortcuts" title="Quick actions" /><div className="flex flex-wrap gap-2">{quickActions.slice(0, 2).map((action) => <Link key={action.label} href={action.href} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">{action.icon} <span className="ml-1">{action.label}</span></Link>)}</div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{quickActions.slice(2).map((action) => <Link key={action.label} href={action.href} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-blue-200 hover:bg-blue-50"><span className="text-lg text-blue-600">{action.icon}</span><span className="mt-2 block text-xs font-bold text-slate-800">{action.label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-400">{action.description}</span></Link>)}</div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><SectionTitle eyebrow="Revenue" title="Sales overview" /><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none"><option>Today</option><option>Yesterday</option><option>This week</option><option>This month</option><option>Custom</option></select></div><div className="mt-2"><p className="text-2xl font-bold text-slate-950">{money(chartTotal)}</p><p className="mt-1 text-xs text-slate-400">Total revenue {period.toLowerCase()}</p></div><div className="mt-6 flex h-56 items-end gap-2 border-b border-l border-slate-100 px-3 pb-0 pt-5 sm:gap-3">{chartBars.length > 0 ? chartBars.map((height, index) => <div key={index} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-lg bg-blue-500/80 transition group-hover:bg-blue-600" style={{ height: `${Math.max(height, 3)}%` }} /></div>) : <div className="flex w-full items-center justify-center text-slate-400"><p>No sales data available</p></div>}</div><div className="mt-3 flex justify-between pl-3 text-[10px] font-semibold text-slate-400">{chartLabels.length > 0 && chartLabels.length <= 12 ? chartLabels.map((label, i) => i % Math.ceil(chartLabels.length / 6) === 0 && <span key={i}>{label}</span>) : chartLabels.slice(0, 6).map((label, i) => <span key={i}>{label}</span>)}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Production" title="Printing jobs" href="/sales" hrefLabel="Open jobs" /><div className="mt-6 space-y-4">{pipeline.map((stage) => <div key={stage.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">{stage.label}</span><span className="font-bold text-slate-950">{stage.value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${stage.color}`} style={{ width: `${stage.value ? Math.min(100, stage.value * 10) : 3}%` }} /></div></div>)}</div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Track each custom order from design to delivery in one place.</div></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Priority queue" title="Jobs due today" href="/sales" hrefLabel="View all jobs" /><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-y border-slate-100 text-[11px] uppercase tracking-wider text-slate-400"><tr><th className="py-3 pr-4 font-bold">Job</th><th className="px-4 py-3 font-bold">Customer</th><th className="px-4 py-3 font-bold">Due</th><th className="px-4 py-3 font-bold">Status</th><th className="py-3 pl-4 text-right font-bold">Action</th></tr></thead><tbody><tr><td colSpan={5} className="py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-400">✓</div><p className="mt-3 text-sm font-bold text-slate-700">No jobs due today</p><p className="mt-1 text-xs text-slate-400">New printing jobs will appear here.</p></td></tr></tbody></table></div></section>

        <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Collections" title="Customer debts" href="/outstanding" /><div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Total outstanding</p><p className="mt-1 text-2xl font-bold text-amber-950">LKR 0.00</p><p className="mt-1 text-xs text-amber-700">No customers currently owe a balance.</p></div><div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Payment reminders and balances will appear here.</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Materials" title="Inventory alerts" href="/inventory" hrefLabel="View inventory" /><div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 p-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Stock health</p><p className="mt-1 text-lg font-bold text-emerald-950">All stocked up</p><p className="mt-1 text-xs text-emerald-700">No low-stock items to review.</p></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">✓</span></div><div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Paper, vinyl, ink and other materials will be listed here.</div></div></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle eyebrow="Activity" title="Recent sales" href="/sales-history" /><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-y border-slate-100 text-[11px] uppercase tracking-wider text-slate-400"><tr><th className="py-3 pr-4 font-bold">Invoice</th><th className="px-4 py-3 font-bold">Customer</th><th className="px-4 py-3 font-bold">Amount</th><th className="px-4 py-3 font-bold">Payment</th><th className="py-3 pl-4 text-right font-bold">Date</th></tr></thead><tbody><tr><td colSpan={5} className="py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-400">▤</div><p className="mt-3 text-sm font-bold text-slate-700">No recent sales</p><p className="mt-1 text-xs text-slate-400">Create your first sale to see activity here.</p></td></tr></tbody></table></div></section>

        <footer className="pb-4 text-center text-xs text-slate-400">© 2026 Print & Craft (Pvt) Ltd. · POS System</footer>
      </main>
    </div>
  );
}
