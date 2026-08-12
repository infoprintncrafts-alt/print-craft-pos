"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Purchase = {
  purchase_number: string;
  supplier_name: string | null;
  purchase_date: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string | null;
  notes: string | null;
};
type Item = {
  item_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
};
export default function PurchaseReceipt() {
  const { id } = useParams<{ id: string }>();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    async function load() {
      const [p, i] = await Promise.all([
        supabase
          .from("purchases")
          .select(
            "purchase_number,supplier_name,purchase_date,total_amount,paid_amount,payment_status,notes",
          )
          .eq("id", id)
          .single(),
        supabase
          .from("purchase_items")
          .select("item_name,quantity,unit_cost,total")
          .eq("purchase_id", id),
      ]);
      setPurchase(p.data as Purchase | null);
      setItems((i.data ?? []) as Item[]);
    }
    if (id) void load();
  }, [id]);
  if (!purchase)
    return (
      <main className="p-8 text-center text-slate-500">Loading receipt…</main>
    );
  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/purchases" className="text-xs font-bold text-blue-600">
          ← Purchases
        </Link>
        <div className="mt-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Purchase receipt
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              {purchase.purchase_number}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {purchase.supplier_name || "Custom supplier"}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            Paid
          </span>
        </div>
        <p className="mt-5 text-sm text-slate-500">
          {new Date(purchase.purchase_date).toLocaleDateString("en-GB")}
        </p>
        <table className="mt-5 w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-400">
            <tr>
              <th className="py-3">Item</th>
              <th className="py-3">Qty</th>
              <th className="py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-3">{item.item_name}</td>
                <td className="py-3">{item.quantity}</td>
                <td className="py-3 text-right">
                  LKR {Number(item.total || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 space-y-2 border-t pt-4 text-right text-sm">
          <p>
            Total:{" "}
            <b>LKR {Number(purchase.total_amount || 0).toLocaleString()}</b>
          </p>
          <p>
            Paid:{" "}
            <b className="text-emerald-700">
              LKR{" "}
              {Number(
                purchase.paid_amount || purchase.total_amount || 0,
              ).toLocaleString()}
            </b>
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="mt-6 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
        >
          Print receipt
        </button>
      </div>
    </main>
  );
}
