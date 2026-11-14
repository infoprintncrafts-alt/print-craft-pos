"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import InvoiceTemplate, { type InvoiceTemplateItem } from "@/app/components/InvoiceTemplate";
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

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function formatTime(value: string) {
  if (!value.includes("T")) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

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
  const [paymentMethod, setPaymentMethod] = useState("Credit");
  const [dueDate, setDueDate] = useState<string | null>(null);
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
        .eq("invoice_number", invoiceId)
        .maybeSingle();

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
        .eq("sale_id", saleData.id)
        .order("id");

      if (itemsError) throw new Error(itemsError.message);

      setItems((itemsData ?? []) as SaleItem[]);

      const [paymentsResult, orderResult] = await Promise.all([
        supabase
          .from("customer_payments")
          .select("payment_method")
          .eq("sale_id", saleData.id)
          .order("payment_date", { ascending: true }),
        supabase
          .from("orders")
          .select("due_date")
          .eq("sale_id", saleData.id)
          .maybeSingle(),
      ]);

      const methods = [...new Set(
        (paymentsResult.data ?? [])
          .map(({ payment_method }) => payment_method?.trim())
          .filter((method): method is string => Boolean(method))
      )];
      setPaymentMethod(methods.length > 0
        ? methods.map((method) => method.split(/[_\s]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")).join(", ")
        : Number(saleData.paid_amount || 0) > 0 ? "Not recorded" : "Credit");
      setDueDate(orderResult.data?.due_date ?? null);
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

  function sendInvoiceWhatsApp() {
    const phone = (customer?.phone || "").replace(/\D/g, "").replace(/^0/, "94");
    if (!phone) {
      alert("This customer does not have a WhatsApp number.");
      return;
    }
    const message = [
      `Hello ${customer?.name || "Customer"},`,
      "",
      `Thank you for choosing ${BUSINESS.name}.`,
      `Invoice: ${sale?.invoice_number}`,
      `Total: ${money(finalTotal)}`,
      `Paid: ${money(paidAmount)}`,
      `Balance due: ${money(balance)}`,
      "",
      "Please contact us if you need any assistance.",
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  // sale_items.discount is already the complete line discount.
  const finalTotal = Number(sale?.total || 0);
  const paidAmount = Number(sale?.paid_amount || 0);
  const balance = Math.max(finalTotal - paidAmount, 0);
  const itemDiscount = items.reduce((sum, item) => {
    const gross = Math.max(Number(item.quantity || 0), 0) * Math.max(Number(item.unit_price || 0), 0);
    return sum + Math.min(Math.max(Number(item.discount || 0), 0), gross);
  }, 0);
  const invoiceDiscount = Math.max(Number(sale?.discount || 0) - itemDiscount, 0);
  const paymentStatus = finalTotal > 0 && paidAmount >= finalTotal
    ? "PAID"
    : paidAmount > 0 ? "PARTIALLY PAID" : "UNPAID";
  const invoiceItems: InvoiceTemplateItem[] = items.map((item) => ({
    id: item.id,
    description: item.item_name,
    quantity: Math.max(Number(item.quantity || 0), 0),
    unitPrice: Math.max(Number(item.unit_price || 0), 0),
    discount: Math.max(Number(item.discount || 0), 0),
  }));

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
        <div className="mx-auto flex max-w-[794px] flex-wrap justify-between gap-2 px-4 py-3">
          <Link
            href="/sales"
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            ← Back to Sales
          </Link>

          <div className="flex gap-2"><button onClick={sendInvoiceWhatsApp} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">WhatsApp invoice</button><button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Print / Save PDF</button></div>
        </div>
      </div>

      <main className="invoice-screen-shell min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
        <InvoiceTemplate
          invoiceNumber={sale.invoice_number}
          customer={customer ?? undefined}
          items={invoiceItems}
          initialPaid={paidAmount}
          paymentMethod={paymentMethod}
          editable={false}
          showToolbar={false}
          date={formatDate(sale.sale_date)}
          time={formatTime(sale.sale_date)}
          dueDate={formatDate(dueDate || sale.sale_date)}
          paymentStatus={paymentStatus}
          invoiceDiscount={invoiceDiscount}
          tax={Math.max(Number(sale.tax || 0), 0)}
          total={finalTotal}
        />
      </main>
    </>
  );
}
