"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type InvoiceSale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  payment_status: string;
  notes?: string | null;
};

type InvoiceCustomer = {
  name: string | null;
  phone: string | null;
  address: string | null;
} | null;

type InvoiceItem = {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
};

type PaymentDetails = {
  payment_method: string | null;
  reference_number: string | null;
};

const BUSINESS = {
  name: "PRINT & CRAFT (PVT) LTD.",
  tagline: "CUSTOMIZED PRINTING • GIFTS • DESIGNING",
  address: "No.343, Main Road, Kinniya 01, Trincomalee",
  phone: "0757138882",
  whatsapp: "0757138882",
  email: "info.printncrafts@gmail.com",
  bankAccountNumber: "16 90 20 157 157",
  bankAccountName: "MJM HASSAN",
  bank: "HNB",
};

function money(value: number) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function InvoiceDocument({
  sale,
  customer,
  items,
}: {
  sale: InvoiceSale;
  customer: InvoiceCustomer;
  items: InvoiceItem[];
}) {
  const [payments, setPayments] = useState<PaymentDetails[]>([]);

  useEffect(() => {
    let active = true;

    async function loadPaymentDetails() {
      const { data, error } = await supabase
        .from("customer_payments")
        .select("payment_method,reference_number")
        .eq("sale_id", sale.id)
        .order("payment_date", { ascending: true });

      if (active && !error) {
        setPayments((data ?? []) as PaymentDetails[]);
      }
    }

    void loadPaymentDetails();
    return () => {
      active = false;
    };
  }, [sale.id]);

  const itemRows = items.map((item) => {
    const quantity = Math.max(Number(item.quantity || 0), 0);
    const unitPrice = Math.max(Number(item.unit_price || 0), 0);
    const gross = quantity * unitPrice;
    const discount = Math.min(Math.max(Number(item.discount || 0), 0), gross);

    return {
      item,
      quantity,
      unitPrice,
      gross,
      discount,
      unitDiscount: quantity > 0 ? discount / quantity : 0,
      amount: Math.max(gross - discount, 0),
    };
  });

  const subtotal = itemRows.reduce((sum, row) => sum + row.gross, 0);
  const itemDiscount = itemRows.reduce((sum, row) => sum + row.discount, 0);
  const invoiceDiscount = Math.max(Number(sale.discount || 0) - itemDiscount, 0);
  const tax = Math.max(Number(sale.tax || 0), 0);
  const grandTotal = Math.max(Number(sale.total || 0), 0);
  const amountPaid = Math.max(Number(sale.paid_amount || 0), 0);
  const balanceDue = Math.max(grandTotal - amountPaid, 0);
  const paymentStatus = grandTotal > 0 && amountPaid >= grandTotal
    ? "PAID"
    : amountPaid > 0
      ? "PARTIALLY PAID"
      : "UNPAID";
  const paymentMethods = [...new Set(
    payments
      .map((payment) => payment.payment_method?.trim())
      .filter((method): method is string => Boolean(method))
  )];
  const paymentReferences = [...new Set(
    payments
      .map((payment) => payment.reference_number?.trim())
      .filter((reference): reference is string => Boolean(reference))
  )];
  const paymentMethod = paymentMethods.length > 0
    ? paymentMethods.join(", ")
    : amountPaid > 0
      ? "Not recorded"
      : "Credit";

  return (
    <>
      <article className="invoice-document mx-auto box-border w-full max-w-[210mm] bg-white p-5 text-slate-800 shadow-xl sm:p-8 print:max-w-none print:p-0 print:shadow-none">
        <header className="invoice-header grid gap-6 border-b-2 border-teal-700 pb-5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)]">
          <div className="min-w-0">
            <Image src="/logo.png" width={7023} height={1948} alt="Print & Craft logo" className="mb-2 h-auto w-36 object-contain sm:w-44 print:w-40" />
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">{BUSINESS.name}</h1>
            <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-slate-500">{BUSINESS.tagline}</p>
            <address className="mt-3 space-y-1 text-[10px] not-italic leading-4 text-slate-600">
              <p>{BUSINESS.address}</p>
              <p>Tel: {BUSINESS.phone} <span className="px-1">|</span> WhatsApp: {BUSINESS.whatsapp}</p>
              <p>{BUSINESS.email}</p>
            </address>
            <div className="invoice-bank-details mt-3 max-w-[340px] rounded-lg border border-teal-100 bg-teal-50/50 p-3">
              <h3 className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-teal-900">Bank Transfer Details</h3>
              <table className="w-full table-fixed border-collapse text-[10px] leading-4">
                <colgroup><col className="w-[42%]" /><col className="w-[5%]" /><col className="w-[53%]" /></colgroup>
                <tbody>
                  <tr>
                    <th scope="row" className="border border-teal-100 bg-white/70 px-2 py-1 text-left font-semibold">Bank Acc. No.</th>
                    <td className="border-y border-teal-100 px-1 py-1 text-center">:</td>
                    <td className="border border-teal-100 bg-white/70 px-2 py-1 font-semibold">{BUSINESS.bankAccountNumber}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="border border-teal-100 bg-white/70 px-2 py-1 text-left font-semibold">Account Holder</th>
                    <td className="border-y border-teal-100 px-1 py-1 text-center">:</td>
                    <td className="border border-teal-100 bg-white/70 px-2 py-1">{BUSINESS.bankAccountName}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="border border-teal-100 bg-white/70 px-2 py-1 text-left font-semibold">Bank</th>
                    <td className="border-y border-teal-100 px-1 py-1 text-center">:</td>
                    <td className="border border-teal-100 bg-white/70 px-2 py-1">{BUSINESS.bank}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="invoice-metadata min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-3xl font-black tracking-[0.12em] text-teal-800">INVOICE</h2>
            <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-[10px]">
              <dt className="text-slate-500">Invoice No.</dt>
              <dd className="min-w-0 break-all text-right font-semibold">{sale.invoice_number}</dd>
              <dt className="text-slate-500">Invoice Date</dt>
              <dd className="text-right font-medium">{formatDate(sale.sale_date)}</dd>
              <dt className="text-slate-500">Invoice Time</dt>
              <dd className="text-right font-medium">{formatTime(sale.sale_date)}</dd>
            </dl>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Payment Status</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-teal-900">{paymentStatus}</span>
            </div>
          </div>
        </header>

        <section className="invoice-bill-to mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.12em] text-teal-800">Bill To</h2>
          <p className="mt-1 text-sm font-bold text-slate-900">{customer?.name?.trim() || "Walk-in Customer"}</p>
          <dl className="mt-2 grid gap-x-8 gap-y-1 text-[11px] leading-4 text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="inline font-semibold text-slate-700">Contact: </dt>
              <dd className="inline">{customer?.phone?.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-slate-700">Address: </dt>
              <dd className="inline whitespace-pre-line">{customer?.address?.trim() || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="invoice-order mt-5">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-teal-800">Order Details</h2>
            <p className="text-[10px] font-medium text-slate-500">{itemRows.length} {itemRows.length === 1 ? "item" : "items"}</p>
          </div>
          <table className="invoice-items w-full table-fixed border-collapse text-[10px]">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[36%]" />
              <col className="w-[8%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="border border-teal-800 bg-teal-800 px-1.5 py-2 text-center font-bold uppercase tracking-wide text-white">No.</th>
                <th className="border border-teal-800 bg-teal-800 px-2 py-2 text-left font-bold uppercase tracking-wide text-white">Description</th>
                <th className="border border-teal-800 bg-teal-800 px-1 py-2 text-center font-bold uppercase tracking-wide text-white">Qty</th>
                <th className="border border-teal-800 bg-teal-800 px-1 py-2 text-right font-bold uppercase tracking-wide text-white">Unit Price</th>
                <th className="border border-teal-800 bg-teal-800 px-1 py-2 text-right font-bold uppercase tracking-wide text-white">Discount / Unit</th>
                <th className="border border-teal-800 bg-teal-800 px-1.5 py-2 text-right font-bold uppercase tracking-wide text-white">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.length > 0 ? itemRows.map((row, index) => (
                <tr key={row.item.id}>
                  <td className="border border-slate-300 px-1.5 py-2 text-center text-slate-500">{String(index + 1).padStart(2, "0")}</td>
                  <td className="break-words border border-slate-300 px-2 py-2 font-medium">{row.item.item_name}</td>
                  <td className="border border-slate-300 px-1 py-2 text-center">{row.quantity}</td>
                  <td className="border border-slate-300 px-1 py-2 text-right whitespace-nowrap">{money(row.unitPrice)}</td>
                  <td className="border border-slate-300 px-1 py-2 text-right whitespace-nowrap">{money(row.unitDiscount)}</td>
                  <td className="border border-slate-300 px-1.5 py-2 text-right font-bold whitespace-nowrap">{money(row.amount)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="border border-slate-300 px-3 py-5 text-center text-slate-500">No invoice items found.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="invoice-summary-grid mt-5 grid gap-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-start">
          <div className="invoice-payment-panel rounded-lg border border-slate-200 p-3">
            <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-teal-800">Payment Details</h2>
            <div className="invoice-payment-cards mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
              <div className="min-w-0 rounded-md bg-slate-50 px-2.5 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Method</p>
                <p className="mt-1 break-words text-[10px] font-semibold text-slate-800">{paymentMethod}</p>
              </div>
              <div className="min-w-0 rounded-md bg-slate-50 px-2.5 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Reference</p>
                <p className="mt-1 break-all text-[10px] font-semibold text-slate-800">{paymentReferences.join(", ") || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="invoice-totals rounded-lg border border-slate-200 p-3">
            <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-teal-800">Invoice Summary</h2>
            <div className="invoice-adjustments mt-2 grid grid-cols-2 gap-x-5 border-t border-slate-200 pt-1">
              <CompactMoneyRow label="Subtotal" value={money(subtotal)} />
              <CompactMoneyRow label="Item Discounts" value={`- ${money(itemDiscount)}`} negative />
              <CompactMoneyRow label="Invoice Discount" value={`- ${money(invoiceDiscount)}`} negative />
              {tax > 0 && <CompactMoneyRow label="Tax" value={money(tax)} />}
            </div>

            <div className="invoice-primary-totals mt-3 grid grid-cols-3 divide-x divide-teal-700/20 overflow-hidden rounded-md border border-teal-700/20 bg-teal-50 text-[10px]">
              <div className="min-w-0 px-2 py-2.5">
                <p className="font-semibold text-slate-600">Grand Total</p>
                <p className="mt-1 whitespace-nowrap font-black text-teal-900">{money(grandTotal)}</p>
              </div>
              <div className="min-w-0 px-2 py-2.5">
                <p className="font-semibold text-slate-600">Amount Paid</p>
                <p className="mt-1 whitespace-nowrap font-bold text-slate-800">{money(amountPaid)}</p>
              </div>
              <div className="min-w-0 px-2 py-2.5">
                <p className="font-semibold text-slate-600">Balance Due</p>
                <p className={`mt-1 whitespace-nowrap font-black ${balanceDue > 0 ? "text-rose-700" : "text-slate-800"}`}>{money(balanceDue)}</p>
              </div>
            </div>
          </div>
        </section>

        {sale.notes?.trim() && (
          <section className="invoice-notes mt-5 border-l-4 border-teal-600 bg-slate-50 px-4 py-3 text-[11px]">
            <h2 className="font-bold uppercase tracking-wide text-teal-800">Notes</h2>
            <p className="mt-1 whitespace-pre-line text-slate-700">{sale.notes}</p>
          </section>
        )}

        <section className="invoice-footer mt-6 border-t border-teal-200 pt-4 text-xs leading-5">
          <h2 className="text-center text-[11px] font-black uppercase tracking-[0.14em] text-teal-800">Thank You for Your Business</h2>
          <p className="mt-1 text-center text-[10px] text-slate-500">We appreciate your support.</p>
        </section>
      </article>

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 210mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-screen-shell {
            width: 210mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .invoice-document {
            display: flex !important;
            width: 210mm !important;
            max-width: none !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 12mm !important;
            box-sizing: border-box !important;
            flex-direction: column;
            color: #1e293b !important;
            box-shadow: none !important;
          }

          .invoice-header {
            grid-template-columns: minmax(0, 1.35fr) minmax(58mm, 0.75fr);
            gap: 8mm;
            padding-bottom: 6mm;
          }

          .invoice-document > header,
          .invoice-document > section {
            flex: 0 0 auto;
          }

          .invoice-bill-to,
          .invoice-summary-grid,
          .invoice-notes,
          .invoice-footer {
            break-inside: avoid;
          }

          .invoice-footer {
            margin-top: auto !important;
            padding-top: 5mm !important;
          }

          .invoice-items thead {
            display: table-header-group;
            background-color: #0f766e !important;
            color: #fff !important;
          }

          .invoice-items tr,
          .invoice-totals {
            break-inside: avoid;
          }

          .invoice-items tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
          }

          .invoice-summary-grid {
            grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
            align-items: start;
            gap: 6mm;
            margin-top: 6mm;
          }

          .invoice-payment-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .invoice-adjustments > div {
            padding-top: 2.5px;
            padding-bottom: 2.5px;
          }

          .invoice-primary-totals {
            break-inside: avoid;
          }

          .invoice-bank-details {
            break-inside: avoid;
          }

          .invoice-payment-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </>
  );
}

function CompactMoneyRow({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 border-b border-slate-200 px-2 py-1.5 ${negative ? "text-rose-700" : ""}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap text-right tabular-nums">{value}</span>
    </div>
  );
}
