"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  product_code: string | null;
  category: string | null;
  unit: string | null;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  track_stock: boolean;
  is_active: boolean;
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

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "low">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, sku, product_code, category, unit, selling_price, stock_quantity, minimum_stock, track_stock, is_active"
        )
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setProducts((data || []) as Product[]);
    } catch (err) {
      console.error("Inventory error:", err);
      setError(err instanceof Error ? err.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        (product.sku || "").toLowerCase().includes(query) ||
        (product.product_code || "").toLowerCase().includes(query) ||
        (product.category || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? product.is_active
          : statusFilter === "inactive"
          ? !product.is_active
          : product.track_stock && product.stock_quantity <= product.minimum_stock;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const lowStockCount = products.filter(
    (product) => product.track_stock && product.stock_quantity <= product.minimum_stock
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
            <p className="mt-2 text-sm text-slate-500">
              Track stock, manage products, and spot low inventory items.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Total items</div>
              <div>{products.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Low stock</div>
              <div>{lowStockCount}</div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Tracked</div>
              <div>{products.filter((item) => item.track_stock).length}</div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU or category..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
          >
            <option value="all">All inventory</option>
            <option value="active">Active products</option>
            <option value="inactive">Inactive products</option>
            <option value="low">Low stock</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            Loading inventory...
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            No products match this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Product</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">SKU</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Price</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Stock</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isLowStock =
                    product.track_stock && product.stock_quantity <= product.minimum_stock;
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-slate-200 ${
                        isLowStock ? "bg-amber-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900">{product.name}</td>
                      <td className="px-4 py-4 text-slate-600">{product.sku || product.product_code || "—"}</td>
                      <td className="px-4 py-4 text-slate-600">{product.category || "—"}</td>
                      <td className="px-4 py-4 text-slate-900">{money(product.selling_price)}</td>
                      <td className="px-4 py-4 text-slate-900">{product.stock_quantity}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          isLowStock
                            ? "bg-amber-100 text-amber-700"
                            : product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {isLowStock ? "LOW STOCK" : product.is_active ? "ACTIVE" : "INACTIVE"}
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
    </main>
  );
}
