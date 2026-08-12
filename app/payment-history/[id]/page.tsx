"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: string;
  customer_id: string | null;
  sale_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
};

type Customer = {
  id: string;
  name: string;
  customer_code: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  total: number;
  paid_amount: number;
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

export default function PaymentReceiptPage() {
  const params = useParams();

  const paymentId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [payment, setPayment] =
    useState<Payment | null>(null);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [sale, setSale] =
    useState<Sale | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!paymentId) {
      setError("Payment ID is missing.");
      setLoading(false);
      return;
    }

    loadPayment();
  }, [paymentId]);

  async function loadPayment() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "You are not logged in."
        );
      }

      // ============================================
      // LOAD PAYMENT
      // ============================================

      const { data: paymentData, error: paymentError } =
        await supabase
          .from("customer_payments")
          .select(`
            id,
            customer_id,
            sale_id,
            payment_date,
            amount,
            payment_method,
            reference_number,
            notes
          `)
          .eq("id", paymentId)
          .single();

      if (paymentError) {
        throw new Error(
          `Unable to load payment: ${paymentError.message}`
        );
      }

      if (!paymentData) {
        throw new Error(
          "Payment record not found."
        );
      }

      setPayment(paymentData);

      // ============================================
      // LOAD CUSTOMER
      // ============================================

      if (paymentData.customer_id) {
        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(`
            id,
            name,
            customer_code,
            phone,
            whatsapp,
            address
          `)
          .eq(
            "id",
            paymentData.customer_id
          )
          .single();

        if (!customerError) {
          setCustomer(customerData);
        }
      }

      // ============================================
      // LOAD INVOICE
      // ============================================

      if (paymentData.sale_id) {
        const {
          data: saleData,
          error: saleError,
        } = await supabase
          .from("sales")
          .select(`
            id,
            invoice_number,
            sale_date,
            total,
            paid_amount
          `)
          .eq(
            "id",
            paymentData.sale_id
          )
          .single();

        if (!saleError) {
          setSale(saleData);
        }
      }

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment."
      );
    } finally {
      setLoading(false);
    }
  }

  function money(value: number) {
    return `LKR ${Number(value || 0).toLocaleString(
      "en-LK",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function paymentMethodLabel(
    method: string
  ) {
    switch (method) {
      case "cash":
        return "Cash";

      case "bank_transfer":
        return "Bank Transfer";

      case "card":
        return "Card";

      case "other":
        return "Other";

      default:
        return method;
    }
  }

  function printReceipt() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">
          Loading receipt...
        </p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="text-4xl">
            ⚠️
          </div>

          <h1 className="mt-3 text-lg font-bold text-slate-900">
            Receipt Not Found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error ||
              "Unable to load payment."}
          </p>

          <Link
            href="/payment-history"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to Payment History
          </Link>

        </div>
      </div>
    );
  }

  const invoiceBalance = sale
    ? Math.max(
        Number(sale.total || 0) -
          Number(sale.paid_amount || 0),
        0
      )
    : 0;

  return (
    <>
      {/* =========================================
          SCREEN CONTROLS
      ========================================= */}

      <div className="print:hidden sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">

        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-3 px-4 py-3">

          <Link
            href="/payment-history"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            ← Payment History
          </Link>

          <button
            type="button"
            onClick={printReceipt}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            🖨 Print Receipt
          </button>

        </div>

      </div>

      {/* =========================================
          RECEIPT
      ========================================= */}

      <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">

        <div className="mx-auto w-full max-w-[794px] bg-white shadow-xl print:max-w-none print:shadow-none">

          <div className="receipt-page p-[45px] sm:p-[55px]">

            {/* HEADER */}

            <div className="border-b-2 border-slate-900 pb-6">

              <h1 className="text-2xl font-black text-slate-900">
                {BUSINESS.name}
              </h1>

              <div className="mt-2 space-y-0.5 text-xs leading-5 text-slate-500">

                <p>
                  {BUSINESS.address}
                </p>

                <p>
                  Tel: {BUSINESS.phone}
                </p>

                <p>
                  WhatsApp: {BUSINESS.whatsapp}
                </p>

                <p>
                  Email: {BUSINESS.email}
                </p>

              </div>

            </div>

            {/* RECEIPT TITLE */}

            <div className="mt-7 flex items-start justify-between">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Payment Receipt
                </p>

                <h2 className="mt-1 text-3xl font-black text-slate-900">
                  RECEIPT
                </h2>

              </div>

              <div className="text-right text-xs">

                <p className="text-slate-400">
                  Receipt Date
                </p>

                <p className="mt-1 font-bold text-slate-800">
                  {formatDate(
                    payment.payment_date
                  )}
                </p>

                <p className="mt-1 text-slate-400">
                  {formatDateTime(
                    payment.payment_date
                  ).split(", ")[1]}
                </p>

              </div>

            </div>

            {/* CUSTOMER */}

            <div className="mt-8 grid grid-cols-2 gap-8">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Received From
                </p>

                <p className="mt-2 text-base font-bold text-slate-900">
                  {customer?.name ||
                    "Unknown Customer"}
                </p>

                {customer?.customer_code && (
                  <p className="mt-1 text-xs text-slate-500">
                    Customer Code:{" "}
                    {customer.customer_code}
                  </p>
                )}

                {customer?.phone && (
                  <p className="mt-1 text-xs text-slate-500">
                    {customer.phone}
                  </p>
                )}

                {customer?.address && (
                  <p className="mt-1 max-w-[280px] text-xs leading-5 text-slate-500">
                    {customer.address}
                  </p>
                )}

              </div>

              <div className="text-right">

                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Payment Method
                </p>

                <p className="mt-2 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  {paymentMethodLabel(
                    payment.payment_method
                  )}
                </p>

              </div>

            </div>

            {/* PAYMENT DETAILS */}

            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">

              <div className="bg-slate-900 px-5 py-4 text-sm font-bold text-white">
                Payment Details
              </div>

              <div className="divide-y divide-slate-100">

                <div className="flex justify-between px-5 py-4">

                  <span className="text-sm text-slate-500">
                    Payment Amount
                  </span>

                  <span className="text-xl font-black text-green-600">
                    {money(
                      Number(payment.amount)
                    )}
                  </span>

                </div>

                {sale && (
                  <>
                    <div className="flex justify-between px-5 py-4">

                      <span className="text-sm text-slate-500">
                        Invoice
                      </span>

                      <Link
                        href={`/sales/${sale.id}`}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        {sale.invoice_number}
                      </Link>

                    </div>

                    <div className="flex justify-between px-5 py-4">

                      <span className="text-sm text-slate-500">
                        Invoice Total
                      </span>

                      <span className="text-sm font-bold text-slate-800">
                        {money(
                          Number(sale.total)
                        )}
                      </span>

                    </div>

                    <div className="flex justify-between px-5 py-4">

                      <span className="text-sm text-slate-500">
                        Remaining Balance
                      </span>

                      <span
                        className={`text-sm font-black ${
                          invoiceBalance > 0
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {money(invoiceBalance)}
                      </span>

                    </div>
                  </>
                )}

                {payment.reference_number && (
                  <div className="flex justify-between px-5 py-4">

                    <span className="text-sm text-slate-500">
                      Reference Number
                    </span>

                    <span className="text-sm font-semibold text-slate-800">
                      {payment.reference_number}
                    </span>

                  </div>
                )}

              </div>

            </div>

            {/* NOTE */}

            {payment.notes && (
              <div className="mt-6 rounded-lg bg-slate-50 p-4">

                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Note
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {payment.notes}
                </p>

              </div>
            )}

            {/* THANK YOU */}

            <div className="mt-12 border-t border-slate-200 pt-6 text-center">

              <p className="text-sm font-bold text-slate-800">
                Payment Received Successfully
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Thank you for your payment.
              </p>

              <p className="mt-4 text-[10px] text-slate-400">
                {BUSINESS.name}
              </p>

            </div>

          </div>

        </div>

      </main>

      {/* =========================================
          PRINT CSS
      ========================================= */}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .receipt-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 18mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
}