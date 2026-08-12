"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const mainMenu = [
  { name: "Orders / Jobs", href: "/orders", icon: "J" },
  { name: "Production", href: "/production", icon: "P" },
  { name: "Dashboard", href: "/", icon: "⌂" },
  { name: "New Sale", href: "/sales", icon: "＋" },
  { name: "Sales History", href: "/sales-history", icon: "▣" },
  { name: "Customers", href: "/customers", icon: "♙" },
  { name: "Products", href: "/products", icon: "▦" },
  { name: "Categories", href: "/categories", icon: "▤" },
  { name: "Inventory", href: "/inventory", icon: "📦" },
  { name: "Purchases", href: "/purchases", icon: "↙" },
  { name: "Suppliers", href: "/suppliers", icon: "🏷" },
  { name: "Returns", href: "/returns", icon: "↩" },
];

const financeMenu = [
  { name: "Payments", href: "/payments", icon: "◈" },
  { name: "Customer Payments", href: "/customer-payments", icon: "💳" },
  { name: "Payment History", href: "/payment-history", icon: "📜" },
  { name: "Invoices", href: "/invoices", icon: "🧾" },
  { name: "Outstanding", href: "/outstanding", icon: "⚠" },
  { name: "Expenses", href: "/expenses", icon: "−" },
  { name: "Reports", href: "/reports", icon: "▥" },
];

const settingsMenu = [
  { name: "Staff", href: "/staff", icon: "♟" },
  { name: "Settings", href: "/settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-slate-950 text-white lg:flex">

      {/* Logo */}
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold shadow-lg shadow-blue-600/20">
          P
        </div>

        <div className="ml-3">
          <h1 className="text-sm font-bold tracking-wide">
            PRINT & CRAFT
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            POS SYSTEM
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6">

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Main Menu
        </p>

        <nav className="space-y-1">
          {mainMenu.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`mr-3 flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                    active
                      ? "bg-white/10"
                      : "bg-white/5 group-hover:bg-white/10"
                  }`}
                >
                  {item.icon}
                </span>

                {item.name}
              </Link>
            );
          })}
        </nav>

        <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Finance
        </p>

        <nav className="space-y-1">
          {financeMenu.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`mr-3 flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                    active
                      ? "bg-white/10"
                      : "bg-white/5 group-hover:bg-white/10"
                  }`}
                >
                  {item.icon}
                </span>

                {item.name}
              </Link>
            );
          })}
        </nav>

        <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Management
        </p>

        <nav className="space-y-1">
          {settingsMenu.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`mr-3 flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                    active
                      ? "bg-white/10"
                      : "bg-white/5 group-hover:bg-white/10"
                  }`}
                >
                  {item.icon}
                </span>

                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center rounded-xl bg-white/5 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold">
            A
          </div>

          <div className="ml-3 min-w-0">
            <p className="truncate text-sm font-semibold">
              Administrator
            </p>

            <p className="text-xs text-slate-500">
              Admin
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
