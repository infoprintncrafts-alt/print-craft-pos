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
  website: "",
  bank: "HNB Bank",
  accountName: "MJM HASSAN",
  accountNumber: "16 90 20 157 157",
  branch: "Kinniya",
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

  function printInvoice() {
    window.print();
  }

  // item.discount is already the full discount for the line.
  // Do not multiply it by quantity again.
  const grossSubtotal = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unit_price || 0);
  }, 0);

  const itemDiscountTotal = items.reduce((sum, item) => {
    const gross =
      Number(item.quantity || 0) * Number(item.unit_price || 0);

    const lineDiscount = Math.min(
      Math.max(Number(item.discount || 0), 0),
      gross
    );

    return sum + lineDiscount;
  }, 0);

  const calculatedSubtotal = Math.max(
    grossSubtotal - itemDiscountTotal,
    0
  );

  // sales.discount contains item discounts + invoice discount.
  const databaseDiscount = Number(sale?.discount || 0);

  const invoiceDiscount = Math.max(
    databaseDiscount - itemDiscountTotal,
    0
  );

  const tax = Number(sale?.tax || 0);

  const calculatedTotal = Math.max(
    calculatedSubtotal - invoiceDiscount + tax,
    0
  );

  const paidAmount = Number(sale?.paid_amount || 0);
  const balance = Math.max(calculatedTotal - paidAmount, 0);
  const change = Math.max(paidAmount - calculatedTotal, 0);
  const paymentStatus = sale?.payment_status?.toUpperCase() || "PENDING";

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

      <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
        <div className="mx-auto w-full max-w-[794px] bg-white shadow-xl print:max-w-none print:shadow-none">
          <div className="invoice-page p-7 sm:p-12">
            <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
              <div className="min-w-0">
                <div className="mb-3">
                  <img
                    src="/logo.png"
                    alt="Print & Craft"
                    className="h-auto max-h-[70px] max-w-[190px] object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  {BUSINESS.name}
                </h1>

                <div className="mt-2 space-y-0.5 text-xs leading-4 text-slate-500">
                  <p>{BUSINESS.address}</p>
                  <p>Tel: {BUSINESS.phone}</p>
                  <p>WhatsApp: {BUSINESS.whatsapp}</p>
                  <p>Email: {BUSINESS.email}</p>
                  {BUSINESS.website && <p>{BUSINESS.website}</p>}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <h2 className="text-2xl font-black tracking-wide text-slate-900 sm:text-3xl">
                  INVOICE
                </h2>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">
                      Invoice No:
                    </span>{" "}
                    {sale.invoice_number}
                  </p>

                  <p>
                    <span className="font-semibold text-slate-800">Date:</span>{" "}
                    {formatDate(sale.sale_date)}
                  </p>
                </div>
              </div>
            </header>

            <section className="mt-6 grid grid-cols-1 gap-4 border-b border-slate-200 pb-5 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Bill To
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {customer?.name || "Walk-in Customer"}
                </p>

                {customer?.phone && (
                  <p className="mt-1 text-xs text-slate-600">{customer.phone}</p>
                )}

                {customer?.address && (
                  <p className="mt-1 text-xs leading-4 text-slate-600">
                    {customer.address}
                  </p>
                )}
              </div>

              <div className="sm:text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Payment Status
                </p>

                <span
                  className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                    paymentStatus === "PAID"
                      ? "bg-emerald-100 text-emerald-700"
                      : paymentStatus === "PARTIAL"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
            </section>

            <section className="mt-6">
              <div className="overflow-hidden border border-slate-300">
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
                      <th className="px-1.5 py-2 text-center font-bold">#</th>
                      <th className="px-2 py-2 text-left font-bold">Item</th>
                      <th className="px-1.5 py-2 text-center font-bold">Qty</th>
                      <th className="px-2 py-2 text-right font-bold">Price</th>
                      <th className="px-2 py-2 text-right font-bold">Disc.</th>
                      <th className="px-2 py-2 text-right font-bold">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No invoice items found.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => {
                        const quantity = Number(item.quantity || 0);
                        const unitPrice = Number(item.unit_price || 0);
                        const gross = quantity * unitPrice;
                        const lineDiscount = Math.min(
                          Math.max(Number(item.discount || 0), 0),
                          gross
                        );
                        const lineTotal = Math.max(gross - lineDiscount, 0);

                        return (
                          <tr
                            key={item.id}
                            className="border-t border-slate-200 align-top"
                          >
                            <td className="px-1.5 py-2 text-center text-slate-600">
                              {index + 1}
                            </td>

                            <td className="break-words px-2 py-2 font-medium text-slate-800">
                              {item.item_name}
                            </td>

                            <td className="px-1.5 py-2 text-center text-slate-700">
                              {quantity}
                            </td>

                            <td className="px-2 py-2 text-right whitespace-nowrap text-slate-700">
                              {money(unitPrice)}
                            </td>

                            <td className="px-2 py-2 text-right whitespace-nowrap text-slate-700">
                              {lineDiscount > 0 ? money(lineDiscount) : "-"}
                            </td>

                            <td className="px-2 py-2 text-right whitespace-nowrap font-semibold text-slate-900">
                              {money(lineTotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-5 flex justify-end">
              <div className="w-full max-w-[340px] text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 py-2">
                  <span className="text-slate-600">Gross Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {money(grossSubtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 py-2">
                  <span className="text-slate-600">Item Discounts</span>
                  <span className="font-semibold text-red-600">
                    - {money(itemDiscountTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 py-2">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {money(calculatedSubtotal)}
                  </span>
                </div>

                {invoiceDiscount > 0 && (
                  <div className="flex items-center justify-between border-b border-slate-200 py-2">
                    <span className="text-slate-600">Invoice Discount</span>
                    <span className="font-semibold text-red-600">
                      - {money(invoiceDiscount)}
                    </span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex items-center justify-between border-b border-slate-200 py-2">
                    <span className="text-slate-600">Tax</span>
                    <span className="font-semibold text-slate-800">
                      {money(tax)}
                    </span>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between bg-slate-900 px-3 py-3 text-sm text-white">
                  <span className="font-bold">TOTAL</span>
                  <span className="font-black">{money(calculatedTotal)}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 py-2">
                  <span className="text-slate-600">Paid Amount</span>
                  <span className="font-semibold text-emerald-700">
                    {money(paidAmount)}
                  </span>
                </div>

                {balance > 0 && (
                  <div className="flex items-center justify-between border-b border-slate-200 py-2">
                    <span className="font-bold text-red-600">Balance Due</span>
                    <span className="font-bold text-red-600">
                      {money(balance)}
                    </span>
                  </div>
                )}

                {change > 0 && (
                  <div className="flex items-center justify-between border-b border-slate-200 py-2">
                    <span className="font-bold text-emerald-700">Change</span>
                    <span className="font-bold text-emerald-700">
                      {money(change)}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {(sale.notes || BUSINESS.bank) && (
              <section className="mt-7 grid grid-cols-1 gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2">
                {sale.notes && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Notes
                    </p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-600">
                      {sale.notes}
                    </p>
                  </div>
                )}

                <div className={sale.notes ? "sm:text-right" : ""}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Bank Details
                  </p>

                  <div className="mt-1 text-xs leading-5 text-slate-600">
                    <p>{BUSINESS.bank}</p>
                    <p>Account Name: {BUSINESS.accountName}</p>
                    <p>Account No: {BUSINESS.accountNumber}</p>
                    <p>Branch: {BUSINESS.branch}</p>
                  </div>
                </div>
              </section>
            )}

            <footer className="mt-7 border-t border-slate-200 pt-4 text-center">
              <p className="text-xs font-semibold text-slate-700">
                Thank you for choosing Print & Craft!
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                This is a computer-generated invoice.
              </p>
            </footer>
          </div>
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
            min-height: 210mm;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-page {
            width: 100%;
            padding: 0 !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </>
  );
}