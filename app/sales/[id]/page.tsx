"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  const router = useRouter();

  const invoiceId =
    typeof params?.id === "string" ? params.id : "";

  const [sale, setSale] = useState<Sale | null>(null);
  const [customer, setCustomer] =
    useState<Customer | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setLoading(false);
      setError("Invoice ID is missing.");
      return;
    }

    loadInvoice(invoiceId);
  }, [invoiceId]);

  async function loadInvoice(id: string) {
    try {
      setLoading(true);
      setError("");

      // ==========================================
      // CHECK LOGIN
      // ==========================================

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!sessionData.session) {
        throw new Error("You are not logged in.");
      }

      // ==========================================
      // LOAD SALE
      // ==========================================

      const saleSelect = `
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
      `;

      const isSaleId =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id
        );

      const { data: saleData, error: saleError } = isSaleId
        ? await supabase
            .from("sales")
            .select(saleSelect)
            .eq("id", id)
            .single()
        : await supabase
            .from("sales")
            .select(saleSelect)
            .eq("invoice_number", id)
            .single();

      if (saleError) {
        throw new Error(
          "Unable to load invoice: " +
            saleError.message
        );
      }

      if (!saleData) {
        throw new Error("Invoice not found.");
      }

      // Explicitly create a Sale object.
      // This avoids the Supabase GenericStringError
      // type-casting problem.
      const loadedSale: Sale = {
        id: String(saleData.id),
        invoice_number: String(
          saleData.invoice_number ?? ""
        ),
        customer_id:
          saleData.customer_id === null ||
          saleData.customer_id === undefined
            ? null
            : String(saleData.customer_id),
        cashier_id:
          saleData.cashier_id === null ||
          saleData.cashier_id === undefined
            ? null
            : String(saleData.cashier_id),
        sale_date: String(
          saleData.sale_date
        ),
        subtotal: Number(
          saleData.subtotal ?? 0
        ),
        discount: Number(
          saleData.discount ?? 0
        ),
        tax: Number(
          saleData.tax ?? 0
        ),
        total: Number(
          saleData.total ?? 0
        ),
        paid_amount: Number(
          saleData.paid_amount ?? 0
        ),
        payment_status: String(
          saleData.payment_status ?? "unpaid"
        ),
        notes:
          saleData.notes === null ||
          saleData.notes === undefined
            ? null
            : String(saleData.notes),
      };

      setSale(loadedSale);

      // ==========================================
      // LOAD CUSTOMER
      // ==========================================

      setCustomer(null);

      if (loadedSale.customer_id) {
        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(
            `
              id,
              name,
              phone,
              address
            `
          )
          .eq(
            "id",
            loadedSale.customer_id
          )
          .single();

        if (
          !customerError &&
          customerData
        ) {
          const loadedCustomer: Customer = {
            id: String(customerData.id),
            name: String(
              customerData.name ?? ""
            ),
            phone:
              customerData.phone === null ||
              customerData.phone === undefined
                ? null
                : String(customerData.phone),
            address:
              customerData.address === null ||
              customerData.address === undefined
                ? null
                : String(customerData.address),
          };

          setCustomer(loadedCustomer);
        }
      }

      // ==========================================
      // LOAD SALE ITEMS
      // ==========================================

      const {
        data: itemsData,
        error: itemsError,
      } = await supabase
        .from("sale_items")
        .select(
          `
            id,
            sale_id,
            product_id,
            item_name,
            quantity,
            unit_price,
            discount,
            total
          `
        )
        .eq("sale_id", loadedSale.id)
        .order("id", {
          ascending: true,
        });

      if (itemsError) {
        throw new Error(
          "Unable to load invoice items: " +
            itemsError.message
        );
      }

      const loadedItems: SaleItem[] =
        (itemsData ?? []).map((item) => ({
          id: String(item.id),
          sale_id: String(item.sale_id),
          product_id:
            item.product_id === null ||
            item.product_id === undefined
              ? null
              : String(item.product_id),
          item_name: String(
            item.item_name ?? ""
          ),
          quantity: Number(
            item.quantity ?? 0
          ),
          unit_price: Number(
            item.unit_price ?? 0
          ),
          discount: Number(
            item.discount ?? 0
          ),
          total: Number(
            item.total ?? 0
          ),
        }));

      setItems(loadedItems);
    } catch (err: unknown) {
  console.error("INVOICE ERROR:", err);

  if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to load invoice."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // MONEY
  // ==========================================

  function money(value: number) {
    return (
      "LKR " +
      Number(value || 0).toLocaleString(
        "en-LK",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )
    );
  }

  // ==========================================
  // DATE
  // ==========================================

  function formatDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  // ==========================================
  // WHATSAPP NUMBER
  // ==========================================

  function getWhatsAppNumber(
    phone: string
  ) {
    let number = phone.replace(
      /[^0-9]/g,
      ""
    );

    if (number.startsWith("0")) {
      number =
        "94" + number.substring(1);
    }

    if (
      !number.startsWith("94") &&
      number.length === 9
    ) {
      number = "94" + number;
    }

    return number;
  }

  // ==========================================
  // OPEN WHATSAPP
  // ==========================================

  function openWhatsApp(
    message: string
  ) {
    if (!customer?.phone) {
      alert(
        "This customer does not have a phone number."
      );
      return;
    }

    const number =
      getWhatsAppNumber(
        customer.phone
      );

    const url =
      "https://wa.me/" +
      number +
      "?text=" +
      encodeURIComponent(message);

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ==========================================
  // WHATSAPP - SEND INVOICE
  // ==========================================

  function sendInvoiceWhatsApp() {
    if (!sale) return;

    const customerName =
      customer?.name || "Customer";

    const paid = Number(
      sale.paid_amount || 0
    );

    const invoiceTotal = Number(
      sale.total || 0
    );

    const currentBalance = Math.max(
      invoiceTotal - paid,
      0
    );

    const message =
      "Hello " +
      customerName +
      ",\n\n" +
      "Thank you for choosing " +
      BUSINESS.name +
      ".\n\n" +
      "Here are your invoice details:\n\n" +
      "Invoice No: " +
      sale.invoice_number +
      "\n" +
      "Date: " +
      formatDate(sale.sale_date) +
      "\n" +
      "Total: " +
      money(invoiceTotal) +
      "\n" +
      "Payment Received: " +
      money(paid) +
      "\n" +
      "Balance: " +
      money(currentBalance) +
      "\n\n" +
      "Thank you for your business! ❤️\n\n" +
      BUSINESS.name +
      "\n" +
      "Tel: " +
      BUSINESS.phone;

    openWhatsApp(message);
  }

  // ==========================================
  // WHATSAPP - PAYMENT REMINDER
  // ==========================================

  function sendPaymentReminderWhatsApp() {
    if (!sale) return;

    const invoiceTotal = Number(
      sale.total || 0
    );

    const paid = Number(
      sale.paid_amount || 0
    );

    const currentBalance = Math.max(
      invoiceTotal - paid,
      0
    );

    if (currentBalance <= 0) {
      alert(
        "There is no outstanding balance for this invoice."
      );
      return;
    }

    const customerName =
      customer?.name || "Customer";

    const message =
      "Hello " +
      customerName +
      ",\n\n" +
      "This is a friendly payment reminder from " +
      BUSINESS.name +
      ".\n\n" +
      "Invoice No: " +
      sale.invoice_number +
      "\n" +
      "Invoice Total: " +
      money(invoiceTotal) +
      "\n" +
      "Paid Amount: " +
      money(paid) +
      "\n" +
      "Outstanding Balance: " +
      money(currentBalance) +
      "\n\n" +
      "Kindly settle the outstanding balance at your convenience.\n\n" +
      "Bank Details:\n" +
      BUSINESS.bank +
      "\n" +
      "Account Name: " +
      BUSINESS.accountName +
      "\n" +
      "Account No: " +
      BUSINESS.accountNumber +
      "\n" +
      "Branch: " +
      BUSINESS.branch +
      "\n\n" +
      "Thank you for your cooperation.\n\n" +
      BUSINESS.name;

    openWhatsApp(message);
  }

  // ==========================================
  // WHATSAPP - PAYMENT RECEIVED
  // ==========================================

  function sendPaymentReceivedWhatsApp() {
    if (!sale) return;

    const invoiceTotal = Number(
      sale.total || 0
    );

    const paid = Number(
      sale.paid_amount || 0
    );

    const currentBalance = Math.max(
      invoiceTotal - paid,
      0
    );

    const customerName =
      customer?.name || "Customer";

    const message =
      "Hello " +
      customerName +
      ",\n\n" +
      "Payment received successfully. Thank you! ✅\n\n" +
      "Invoice No: " +
      sale.invoice_number +
      "\n" +
      "Invoice Total: " +
      money(invoiceTotal) +
      "\n" +
      "Total Paid: " +
      money(paid) +
      "\n" +
      "Remaining Balance: " +
      money(currentBalance) +
      "\n\n" +
      (currentBalance > 0
        ? "Your remaining balance is " +
          money(currentBalance) +
          "."
        : "Your invoice has been fully paid. Thank you! 🎉") +
      "\n\n" +
      BUSINESS.name +
      "\n" +
      "Tel: " +
      BUSINESS.phone;

    openWhatsApp(message);
  }

  // ==========================================
  // SAVE SALE
  // ==========================================

  async function saveSale() {
    if (!sale) return;

    try {
      setSaving(true);

      await new Promise<void>(
        (resolve) =>
          setTimeout(resolve, 300)
      );

      router.push("/sales");
    } catch (err) {
      console.error(err);

      alert(
        "Unable to return to sales."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // PRINT
  // ==========================================

  function printInvoice() {
    window.print();
  }

  // ==========================================
  // SAVE PDF
  // ==========================================

  function savePDF() {
    window.print();
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="text-lg font-bold text-slate-900">
            Loading invoice...
          </div>

          <div className="mt-2 text-sm text-slate-500">
            Please wait.
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error || !sale) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="text-4xl">
            ⚠️
          </div>

          <h1 className="mt-3 text-xl font-bold text-slate-900">
            Invoice Not Found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error ||
              "Unable to load invoice."}
          </p>

          <Link
            href="/sales"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Sales
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // TOTALS
  // ==========================================

  const paidAmount = Number(
    sale.paid_amount || 0
  );

  const total = Number(
    sale.total || 0
  );

  const balance = Math.max(
    total - paidAmount,
    0
  );

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <>
      {/* ========================================
          SCREEN CONTROLS
      ======================================== */}

      <div className="print:hidden sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/sales"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            ← Back to Sales
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveSale}
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "💾 Save Sale"}
            </button>

            <button
              type="button"
              onClick={printInvoice}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              🖨 Print
            </button>

            <button
              type="button"
              onClick={savePDF}
              className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-purple-700"
            >
              📄 Save PDF
            </button>

            <button
              type="button"
              onClick={
                sendInvoiceWhatsApp
              }
              disabled={!customer?.phone}
              className="rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              📱 Send Invoice
            </button>

            <button
              type="button"
              onClick={
                sendPaymentReminderWhatsApp
              }
              disabled={
                !customer?.phone ||
                balance <= 0
              }
              className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              💰 Payment Reminder
            </button>

            <button
              type="button"
              onClick={
                sendPaymentReceivedWhatsApp
              }
              disabled={!customer?.phone}
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ✅ Payment Received
            </button>
          </div>
        </div>
      </div>

      {/* ========================================
          INVOICE
      ======================================== */}

      <main className="invoice-screen-shell min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
        <InvoiceDocument sale={sale} customer={customer} items={items} />
      </main>

    </>
  );
}
