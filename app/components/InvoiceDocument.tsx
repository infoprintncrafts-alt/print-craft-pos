"use client";

import { useEffect, useState } from "react";
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

    return { item, quantity, unitPrice, gross, discount, amount: Math.max(gross - discount, 0) };
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
      <article className="invoice-document mx-auto w-full max-w-[210mm] bg-white p-6 text-slate-900 shadow-xl sm:p-10 print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">{BUSINESS.name}</h1>
              <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-slate-600">{BUSINESS.tagline}</p>
              <div className="mt-3 space-y-1 text-xs leading-4 text-slate-600">
                <p>{BUSINESS.address}</p>
                <p>Tel: {BUSINESS.phone} <span className="px-1">|</span> WhatsApp: {BUSINESS.whatsapp}</p>
                <p>Email: {BUSINESS.email}</p>
              </div>
            </div>

            <div className="min-w-52 text-left sm:text-right">
              <h2 className="text-3xl font-black tracking-wide">INVOICE</h2>
              <dl className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between gap-4 sm:justify-end">
                  <dt className="font-semibold">Invoice No:</dt>
                  <dd>{sale.invoice_number}</dd>
                </div>
                <div className="flex justify-between gap-4 sm:justify-end">
                  <dt className="font-semibold">Invoice Date:</dt>
                  <dd>{formatDate(sale.sale_date)}</dd>
                </div>
                <div className="flex justify-between gap-4 sm:justify-end">
                  <dt className="font-semibold">Invoice Time:</dt>
                  <dd>{formatTime(sale.sale_date)}</dd>
                </div>
                <div className="flex justify-between gap-4 sm:justify-end">
                  <dt className="font-semibold">Payment Status:</dt>
                  <dd className="font-bold">{paymentStatus}</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        <section className="mt-5 border-b border-slate-300 pb-5">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">Bill To</h3>
            <dl className="mt-2 space-y-1 text-xs leading-4 text-slate-700">
              <div><dt className="inline font-semibold">Customer Name: </dt><dd className="inline">{customer?.name?.trim() || "Walk-in Customer"}</dd></div>
              <div><dt className="inline font-semibold">Contact Number: </dt><dd className="inline">{customer?.phone?.trim() || "—"}</dd></div>
              <div><dt className="inline font-semibold">Address: </dt><dd className="inline whitespace-pre-line">{customer?.address?.trim() || "—"}</dd></div>
            </dl>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider">Order Details</h3>
          <table className="w-full table-fixed border-collapse text-[10px] sm:text-xs">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[33%]" />
              <col className="w-[8%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-400 px-1 py-2 text-center">No.</th>
                <th className="border border-slate-400 px-2 py-2 text-left">Description</th>
                <th className="border border-slate-400 px-1 py-2 text-center">Qty</th>
                <th className="border border-slate-400 px-1 py-2 text-right">Unit Price (LKR)</th>
                <th className="border border-slate-400 px-1 py-2 text-right">Discount (LKR)</th>
                <th className="border border-slate-400 px-1 py-2 text-right">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.length > 0 ? itemRows.map((row, index) => (
                <tr key={row.item.id}>
                  <td className="border border-slate-300 px-1 py-2 text-center">{String(index + 1).padStart(2, "0")}</td>
                  <td className="break-words border border-slate-300 px-2 py-2">{row.item.item_name}</td>
                  <td className="border border-slate-300 px-1 py-2 text-center">{row.quantity}</td>
                  <td className="border border-slate-300 px-1 py-2 text-right whitespace-nowrap">{money(row.unitPrice)}</td>
                  <td className="border border-slate-300 px-1 py-2 text-right whitespace-nowrap">{row.discount > 0 ? money(row.discount) : "-"}</td>
                  <td className="border border-slate-300 px-1 py-2 text-right font-semibold whitespace-nowrap">{money(row.amount)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="border border-slate-300 px-3 py-5 text-center text-slate-500">No invoice items found.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="invoice-totals ml-auto mt-5 w-full max-w-[390px] text-xs">
          <MoneyRow label="Subtotal" value={money(subtotal)} />
          <MoneyRow label="Item Discounts" value={`- ${money(itemDiscount)}`} negative />
          <MoneyRow label="Invoice Discount" value={`- ${money(invoiceDiscount)}`} negative />
          {tax > 0 && <MoneyRow label="Tax" value={money(tax)} />}
          <MoneyRow label="Grand Total" value={money(grandTotal)} emphasized />
          <MoneyRow label="Amount Paid" value={money(amountPaid)} />
          <MoneyRow label="Balance Due" value={money(balanceDue)} emphasized negative={balanceDue > 0} />
        </section>

        <section className="mt-5 text-xs leading-5">
          <p><span className="font-semibold">Payment Method: </span>{paymentMethod}</p>
          <p><span className="font-semibold">Payment Reference: </span>{paymentReferences.join(", ") || "N/A"}</p>
        </section>

        {sale.notes?.trim() && (
          <section className="mt-5 border-t border-slate-300 pt-4 text-xs">
            <h3 className="font-bold uppercase tracking-wide">Notes</h3>
            <p className="mt-1 whitespace-pre-line text-slate-700">{sale.notes}</p>
          </section>
        )}

        <section className="mt-6 border-t border-slate-300 pt-4 text-xs leading-5">
          <h3 className="text-center font-black uppercase tracking-wider">Thank You for Your Business!</h3>
          <p className="mt-1 text-center text-slate-600">We appreciate your support and look forward to serving you again.</p>
          <h4 className="mt-4 font-bold">Important Notes:</h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
            <li>Please check your order and invoice details before leaving.</li>
            <li>Any issues regarding the supplied products or services should be reported to us promptly.</li>
            <li>Please keep this invoice for future reference.</li>
          </ul>
          <p className="mt-3 text-center italic text-slate-600">This is a computer-generated invoice and does not require a signature.</p>
          <p className="mt-3 text-center font-bold">{BUSINESS.name}</p>
          <p className="text-center italic text-slate-600">Your Ideas, Our Creativity!</p>
        </section>
      </article>

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          html,
          body {
            min-height: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-screen-shell {
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .invoice-document {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .invoice-document thead {
            display: table-header-group;
          }

          .invoice-document tr,
          .invoice-totals {
            break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}

function MoneyRow({
  label,
  value,
  negative = false,
  emphasized = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  emphasized?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 border-b border-slate-200 px-2 py-2 ${emphasized ? "font-bold" : ""} ${emphasized && !negative ? "bg-slate-100" : ""}`}>
      <span>{label}</span>
      <span className={`text-right tabular-nums ${negative ? "text-rose-700" : ""}`}>{value}</span>
    </div>
  );
}
