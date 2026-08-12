"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
type Supplier = { id: string; supplier_name: string };
type Product = { id: string; name: string; cost_price: number };
type Purchase = {
  id: string;
  purchase_number: string;
  supplier_name: string | null;
  purchase_date: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string | null;
};
type Item = {
  product_id: string;
  item_name: string;
  quantity: string;
  unit_cost: string;
};
const money = (n: number) =>
  `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const blank = (): Item => ({
  product_id: "",
  item_name: "",
  quantity: "1",
  unit_cost: "",
});
export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]),
    [suppliers, setSuppliers] = useState<Supplier[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [show, setShow] = useState(false),
    [paymentOnly, setPaymentOnly] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [editingId, setEditingId] = useState<string | null>(null),
    [supplierId, setSupplierId] = useState(""),
    [supplierName, setSupplierName] = useState(""),
    [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)),
    [status, setStatus] = useState("pending"),
    [notes, setNotes] = useState(""),
    [paymentAmount, setPaymentAmount] = useState(""),
    [paymentMethod, setPaymentMethod] = useState("cash"),
    [paymentReference, setPaymentReference] = useState(""),
    [items, setItems] = useState<Item[]>([blank()]);
  async function load() {
    const [p, s, pr] = await Promise.all([
      supabase
        .from("purchases")
        .select(
          "id,purchase_number,supplier_name,purchase_date,total_amount,paid_amount,payment_status",
        )
        .order("purchase_date", { ascending: false }),
      supabase
        .from("suppliers")
        .select("id,supplier_name")
        .order("supplier_name"),
      supabase
        .from("products")
        .select("id,name,cost_price")
        .eq("is_active", true)
        .order("name"),
    ]);
    if (p.error) setError(p.error.message);
    setPurchases((p.data ?? []) as Purchase[]);
    setSuppliers((s.data ?? []) as Supplier[]);
    setProducts((pr.data ?? []) as Product[]);
  }
  useEffect(() => {
    void load();
  }, []);
  const total = useMemo(
    () =>
      Number(
        items
          .reduce(
            (sum, i) =>
              sum + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0),
            0,
          )
          .toFixed(2),
      ),
    [items],
  );
  function setItem(index: number, patch: Partial<Item>) {
    setItems((a) => a.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  }
  function choose(index: number, id: string) {
    const p = products.find((x) => x.id === id);
    setItem(index, {
      product_id: id,
      item_name: p?.name || "",
      unit_cost: p ? String(p.cost_price || 0) : "",
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    const supplier =
      supplierName.trim() ||
      suppliers.find((s) => s.id === supplierId)?.supplier_name ||
      "";
    const valid = items.filter(
      (i) => i.item_name.trim() && (Number(i.quantity) || 0) > 0,
    );
    if (!supplier) {
      setError("Select an existing supplier or enter a custom supplier.");
      return;
    }
    if (!valid.length) {
      setError("Add at least one item.");
      return;
    }
    setSaving(true);
    const payload = {
      supplier_id: supplierId || null,
      supplier_name: supplier,
      purchase_date: new Date(date).toISOString(),
      total_amount: total,
      payment_status: status,
      notes: notes.trim() || null,
    };
    let id = editingId;
    let err: any = null;
    if (id)
      err = (await supabase.from("purchases").update(payload).eq("id", id))
        .error;
    else {
      const r = await supabase
        .from("purchases")
        .insert({
          purchase_number: `PUR-${Date.now().toString().slice(-8)}`,
          ...payload,
        })
        .select("id")
        .single();
      err = r.error;
      id = r.data?.id || null;
    }
    if (err || !id) {
      setError(err?.message || "Unable to save purchase.");
      setSaving(false);
      return;
    }
    if (editingId)
      await supabase.from("purchase_items").delete().eq("purchase_id", id);
    const itemErr = (
      await supabase.from("purchase_items").insert(
        valid.map((i) => ({
          purchase_id: id,
          product_id: i.product_id || null,
          item_name: i.item_name.trim(),
          quantity: Number(i.quantity),
          unit_cost: Number(i.unit_cost) || 0,
          total: (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0),
        })),
      )
    ).error;
    if (itemErr) setError(itemErr.message);
    else {
      closeForm();
      await load();
    }
    setSaving(false);
  }
  function closeForm() {
    setShow(false);
    setPaymentOnly(false);
    setEditingId(null);
    setSupplierId("");
    setSupplierName("");
    setStatus("pending");
    setNotes("");
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentMethod("cash");
    setItems([blank()]);
  }
  function edit(p: Purchase) {
    setEditingId(p.id);
    setSupplierName(p.supplier_name || "");
    setDate(p.purchase_date.slice(0, 10));
    setStatus(p.payment_status || "pending");
    setPaymentAmount("");
    setPaymentOnly(true);
    setShow(true);
  }
  async function recordPayment() {
    if (!editingId) {
      setError("Open an existing purchase with Edit / Pay first.");
      return;
    }
    const amount = Number(paymentAmount);
    const purchase = purchases.find((p) => p.id === editingId);
    const remaining = Math.max(
      Number(purchase?.total_amount || 0) - Number(purchase?.paid_amount || 0),
      0,
    );
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      setError("Enter a valid supplier payment amount.");
      return;
    }
    setSaving(true);
    const { error: paymentError } = await supabase.rpc("record_supplier_payment", {
      p_purchase_id: editingId,
      p_supplier_id: supplierId || null,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_reference: paymentReference.trim() || null,
    });
    if (paymentError) {
      setError(paymentError.message);
      setSaving(false);
      return;
    }
    setPaymentAmount("");
    setPaymentReference("");
    setSaving(false);
    await load();
  }
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Purchases</h1>
            <p className="mt-2 text-sm text-slate-500">
              Record and update supplier purchases.
            </p>
          </div>
          <button
            onClick={() => {
              if (show) closeForm();
              else {
                setEditingId(null);
                setPaymentOnly(false);
                setShow(true);
              }
            }}
            className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white"
          >
            {show ? "Cancel" : "New Purchase"}
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {show && (
          <form
            onSubmit={save}
            className="mb-8 space-y-5 rounded-2xl bg-slate-50 p-5"
          >
            {!paymentOnly && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    value={supplierId}
                    onChange={(e) => {
                      setSupplierId(e.target.value);
                      setSupplierName("");
                    }}
                    className="rounded-xl border px-3 py-3 text-sm"
                  >
                    <option value="">Select existing supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplier_name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={supplierName}
                    onChange={(e) => {
                      setSupplierName(e.target.value);
                      setSupplierId("");
                    }}
                    placeholder="Or custom supplier"
                    className="rounded-xl border px-3 py-3 text-sm"
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl border px-3 py-3 text-sm"
                  />
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-5">
                    <select
                      value={item.product_id}
                      onChange={(e) => choose(i, e.target.value)}
                      className="rounded-xl border px-3 py-3 text-sm"
                    >
                      <option value="">Existing product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.item_name}
                      onChange={(e) =>
                        setItem(i, { item_name: e.target.value })
                      }
                      placeholder="Item name"
                      className="rounded-xl border px-3 py-3 text-sm"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value })}
                      placeholder="Qty"
                      className="rounded-xl border px-3 py-3 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) =>
                        setItem(i, { unit_cost: e.target.value })
                      }
                      placeholder="Unit cost"
                      className="rounded-xl border px-3 py-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setItems((a) =>
                          a.length === 1 ? a : a.filter((_, n) => n !== i),
                        )
                      }
                      className="rounded-xl border text-xs text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setItems((a) => [...a, blank()])}
                  className="rounded-xl border px-4 py-2 text-sm font-bold text-blue-600"
                >
                  + Add item row
                </button>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-lg">Total: {money(total)}</strong>
                  <div className="flex gap-2">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="rounded-xl border px-3 py-3 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                    </select>
                    <button
                      disabled={saving}
                      className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white"
                    >
                      {saving
                        ? "Saving…"
                        : editingId
                          ? "Update Purchase"
                          : "Save Purchase"}
                    </button>
                  </div>
                </div>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes"
                  className="w-full rounded-xl border px-3 py-3 text-sm"
                />
              </>
            )}
            {editingId && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                {(() => {
                  const selected = purchases.find((p) => p.id === editingId);
                  const balance = Math.max(
                    Number(selected?.total_amount || 0) -
                      Number(selected?.paid_amount || 0),
                    0,
                  );
                  return (
                    <>
                      <p className="text-sm font-bold text-blue-900">
                        Payment for{" "}
                        {selected?.purchase_number || "selected purchase"}
                      </p>
                      <p className="mt-1 text-xs text-blue-700">
                        Total {money(Number(selected?.total_amount || 0))} ·
                        Paid {money(Number(selected?.paid_amount || 0))} ·
                        Remaining {money(balance)}
                      </p>
                    </>
                  );
                })()}
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    max={Math.max(
                      Number(
                        purchases.find((p) => p.id === editingId)
                          ?.total_amount || 0,
                      ) -
                        Number(
                          purchases.find((p) => p.id === editingId)
                            ?.paid_amount || 0,
                        ),
                      0,
                    )}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Amount"
                    className="rounded-xl border px-3 py-3 text-sm"
                  />
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="rounded-xl border px-3 py-3 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Reference"
                    className="rounded-xl border px-3 py-3 text-sm"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void recordPayment()}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
                  >
                    {saving ? "Recording…" : "Record payment"}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Purchase #</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-4 font-semibold">
                    {p.purchase_number}
                  </td>
                  <td className="px-4 py-4">
                    {p.supplier_name || "Custom supplier"}
                  </td>
                  <td className="px-4 py-4">
                    {new Date(p.purchase_date).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-4">
                    {money(Number(p.total_amount || 0))}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : p.payment_status === "partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
                    >
                      {p.payment_status || "pending"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {p.payment_status === "paid" ? (
                      <Link
                        href={`/purchases/${p.id}`}
                        className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700"
                      >
                        View Purchase
                      </Link>
                    ) : (
                      <button
                        onClick={() => edit(p)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!purchases.length && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    No purchases recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
