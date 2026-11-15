"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import QuotationDocument, {
  type QuotationCustomer,
  type QuotationDocumentData,
  type QuotationDocumentItem,
} from "../QuotationDocument";
import styles from "./page.module.css";

type Quote = QuotationDocumentData & {
  id: string;
  customer_id: string | null;
  converted_sale_id: string | null;
};

function money(value: number) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function localDateInputValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function QuotationDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quoteId = params.id;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [customer, setCustomer] = useState<QuotationCustomer>(null);
  const [items, setItems] = useState<QuotationDocumentItem[]>([]);
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");

  async function loadQuotation() {
    setLoading(true);
    setError("");
    const { data: quoteData, error: quoteError } = await supabase
      .from("quotations")
      .select("id,quote_number,customer_id,quote_date,valid_until,gross_subtotal,item_discount,subtotal,invoice_discount,tax,total,notes,status,converted_sale_id")
      .eq("id", quoteId)
      .maybeSingle();
    if (quoteError || !quoteData) {
      setError(quoteError?.message ?? "Quotation not found.");
      setLoading(false);
      return;
    }

    const { data: itemData, error: itemsError } = await supabase
      .from("quotation_items")
      .select("id,item_name,quantity,unit_price,discount,total")
      .eq("quotation_id", quoteId)
      .order("created_at", { ascending: true });
    if (itemsError) {
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    if (quoteData.customer_id) {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("name,address,phone")
        .eq("id", quoteData.customer_id)
        .maybeSingle();
      if (customerError) {
        setError(customerError.message);
        setLoading(false);
        return;
      }
      setCustomer(customerData ?? null);
    } else {
      setCustomer(null);
    }

    setQuote(quoteData as Quote);
    setItems((itemData ?? []) as QuotationDocumentItem[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadQuotation();
  }, [quoteId]);

  const isExpired = useMemo(() => Boolean(
    quote?.status === "open" && quote.valid_until && quote.valid_until < localDateInputValue()
  ), [quote]);

  async function convertToInvoice() {
    if (!quote || quote.status !== "open" || isExpired || converting) return;
    const amount = Number(paidAmount) || 0;
    if (amount < 0 || amount > Number(quote.total)) {
      setError("Payment must be between zero and the proposed total.");
      return;
    }
    const paymentText = amount > 0 ? ` The ${money(amount)} payment will be recorded by ${paymentMethod}.` : " No payment will be recorded now.";
    if (!window.confirm(`Confirm ${quote.quote_number} as a tax invoice? This will create the invoice and apply tracked stock.${paymentText}`)) return;

    setConverting(true);
    setError("");
    const { data, error: convertError } = await supabase.rpc("convert_quotation_to_invoice", {
      p_quotation_id: quote.id,
      p_paid_amount: amount,
      p_payment_method: paymentMethod,
    });
    setConverting(false);
    if (convertError) {
      setError(convertError.message);
      return;
    }
    const result = data as { sale_id?: string } | null;
    if (!result?.sale_id) {
      setError("Invoice conversion completed, but its reference was not returned.");
      return;
    }
    router.push(`/sales/invoice/${result.sale_id}`);
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading quotation…</main>;
  }

  if (error && !quote) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-8">
          <p className="font-semibold text-rose-700">{error}</p>
          <Link href="/quotations" className="mt-5 inline-block text-sm font-bold text-blue-700">← Back to quotations</Link>
        </div>
      </main>
    );
  }

  if (!quote) return null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1000px]">
        <div className={styles.screenControls}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <Link href="/quotations" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">← Quotations</Link>
            <div className="flex flex-wrap gap-2">
              {quote.status === "open" && <Link href={`/quotations?edit=${quote.id}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit quotation</Link>}
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-950">Print / Save PDF</button>
            </div>
          </div>

          {error && <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

          {quote.status === "open" && (
            <section className="mt-4 rounded-xl border border-teal-200 bg-white p-4 shadow-sm sm:p-5">
              {isExpired ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-bold text-amber-800">This quotation has expired</h2><p className="mt-1 text-xs text-slate-600">Edit it to set a new validity date before converting.</p></div>
                  <Link href={`/quotations?edit=${quote.id}`} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white">Extend validity</Link>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h2 className="font-bold text-slate-900">Confirm as tax invoice</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600">This is the point where the sale enters accounting and tracked inventory is deducted. Any payment entered below is recorded against the new invoice.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment received now
                      <input type="number" min="0" max={Number(quote.total)} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900" />
                    </label>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment method
                      <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={Number(paidAmount) <= 0} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 disabled:bg-slate-100">
                        <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option>
                      </select>
                    </label>
                    <button type="button" disabled={converting} onClick={() => void convertToInvoice()} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-50">{converting ? "Converting…" : "Confirm & create invoice"}</button>
                  </div>
                </>
              )}
            </section>
          )}

          {quote.status === "converted" && quote.converted_sale_id && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">This quotation has been converted. Stock and payment entries were processed with the invoice.</p>
              <Link href={`/sales/invoice/${quote.converted_sale_id}`} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Open tax invoice</Link>
            </div>
          )}

          {quote.status === "cancelled" && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">This quotation was cancelled and cannot be converted.</div>}
        </div>

        <div className="mt-5 overflow-x-auto rounded-sm shadow-lg print:mt-0 print:overflow-visible print:shadow-none">
          <QuotationDocument quote={quote} customer={customer} items={items} />
        </div>
      </div>
    </main>
  );
}
