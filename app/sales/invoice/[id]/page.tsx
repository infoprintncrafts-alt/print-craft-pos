"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import InvoiceDocument from "@/app/components/InvoiceDocument";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  cashier_id: string | null;
  sale_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  payment_status: string;
  notes: string | null;
};

type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
};

export default function InvoicePreviewPage() {
  const params = useParams();
  const invoiceId = params?.id as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoiceId) return;

    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session) {
        throw new Error("You are not logged in.");
      }

      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          customer_id,
          cashier_id,
          sale_date,
          subtotal,
          discount,
          tax,
          total,
          paid_amount,
          payment_status,
          notes
        `)
        .eq("id", invoiceId)
        .single();

      if (saleError) {
        throw new Error(`Unable to load invoice: ${saleError.message}`);
      }

      if (!saleData) {
        throw new Error("Invoice not found.");
      }

      setSale(saleData as Sale);

      if (saleData.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("id, name, phone, address")
          .eq("id", saleData.customer_id)
          .single();

        if (!customerError && customerData) {
          setCustomer(customerData as Customer);
        } else {
          setCustomer(null);
        }
      } else {
        setCustomer(null);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          id,
          sale_id,
          product_id,
          item_name,
          quantity,
          unit_price,
          discount,
          total
        `)
        .eq("sale_id", invoiceId)
        .order("id");

      if (itemsError) {
        throw new Error(`Unable to load invoice items: ${itemsError.message}`);
      }

      setItems((itemsData ?? []) as SaleItem[]);
    } catch (err) {
      console.error("Invoice loading error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load invoice."
      );
    } finally {
      setLoading(false);
    }
  }

  function printInvoice() {
    window.print();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-8 py-6 text-center shadow">
          <div className="text-2xl">⏳</div>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Loading invoice...
          </p>
        </div>
      </main>
    );
  }

  if (error || !sale) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="text-5xl">⚠️</div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Invoice Not Found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error || "Unable to load invoice."}
          </p>

          <Link
            href="/sales"
            className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            ← Back to Sales
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="print:hidden sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/sales"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            ← Back to Sales
          </Link>

          <button
            type="button"
            onClick={printInvoice}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            🖨 Print / Save PDF
          </button>
        </div>
      </div>

      <main className="invoice-screen-shell min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
        <InvoiceDocument sale={sale} customer={customer} items={items} />
      </main>
    </>
  );
}
