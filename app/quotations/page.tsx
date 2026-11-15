"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = { id: string; name: string; phone: string | null };
type Product = { id: string; name: string; sku: string | null; selling_price: number };
type Quotation = {
  id: string;
  quote_number: string;
  customer_id: string | null;
  quote_date: string;
  valid_until: string | null;
  total: number;
  status: "open" | "converted" | "cancelled";
  converted_sale_id: string | null;
};
type QuotationLine = {
  id: string;
  product_id: string;
  item_name: string;
  quantity: string;
  unit_price: string;
  discount: string;
};

const emptyLine = (): QuotationLine => ({
  id: crypto.randomUUID(),
  product_id: "",
  item_name: "",
  quantity: "1",
  unit_price: "",
  discount: "0",
});

function money(value: number) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function safeNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
}

export default function QuotationsPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<QuotationLine[]>([emptyLine()]);
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData(editId?: string | null) {
    setLoading(true);
    setError("");
    try {
      const [quotesResult, customersResult, productsResult] = await Promise.all([
        supabase
          .from("quotations")
          .select("id,quote_number,customer_id,quote_date,valid_until,total,status,converted_sale_id")
          .order("created_at", { ascending: false }),
        supabase.from("customers").select("id,name,phone").eq("is_active", true).order("name"),
        supabase.from("products").select("id,name,sku,selling_price").eq("is_active", true).order("name"),
      ]);

      if (quotesResult.error) throw new Error(`Quotations: ${quotesResult.error.message}`);
      if (customersResult.error) throw new Error(`Customers: ${customersResult.error.message}`);
      if (productsResult.error) throw new Error(`Products: ${productsResult.error.message}`);

      setQuotes((quotesResult.data ?? []) as Quotation[]);
      setCustomers((customersResult.data ?? []) as Customer[]);
      setProducts((productsResult.data ?? []) as Product[]);

      if (editId) {
        const [quoteResult, itemsResult] = await Promise.all([
          supabase
            .from("quotations")
            .select("id,customer_id,valid_until,invoice_discount,tax,notes,status")
            .eq("id", editId)
            .single(),
          supabase
            .from("quotation_items")
            .select("id,product_id,item_name,quantity,unit_price,discount")
            .eq("quotation_id", editId)
            .order("created_at"),
        ]);
        if (quoteResult.error) throw new Error(`Quotation: ${quoteResult.error.message}`);
        if (itemsResult.error) throw new Error(`Quotation items: ${itemsResult.error.message}`);
        if (quoteResult.data.status !== "open") throw new Error("Only open quotations can be edited.");

        setEditingQuoteId(editId);
        setCustomerId(quoteResult.data.customer_id ?? "");
        setValidUntil(quoteResult.data.valid_until ?? "");
        setInvoiceDiscount(String(quoteResult.data.invoice_discount ?? 0));
        setTax(String(quoteResult.data.tax ?? 0));
        setNotes(quoteResult.data.notes ?? "");
        setItems((itemsResult.data ?? []).map((item) => ({
          id: item.id,
          product_id: item.product_id ?? "",
          item_name: item.item_name,
          quantity: String(item.quantity),
          unit_price: String(item.unit_price),
          discount: String(Number(item.discount) / Math.max(Number(item.quantity), 1)),
        })) as QuotationLine[]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load quotations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get("edit");
    void loadData(editId);
  }, []);

  async function beginEdit(quoteId: string) {
    await loadData(quoteId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingQuoteId(null);
    setCustomerId("");
    setValidUntil("");
    setInvoiceDiscount("0");
    setTax("0");
    setNotes("");
    setItems([emptyLine()]);
    router.replace("/quotations");
  }

  const totals = useMemo(() => {
    const grossSubtotal = items.reduce(
      (sum, item) => sum + Math.max(1, Math.floor(safeNumber(item.quantity))) * safeNumber(item.unit_price),
      0
    );
    const itemDiscount = items.reduce((sum, item) => {
      const quantity = Math.max(1, Math.floor(safeNumber(item.quantity)));
      const unitPrice = safeNumber(item.unit_price);
      return sum + Math.min(safeNumber(item.discount), unitPrice) * quantity;
    }, 0);
    const subtotal = Math.max(grossSubtotal - itemDiscount, 0);
    const safeInvoiceDiscount = Math.min(safeNumber(invoiceDiscount), subtotal);
    const safeTax = safeNumber(tax);
    return {
      grossSubtotal,
      itemDiscount,
      subtotal,
      invoiceDiscount: safeInvoiceDiscount,
      tax: safeTax,
      total: subtotal - safeInvoiceDiscount + safeTax,
    };
  }, [items, invoiceDiscount, tax]);

  function updateItem(index: number, changes: Partial<QuotationLine>) {
    setItems((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...changes } : item
    ));
  }

  async function saveQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (items.length === 0 || items.some((item) => !item.item_name.trim())) {
      setError("Add a description for every quotation item.");
      return;
    }
    if (safeNumber(invoiceDiscount) > totals.subtotal) {
      setError("Quotation discount cannot exceed the subtotal.");
      return;
    }

    setSaving(true);
    const quoteItems = items.map((item) => {
      const quantity = Math.max(1, Math.floor(safeNumber(item.quantity)));
      const unitPrice = safeNumber(item.unit_price);
      return {
        product_id: item.product_id || null,
        item_name: item.item_name.trim(),
        quantity,
        unit_price: unitPrice,
        discount: Math.min(safeNumber(item.discount), unitPrice) * quantity,
      };
    });
    const { data, error: saveError } = await supabase.rpc("save_quotation", {
      p_quotation_id: editingQuoteId,
      p_customer_id: customerId || null,
      p_valid_until: validUntil || null,
      p_invoice_discount: safeNumber(invoiceDiscount),
      p_tax: safeNumber(tax),
      p_notes: notes.trim() || null,
      p_items: quoteItems,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    const saved = data as { quotation_id?: string } | null;
    if (!saved?.quotation_id) {
      setError("Quotation was saved but its reference was not returned.");
      return;
    }
    router.push(`/quotations/${saved.quotation_id}`);
  }

  async function cancelQuotation(quote: Quotation) {
    if (!window.confirm(`Cancel quotation ${quote.quote_number}? It will remain available in the list as cancelled.`)) return;
    setError("");
    const { error: cancelError } = await supabase.rpc("cancel_quotation", { p_quotation_id: quote.id });
    if (cancelError) {
      setError(cancelError.message);
      return;
    }
    await loadData();
  }

  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers]
  );

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Sales</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Quotations / Proforma</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Prepare and print a price proposal. Quotations do not create invoices, record payments, change customer balances, or reserve stock.
          </p>
        </header>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <form onSubmit={saveQuotation} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{editingQuoteId ? "Edit quotation" : "New quotation"}</h2>
              <p className="mt-1 text-xs text-slate-500">This stays a proposal until you convert it to a tax invoice.</p>
            </div>
            {editingQuoteId && <button type="button" onClick={resetForm} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Cancel editing</button>}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Customer
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal normal-case text-slate-900">
                <option value="">Walk-in / no customer selected</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Valid until
              <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal text-slate-900" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Notes / terms
              <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional terms or delivery notes" className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal normal-case text-slate-900" />
            </label>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[860px] space-y-2">
              <div className="grid grid-cols-[1.2fr_1.5fr_.6fr_.8fr_.8fr_auto] gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <span>Product</span><span>Description</span><span>Qty</span><span>Unit price</span><span>Unit discount</span><span />
              </div>
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[1.2fr_1.5fr_.6fr_.8fr_.8fr_auto] gap-2">
                  <select
                    value={item.product_id}
                    onChange={(event) => {
                      const product = products.find((candidate) => candidate.id === event.target.value);
                      updateItem(index, {
                        product_id: event.target.value,
                        item_name: product?.name ?? "",
                        unit_price: product ? String(product.selling_price) : "",
                      });
                    }}
                    className="min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-xs text-slate-900"
                  >
                    <option value="">Custom service</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}
                  </select>
                  <input value={item.item_name} onChange={(event) => updateItem(index, { item_name: event.target.value })} placeholder="Item or service description" className="min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                  <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className="min-w-0 rounded-lg border border-slate-300 px-2 py-2.5 text-sm" />
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, { unit_price: event.target.value })} placeholder="0.00" className="min-w-0 rounded-lg border border-slate-300 px-2 py-2.5 text-sm" />
                  <input type="number" min="0" max={safeNumber(item.unit_price)} step="0.01" value={item.discount} onChange={(event) => updateItem(index, { discount: event.target.value })} placeholder="0.00" className="min-w-0 rounded-lg border border-slate-300 px-2 py-2.5 text-sm" />
                  <button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:text-slate-300">Remove</button>
                </div>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => setItems((current) => [...current, emptyLine()])} className="rounded-xl border border-teal-200 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50">+ Add item</button>

          <div className="grid gap-4 md:grid-cols-[1fr_240px_240px]">
            <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
              <p className="font-bold">No stock is reserved</p>
              <p className="mt-1 text-xs leading-5">Stock is checked and deducted only after you confirm this quotation as an invoice.</p>
            </div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Quotation discount
              <input type="number" min="0" max={totals.subtotal} step="0.01" value={invoiceDiscount} onChange={(event) => setInvoiceDiscount(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal text-slate-900" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Tax
              <input type="number" min="0" step="0.01" value={tax} onChange={(event) => setTax(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal text-slate-900" />
            </label>
          </div>

          <div className="ml-auto max-w-sm rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex justify-between py-1 text-slate-600"><span>Gross subtotal</span><span>{money(totals.grossSubtotal)}</span></div>
            <div className="flex justify-between py-1 text-slate-600"><span>Item discount</span><span>− {money(totals.itemDiscount)}</span></div>
            <div className="flex justify-between py-1 text-slate-600"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            {totals.invoiceDiscount > 0 && <div className="flex justify-between py-1 text-slate-600"><span>Quotation discount</span><span>− {money(totals.invoiceDiscount)}</span></div>}
            {totals.tax > 0 && <div className="flex justify-between py-1 text-slate-600"><span>Tax</span><span>{money(totals.tax)}</span></div>}
            <div className="mt-2 flex justify-between border-t border-teal-700 pt-3 text-base font-black text-teal-900"><span>Proposed total</span><span>{money(totals.total)}</span></div>
          </div>

          <button disabled={saving || loading} className="w-full rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-50">
            {saving ? "Saving quotation…" : editingQuoteId ? "Save quotation changes" : "Save quotation / proforma"}
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div><h2 className="text-lg font-bold text-slate-900">Quotation register</h2><p className="mt-1 text-xs text-slate-500">Open quotes have no accounting or inventory effect.</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{quotes.length} total</span>
          </div>
          {loading ? <p className="p-10 text-center text-sm text-slate-500">Loading quotations…</p> : quotes.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No quotations yet. Create one above.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3">Quotation</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Valid until</th><th className="px-5 py-3">Proposed total</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => {
                    const now = new Date();
                    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
                    const expired = quote.status === "open" && quote.valid_until && quote.valid_until < today;
                    const status = expired ? "expired" : quote.status;
                    return (
                      <tr key={quote.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-4"><Link href={`/quotations/${quote.id}`} className="font-bold text-teal-800 hover:underline">{quote.quote_number}</Link></td>
                        <td className="px-5 py-4 text-slate-600">{customerNames.get(quote.customer_id || "") || "Walk-in"}</td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(quote.quote_date)}</td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(quote.valid_until)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{money(Number(quote.total))}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === "converted" ? "bg-emerald-100 text-emerald-700" : status === "cancelled" ? "bg-slate-100 text-slate-500" : status === "expired" ? "bg-amber-100 text-amber-800" : "bg-teal-50 text-teal-800"}`}>{status}</span></td>
                        <td className="px-5 py-4"><div className="flex items-center gap-3"><Link href={`/quotations/${quote.id}`} className="font-semibold text-blue-700 hover:underline">View</Link>{quote.status === "open" && <><button type="button" onClick={() => void beginEdit(quote.id)} className="font-semibold text-slate-600 hover:underline">Edit</button><button type="button" onClick={() => void cancelQuotation(quote)} className="font-semibold text-rose-600 hover:underline">Cancel</button></>}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
