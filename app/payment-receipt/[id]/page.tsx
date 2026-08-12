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
  received_by: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  customer_code: string | null;
  phone: string | null;
  whatsapp: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  total: number;
  paid_amount: number;
  payment_status: string;
};

export default function PaymentReceiptPage() {
  const params = useParams();

  const paymentId =
    typeof params.id === "string"
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
    if (paymentId) {
      loadPayment();
    }
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

      const {
        data: paymentData,
        error: paymentError,
      } = await supabase
        .from("customer_payments")
        .select(`
          id,
          customer_id,
          sale_id,
          payment_date,
          amount,
          payment_method,
          reference_number,
          notes,
          received_by,
          created_at
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) {
        throw new Error(
          `Unable to load payment: ${paymentError.message}`
        );
      }

      setPayment(paymentData);

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
            whatsapp
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
            paid_amount,
            payment_status
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
    return `LKR ${Number(
      value || 0
    ).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDateTime(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">

        <div className="mx-auto max-w-[700px] rounded-xl bg-white p-10 text-center shadow-sm">

          <p className="text-sm text-slate-500">
            Loading receipt...
          </p>

        </div>

      </main>
    );
  }

  if (error || !payment) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">

        <div className="mx-auto max-w-[700px] rounded-xl border border-red-200 bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Receipt Not Found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error ||
              "Unable to load payment."}
          </p>

          <Link
            href="/payment-history"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Back to Payment History
          </Link>

        </div>

      </main>
    );
  }

  const remainingBalance = sale
    ? Math.max(
        Number(sale.total) -
          Number(sale.paid_amount),
        0
      )
    : 0;

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">

      <div className="mx-auto max-w-[700px]">

        {/* ACTIONS */}

        <div className="mb-5 flex items-center justify-between print:hidden">

          <Link
            href="/payment-history"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            ← Payment History
          </Link>

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            🖨 Print Receipt
          </button>

        </div>

        {/* RECEIPT */}

        <div className="rounded-xl bg-white p-6 shadow-lg sm:p-10 print:rounded-none print:shadow-none">

          {/* BUSINESS HEADER */}

          <div className="border-b border-slate-200 pb-6 text-center">

            <h1 className="text-2xl font-black text-slate-900">
              PRINT & CRAFT
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              PAYMENT RECEIPT
            </p>

          </div>

          {/* RECEIPT INFO */}

          <div className="mt-6 flex justify-between gap-5">

            <div>

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Payment ID
              </p>

              <p className="mt-1 break-all text-xs font-semibold text-slate-700">
                {payment.id}
              </p>

            </div>

            <div className="text-right">

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Date
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {formatDateTime(
                  payment.payment_date
                )}
              </p>

            </div>

          </div>

          {/* CUSTOMER */}

          <div className="mt-6 rounded-xl bg-slate-50 p-5">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Received From
            </p>

            <p className="mt-1 text-lg font-black text-slate-900">
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
                Phone: {customer.phone}
              </p>
            )}

          </div>

          {/* INVOICE */}

          <div className="mt-6">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Invoice
            </p>

            {sale ? (

              <Link
                href={`/sales/${sale.id}`}
                className="mt-1 inline-block text-lg font-black text-blue-600 hover:underline"
              >
                {sale.invoice_number}
              </Link>

            ) : (

              <p className="mt-1 text-sm text-slate-400">
                No invoice linked
              </p>

            )}

          </div>

          {/* PAYMENT */}

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">

            <div className="flex justify-between border-b border-slate-200 px-5 py-4">

              <span className="text-sm text-slate-500">
                Payment Method
              </span>

              <span className="text-sm font-bold text-slate-800">
                {paymentMethodLabel(
                  payment.payment_method
                )}
              </span>

            </div>

            {payment.reference_number && (

              <div className="flex justify-between border-b border-slate-200 px-5 py-4">

                <span className="text-sm text-slate-500">
                  Reference
                </span>

                <span className="text-sm font-bold text-slate-800">
                  {payment.reference_number}
                </span>

              </div>

            )}

            <div className="flex justify-between bg-green-50 px-5 py-5">

              <span className="text-base font-bold text-green-700">
                Amount Received
              </span>

              <span className="text-xl font-black text-green-700">
                {money(
                  Number(payment.amount)
                )}
              </span>

            </div>

          </div>

          {/* BALANCE */}

          {sale && (

            <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5">

              <div className="flex justify-between">

                <span className="text-sm text-orange-700">
                  Invoice Total
                </span>

                <span className="text-sm font-bold text-orange-800">
                  {money(
                    Number(sale.total)
                  )}
                </span>

              </div>

              <div className="mt-2 flex justify-between">

                <span className="text-sm text-orange-700">
                  Total Paid
                </span>

                <span className="text-sm font-bold text-orange-800">
                  {money(
                    Number(
                      sale.paid_amount
                    )
                  )}
                </span>

              </div>

              <div className="mt-3 border-t border-orange-200 pt-3">

                <div className="flex justify-between">

                  <span className="text-sm font-bold text-orange-700">
                    Remaining Balance
                  </span>

                  <span className="text-lg font-black text-orange-800">
                    {money(
                      remainingBalance
                    )}
                  </span>

                </div>

              </div>

            </div>

          )}

          {/* NOTE */}

          {payment.notes && (

            <div className="mt-6">

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Note
              </p>

              <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                {payment.notes}
              </p>

            </div>

          )}

          {/* FOOTER */}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">

            <p className="text-xs font-semibold text-slate-500">
              Payment received successfully.
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Thank you for your payment.
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}