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
  email: string | null;
  address: string | null;
  credit_limit: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

type Balance = {
  customer_id: string;
  total_sales: number;
  total_paid: number;
  outstanding_balance: number;
};

export default function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, Balance>>({});

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCreditLimit, setNewCreditLimit] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // =========================================================
  // LOAD DATA
  // =========================================================

  async function loadData() {
    try {
      setLoading(true);

      const [customersResult, balancesResult] = await Promise.all([
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
              is_active,
              created_at
            `
          )
          .order("name"),

        supabase
          .from("customer_balances")
          .select("customer_id, total_sales, total_paid, outstanding_balance"),
      ]);

      if (customersResult.error) {
        throw new Error(`Customers: ${customersResult.error.message}`);
      }

      if (balancesResult.error) {
        throw new Error(`Balances: ${balancesResult.error.message}`);
      }

      setCustomers((customersResult.data ?? []) as Customer[]);

      const balanceMap: Record<string, Balance> = {};

      (balancesResult.data ?? []).forEach((row: any) => {
        balanceMap[row.customer_id] = row as Balance;
      });

      setBalances(balanceMap);
    } catch (error) {
      console.error("Load customers error:", error);

      alert(
        error instanceof Error ? error.message : "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // MONEY
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

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(query) ||
        (customer.customer_code ?? "").toLowerCase().includes(query) ||
        (customer.phone ?? "").toLowerCase().includes(query) ||
        (customer.whatsapp ?? "").toLowerCase().includes(query) ||
        (customer.email ?? "").toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  // =========================================================
  // ADD CUSTOMER
  // =========================================================

  function openAddCustomer() {
    setNewName("");
    setNewPhone("");
    setNewWhatsapp("");
    setNewEmail("");
    setNewAddress("");
    setNewCreditLimit("");
    setNewNotes("");
    setShowAddCustomer(true);
  }

  async function addCustomer() {
    const name = newName.trim();

    if (!name) {
      alert("Please enter the customer's name.");
      return;
    }

    const creditLimit = newCreditLimit.trim()
      ? Number(newCreditLimit)
      : null;

    if (creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit < 0)) {
      alert("Please enter a valid credit limit, or leave it blank.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from("customers").insert({
        name,
        phone: newPhone.trim() || null,
        whatsapp: newWhatsapp.trim() || null,
        email: newEmail.trim() || null,
        address: newAddress.trim() || null,
        credit_limit: creditLimit,
        notes: newNotes.trim() || null,
        is_active: true,
      });

      if (error) {
        throw new Error(error.message);
      }

      setShowAddCustomer(false);
      await loadData();
    } catch (error) {
      console.error("Add customer error:", error);

      alert(
        error instanceof Error ? error.message : "Unable to add customer."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl">⏳</div>
          <p className="mt-3 text-sm text-slate-500">Loading customers...</p>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-[1100px]">
        {/* HEADER */}

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Customers
            </h1>

            <p className="text-sm text-slate-500">
              {customers.length}{" "}
              {customers.length === 1 ? "customer" : "customers"} on file.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddCustomer}
            className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            + Add Customer
          </button>
        </div>

        {/* SEARCH */}

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by name, phone, code or email..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />
        </div>

        {/* LIST */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {filteredCustomers.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl">👥</div>

              <p className="mt-2 text-sm font-semibold text-slate-700">
                No customers found
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {search.trim()
                  ? "Try a different search term."
                  : "Add your first customer to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Name
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Contact
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      Total Purchases
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                      Outstanding
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => {
                    const balance = balances[customer.id];

                    const outstanding = balance?.outstanding_balance ?? 0;

                    return (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 align-middle">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-semibold text-slate-900 hover:underline"
                          >
                            {customer.name}
                          </Link>

                          {customer.customer_code && (
                            <div className="mt-0.5 text-xs text-slate-400">
                              {customer.customer_code}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 align-middle text-sm text-slate-600">
                          {customer.phone || customer.whatsapp || "—"}
                        </td>

                        <td className="px-4 py-4 text-right align-middle text-sm font-semibold text-slate-800">
                          {money(balance?.total_sales ?? 0)}
                        </td>

                        <td className="px-4 py-4 text-right align-middle">
                          <span
                            className={`text-sm font-bold ${
                              outstanding > 0
                                ? "text-orange-600"
                                : "text-slate-400"
                            }`}
                          >
                            {money(outstanding)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center align-middle">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              customer.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {customer.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          ADD CUSTOMER MODAL
      ================================================= */}

      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-xl font-black">Add Customer</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">
                  Name
                </label>

                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Phone
                </label>

                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  WhatsApp
                </label>

                <input
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  placeholder="Optional, if different from phone"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">
                  Email
                </label>

                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">
                  Address
                </label>

                <input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Credit Limit
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">
                  Notes
                </label>

                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={addCustomer}
                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}