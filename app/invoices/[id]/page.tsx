"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

const BUSINESS = {
  name: "PRINT & CRAFT (PVT) LTD.",
  address: "No.343, Main Road, Kinniya 01, Trincomalee",
  phone: "0757138882",
  whatsapp: "0757138882",
  email: "info.printncrafts@gmail.com",
  bank: "HNB Bank",
  accountName: "MJM HASSAN",
  accountNumber: "16 90 20 157 157",
  branch: "Kinniya",
};

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const [sale, setSale] = useState<Sale | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invoiceId) loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    try {
      setLoading(true);
      setError("");

      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          customer_id,
          sale_date,
          subtotal,
          discount,
          tax,
          total,
          paid_amount,
          payment_status,
          notes
        `)
        .eq("invoice_number", invoiceId)
.maybeSingle();

if (!saleData) {
  throw new Error("Invoice not found.");
}

      if (saleError) throw new Error("Unable to load invoice from the database.");
      if (!saleData) throw new Error("Invoice not found.");

      setSale(saleData as Sale);

      if (saleData.customer_id) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id, name, phone, address")
          .eq("id", saleData.customer_id)
          .single();

        setCustomer((customerData as Customer) ?? null);
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

      if (itemsError) throw new Error(itemsError.message);

      setItems((itemsData ?? []) as SaleItem[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load invoice."
      );
    } finally {
      setLoading(false);
    }
  }

  function money(value: number) {
    return `LKR ${Number(value || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // sale_items.discount is already the complete line discount.
  const grossSubtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );

  const itemDiscountTotal = items.reduce((sum, item) => {
    const gross =
      Number(item.quantity || 0) * Number(item.unit_price || 0);

    return sum + Math.min(Math.max(Number(item.discount || 0), 0), gross);
  }, 0);

  const subtotalAfterItemDiscounts = Math.max(
    grossSubtotal - itemDiscountTotal,
    0
  );

  const invoiceDiscount = Math.max(
    Number(sale?.discount || 0) - itemDiscountTotal,
    0
  );

  const tax = Number(sale?.tax || 0);

  const finalTotal = Math.max(
    subtotalAfterItemDiscounts - invoiceDiscount + tax,
    0
  );

  const paidAmount = Number(sale?.paid_amount || 0);
  const balance = Math.max(finalTotal - paidAmount, 0);
  const change = Math.max(paidAmount - finalTotal, 0);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="rounded-xl bg-white px-6 py-4 font-semibold shadow">
          Loading invoice...
        </p>
      </main>
    );
  }

  if (error || !sale) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold">Invoice Not Found</h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>

          <Link
            href="/sales"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            Back to Sales
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="print:hidden sticky top-0 z-50 border-b bg-white">
        <div className="mx-auto flex max-w-[794px] justify-between px-4 py-3">
          <Link
            href="/sales"
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            ← Back to Sales
          </Link>

          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
        <div className="invoice-page mx-auto max-w-[794px] bg-white p-7 shadow-xl sm:p-12 print:max-w-none print:shadow-none">
          <header className="flex justify-between gap-5 border-b-2 border-slate-900 pb-5">
            <div>
              <h1 className="text-xl font-black sm:text-2xl">
                {BUSINESS.name}
              </h1>
              <div className="mt-2 text-xs leading-5 text-slate-500">
                <p>{BUSINESS.address}</p>
                <p>Tel: {BUSINESS.phone}</p>
                <p>WhatsApp: {BUSINESS.whatsapp}</p>
                <p>{BUSINESS.email}</p>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-black sm:text-3xl">INVOICE</h2>
              <p className="mt-3 text-xs">
                <strong>Invoice No:</strong> {sale.invoice_number}
              </p>
              <p className="mt-1 text-xs">
                <strong>Date:</strong> {formatDate(sale.sale_date)}
              </p>
            </div>
          </header>

          <section className="mt-6 flex justify-between border-b pb-5">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500">
                Bill To
              </p>
              <p className="mt-1 text-sm font-bold">
                {customer?.name || "Walk-in Customer"}
              </p>
              {customer?.phone && (
                <p className="mt-1 text-xs text-slate-600">{customer.phone}</p>
              )}
              {customer?.address && (
                <p className="mt-1 text-xs text-slate-600">
                  {customer.address}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-[11px] font-bold uppercase text-slate-500">
                Payment Status
              </p>
              <p className="mt-1 text-sm font-bold uppercase">
                {sale.payment_status}
              </p>
            </div>
          </section>

          <section className="mt-6 overflow-hidden border">
            <table className="w-full table-fixed border-collapse text-xs">
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[35%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
              </colgroup>

              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Disc.</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const gross =
                    Number(item.quantity || 0) *
                    Number(item.unit_price || 0);

                  const discount = Math.min(
                    Math.max(Number(item.discount || 0), 0),
                    gross
                  );

                  return (
                    <tr key={item.id} className="border-t">
                      <td className="p-2 text-center">{index + 1}</td>
                      <td className="break-words p-2 font-medium">
                        {item.item_name}
                      </td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {money(item.unit_price)}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {discount > 0 ? money(discount) : "-"}
                      </td>
                      <td className="p-2 text-right font-bold whitespace-nowrap">
                        {money(gross - discount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="mt-5 flex justify-end">
            <div className="w-full max-w-[340px] text-xs">
              <Row label="Gross Subtotal" value={money(grossSubtotal)} />
              <Row
                label="Item Discounts"
                value={`- ${money(itemDiscountTotal)}`}
                red
              />
              <Row
                label="Subtotal"
                value={money(subtotalAfterItemDiscounts)}
              />

              {invoiceDiscount > 0 && (
                <Row
                  label="Invoice Discount"
                  value={`- ${money(invoiceDiscount)}`}
                  red
                />
              )}

              {tax > 0 && <Row label="Tax" value={money(tax)} />}

              <div className="mt-2 flex justify-between bg-slate-900 px-3 py-3 text-sm font-bold text-white">
                <span>TOTAL</span>
                <span>{money(finalTotal)}</span>
              </div>

              <Row label="Paid Amount" value={money(paidAmount)} green />

              {balance > 0 && (
                <Row label="Balance Due" value={money(balance)} red />
              )}

              {change > 0 && (
                <Row label="Change" value={money(change)} green />
              )}
            </div>
          </section>

          <section className="mt-7 grid gap-5 border-t pt-5 text-xs sm:grid-cols-2">
            {sale.notes && (
              <div>
                <p className="font-bold uppercase text-slate-500">Notes</p>
                <p className="mt-1 whitespace-pre-line text-slate-600">
                  {sale.notes}
                </p>
              </div>
            )}

            <div className={sale.notes ? "sm:text-right" : ""}>
              <p className="font-bold uppercase text-slate-500">Bank Details</p>
              <p className="mt-1 text-slate-600">{BUSINESS.bank}</p>
              <p className="text-slate-600">
                Account Name: {BUSINESS.accountName}
              </p>
              <p className="text-slate-600">
                Account No: {BUSINESS.accountNumber}
              </p>
              <p className="text-slate-600">Branch: {BUSINESS.branch}</p>
            </div>
          </section>

          <footer className="mt-7 border-t pt-4 text-center text-xs text-slate-500">
            Thank you for choosing Print & Craft!
          </footer>
        </div>
      </main>

      <style jsx global>{`
        @page {
          size: A5 portrait;
          margin: 7mm;
        }

        @media print {
          html,
          body {
            width: 148mm;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-page {
            padding: 0 !important;
          }

          tr {
            page-break-inside: avoid;
          }

          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </>
  );
}

function Row({
  label,
  value,
  red = false,
  green = false,
}: {
  label: string;
  value: string;
  red?: boolean;
  green?: boolean;
}) {
  return (
    <div className="flex justify-between border-b py-2">
      <span className={red ? "font-bold text-red-600" : green ? "font-bold text-emerald-700" : "text-slate-600"}>
        {label}
      </span>
      <span className={red ? "font-bold text-red-600" : green ? "font-bold text-emerald-700" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}