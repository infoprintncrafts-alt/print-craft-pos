"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  stock_quantity: number;
  track_stock: boolean;
  unit: string | null;
};

type ReturnRecord = {
  id: string;
  return_date: string;
  product_id: string | null;
  product_name: string | null;
  sale_id: string | null;
  quantity: number;
  refund_amount: number;
  reason: string | null;
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

export default function ReturnsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState("");
  const [saleId, setSaleId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [productsResult, returnsResult] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, stock_quantity, track_stock, unit")
          .order("name", { ascending: true }),
        supabase
          .from("returns")
          .select(
            "id, return_date, product_id, product_name, sale_id, quantity, refund_amount, reason, created_at"
          )
          .order("return_date", { ascending: false }),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (returnsResult.error) throw returnsResult.error;

      setProducts((productsResult.data || []) as Product[]);
      setReturns((returnsResult.data || []) as ReturnRecord[]);
    } catch (err) {
      console.error("Returns load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load returns.");
    } finally {
      setLoading(false);
    }
  }

  const filteredReturns = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return returns;
    }

    return returns.filter((record) => {
      return (
        (record.product_name || "").toLowerCase().includes(query) ||
        (record.sale_id || "").toLowerCase().includes(query) ||
        (record.reason || "").toLowerCase().includes(query)
      );
    });
  }, [returns, search]);

  async function createReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const returnQuantity = Number(quantity);
    const refund = Number(refundAmount) || 0;

    if (!returnDate) {
      alert("Please select a return date.");
      return;
    }

    if (!Number.isFinite(returnQuantity) || returnQuantity <= 0) {
      alert("Please enter a valid return quantity.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const selectedProduct = products.find((product) => product.id === productId);

      const { error: insertError } = await supabase.from("returns").insert({
        return_date: new Date(returnDate).toISOString(),
        product_id: productId || null,
        product_name: selectedProduct?.name || null,
        sale_id: saleId.trim() || null,
        quantity: returnQuantity,
        refund_amount: refund,
        reason: reason.trim() || null,
      });

      if (insertError) {
        throw insertError;
      }

      if (selectedProduct && selectedProduct.track_stock) {
        const newQuantity = Number(selectedProduct.stock_quantity) + returnQuantity;

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_quantity: newQuantity })
          .eq("id", selectedProduct.id);

        if (updateError) {
          throw updateError;
        }

        await supabase.from("stock_movements").insert({
          product_id: selectedProduct.id,
          movement_type: "return",
          quantity_change: returnQuantity,
          resulting_quantity: newQuantity,
          reference_type: "return",
          reference_id: null,
          notes: `Return ${selectedProduct.name}`,
          created_by: null,
        });
      }

      setReturnDate(new Date().toISOString().slice(0, 10));
      setProductId("");
      setSaleId("");
      setQuantity("1");
      setRefundAmount("");
      setReason("");

      await loadData();
    } catch (err) {
      console.error("Create return error:", err);
      setError(err instanceof Error ? err.message : "Unable to record return.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Returns</h1>
            <p className="mt-2 text-sm text-slate-500">
              Record product returns, restock inventory, and track refund amounts.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Return records</div>
              <div>{returns.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold">Products loaded</div>
              <div>{products.length}</div>
            </div>
          </div>
        </div>

        <form className="mb-8 space-y-4 rounded-3xl bg-slate-50 p-6" onSubmit={createReturn}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Sale ID (optional)</label>
              <input
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Invoice or sale reference"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Refund Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Reason</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Damaged, wrong item, etc."
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Returns will restock inventory when the returned product has tracking enabled.</p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Recording return..." : "Record Return"}
            </button>
          </div>

          {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        </form>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900">Return History</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search return records..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black sm:w-[320px]"
          />
        </div>

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">Loading returns...</div>
        ) : filteredReturns.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">No returns recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Product</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Sale</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Qty</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Refund</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((record) => (
                  <tr key={record.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-4 text-slate-600">{formatDate(record.return_date)}</td>
                    <td className="px-4 py-4 text-slate-900">{record.product_name || "Unknown"}</td>
                    <td className="px-4 py-4 text-slate-600">{record.sale_id || "—"}</td>
                    <td className="px-4 py-4 text-slate-900">{record.quantity}</td>
                    <td className="px-4 py-4 text-slate-900">{money(record.refund_amount)}</td>
                    <td className="px-4 py-4 text-slate-600">{record.reason || "—"}</td>
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
