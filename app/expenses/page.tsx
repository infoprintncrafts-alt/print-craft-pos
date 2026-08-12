"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Expense = {
  id: string;
  expense_date: string;
  category: string | null;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("expenses")
        .select("id, expense_date, category, amount, payment_method, notes, created_at")
        .order("expense_date", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setExpenses((data || []) as Expense[]);
    } catch (err) {
      console.error("Expenses load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  }

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return expenses;
    }

    return expenses.filter((expense) => {
      return (
        expense.category?.toLowerCase().includes(query) ||
        expense.payment_method?.toLowerCase().includes(query) ||
        expense.notes?.toLowerCase().includes(query)
      );
    });
  }, [expenses, search]);

  async function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const expenseAmount = Number(amount);

    if (!date) {
      alert("Please select an expense date.");
      return;
    }

    if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { error } = await supabase.from("expenses").insert({
        expense_date: new Date(date).toISOString(),
        category: category.trim() || null,
        amount: expenseAmount,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setDate(new Date().toISOString().slice(0, 10));
      setCategory("");
      setAmount("");
      setPaymentMethod("cash");
      setNotes("");

      await loadExpenses();
    } catch (err) {
      console.error("Create expense error:", err);
      setError(err instanceof Error ? err.message : "Unable to save expense.");
    } finally {
      setSaving(false);
    }
  }

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses]
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
            <p className="mt-2 text-sm text-slate-500">
              Track business expenses and payment methods.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Total records</div>
              <div>{expenses.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Total expenses</div>
              <div>{money(totalExpenses)}</div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Search</div>
              <div>{search || "Type to filter"}</div>
            </div>
          </div>
        </div>

        <form className="mb-8 space-y-4 rounded-3xl bg-slate-50 p-6" onSubmit={createExpense}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Office, utilities, rent..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Optional details"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <p className="text-sm text-slate-500">
              Expenses are stored for reporting and cost analysis.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving expense..." : "Record Expense"}
            </button>
          </div>

          {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        </form>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900">Expense History</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black sm:w-[320px]"
          />
        </div>

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">No expense records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Method</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-4 text-slate-600">{formatDate(expense.expense_date)}</td>
                    <td className="px-4 py-4 text-slate-900">{expense.category || "General"}</td>
                    <td className="px-4 py-4 text-slate-900">{money(expense.amount)}</td>
                    <td className="px-4 py-4 text-slate-600">{expense.payment_method || "Unknown"}</td>
                    <td className="px-4 py-4 text-slate-600">{expense.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
