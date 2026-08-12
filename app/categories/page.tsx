"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, notes, created_at")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setCategories((data || []) as Category[]);
    } catch (err) {
      console.error("Load categories error:", err);
      setError(err instanceof Error ? err.message : "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newCategory.trim();

    if (!name) {
      alert("Please enter a category name.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { error } = await supabase.from("categories").insert({
        name,
        notes: newNotes.trim() || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setNewCategory("");
      setNewNotes("");
      await loadCategories();
    } catch (err) {
      console.error("Create category error:", err);
      setError(err instanceof Error ? err.message : "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
            <p className="mt-2 text-sm text-slate-500">
              Create and manage product categories for your business.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {categories.length} category{categories.length === 1 ? "" : "ies"}
          </div>
        </div>

        <form className="mb-8 grid gap-4 lg:grid-cols-[1fr_240px]" onSubmit={createCategory}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Category Name</label>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="e.g. Printing, Gifts, Services"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
            <input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="Optional description"
            />
          </div>

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Category"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            No categories found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Notes</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-4 text-slate-900">{category.name}</td>
                    <td className="px-4 py-4 text-slate-600">{category.notes || "—"}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(category.created_at).toLocaleDateString("en-GB")}</td>
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
