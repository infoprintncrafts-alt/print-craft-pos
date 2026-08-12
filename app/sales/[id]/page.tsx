"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

      <main className="invoice-background">
        <div className="invoice-page">
          {/* ====================================
              HEADER
          ==================================== */}

          <header className="invoice-header">
            <div className="company-section">
              <h1 className="company-name">
                {BUSINESS.name}
              </h1>

              <p>
                {BUSINESS.address}
              </p>

              <p>
                Tel: {BUSINESS.phone}
              </p>

              <p>
                WhatsApp:{" "}
                {BUSINESS.whatsapp}
              </p>

              <p>
                Email: {BUSINESS.email}
              </p>

              {BUSINESS.website && (
                <p>
                  Website:{" "}
                  {BUSINESS.website}
                </p>
              )}
            </div>

            <div className="invoice-heading">
              <h2>INVOICE</h2>

              <div className="invoice-meta">
                <div>
                  <span>
                    Invoice No.
                  </span>

                  <strong>
                    {sale.invoice_number}
                  </strong>
                </div>

                <div>
                  <span>Date</span>

                  <strong>
                    {formatDate(
                      sale.sale_date
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </header>

          {/* ====================================
              CUSTOMER
          ==================================== */}

          <section className="customer-area">
            <div className="bill-to">
              <div className="label">
                BILL TO
              </div>

              <h3>
                {customer?.name ||
                  "Walk-in Customer"}
              </h3>

              {customer?.phone && (
                <p>
                  {customer.phone}
                </p>
              )}

              {customer?.address && (
                <p>
                  {customer.address}
                </p>
              )}
            </div>

            <div className="status-area">
              <div className="label">
                PAYMENT STATUS
              </div>

              <span
                className={
                  "payment-status " +
                  (sale.payment_status ===
                  "paid"
                    ? "paid"
                    : sale.payment_status ===
                        "partial"
                      ? "partial"
                      : "unpaid")
                }
              >
                {sale.payment_status}
              </span>
            </div>
          </section>

          {/* ====================================
              ITEMS
          ==================================== */}

          <section className="items-section">
            <table>
              <thead>
                <tr>
                  <th className="number">
                    #
                  </th>

                  <th>Description</th>

                  <th className="quantity">
                    Qty
                  </th>

                  <th className="price">
                    Unit Price
                  </th>

                  <th className="amount">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="empty-items"
                    >
                      No items found.
                    </td>
                  </tr>
                ) : (
                  items.map(
                    (item, index) => (
                      <tr
                        key={item.id}
                      >
                        <td className="number">
                          {index + 1}
                        </td>

                        <td>
                          <strong>
                            {
                              item.item_name
                            }
                          </strong>

                          {Number(
                            item.discount ||
                              0
                          ) > 0 && (
                            <small>
                              Discount:{" "}
                              {money(
                                Number(
                                  item.discount
                                )
                              )}
                            </small>
                          )}
                        </td>

                        <td className="quantity">
                          {item.quantity}
                        </td>

                        <td className="price">
                          {money(
                            Number(
                              item.unit_price
                            )
                          )}
                        </td>

                        <td className="amount">
                          {money(
                            Number(
                              item.total
                            )
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </section>

          {/* ====================================
              BOTTOM
          ==================================== */}

          <div className="bottom-grid">
            {/* BANK DETAILS */}

            <section className="bank-section">
              <div className="label">
                BANK DETAILS
              </div>

              <div className="bank-details">
                <div>
                  <span>Bank</span>

                  <strong>
                    {BUSINESS.bank}
                  </strong>
                </div>

                <div>
                  <span>
                    Account Name
                  </span>

                  <strong>
                    {BUSINESS.accountName}
                  </strong>
                </div>

                <div>
                  <span>
                    Account Number
                  </span>

                  <strong>
                    {BUSINESS.accountNumber}
                  </strong>
                </div>

                <div>
                  <span>Branch</span>

                  <strong>
                    {BUSINESS.branch}
                  </strong>
                </div>
              </div>
            </section>

            {/* TOTALS */}

            <section className="totals-section">
              <div className="total-line">
                <span>Subtotal</span>

                <strong>
                  {money(
                    Number(
                      sale.subtotal
                    )
                  )}
                </strong>
              </div>

              {Number(
                sale.discount || 0
              ) > 0 && (
                <div className="total-line">
                  <span>
                    Discount
                  </span>

                  <strong>
                    -{" "}
                    {money(
                      Number(
                        sale.discount
                      )
                    )}
                  </strong>
                </div>
              )}

              {Number(
                sale.tax || 0
              ) > 0 && (
                <div className="total-line">
                  <span>Tax</span>

                  <strong>
                    {money(
                      Number(sale.tax)
                    )}
                  </strong>
                </div>
              )}

              <div className="grand-total">
                <span>TOTAL</span>

                <strong>
                  {money(total)}
                </strong>
              </div>

              <div className="total-line payment-received">
                <span>
                  Payment Received
                </span>

                <strong>
                  {money(paidAmount)}
                </strong>
              </div>

              {balance > 0 && (
                <div className="balance">
                  <span>
                    Balance / Debt
                  </span>

                  <strong>
                    {money(balance)}
                  </strong>
                </div>
              )}
            </section>
          </div>

          {/* ====================================
              NOTES
          ==================================== */}

          {sale.notes && (
            <section className="notes-section">
              <div className="label">
                NOTES
              </div>

              <p>{sale.notes}</p>
            </section>
          )}

          {/* ====================================
              FOOTER
          ==================================== */}

          <footer className="invoice-footer">
            <strong>
              Thank you for your business!
            </strong>

            <span>
              PRINT &amp; CRAFT (PVT) LTD.
            </span>
          </footer>
        </div>
      </main>

      {/* ========================================
          CSS
      ======================================== */}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .invoice-background {
          min-height: 100vh;
          padding: 35px 20px;
          background: #f1f5f9;
          overflow-x: auto;
        }

        .invoice-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 18mm;
          background: white;
          color: #0f172a;
          box-shadow:
            0 10px 40px
            rgba(0, 0, 0, 0.12);
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          gap: 30px;
          padding-bottom: 12px;
          border-bottom: 2px solid #0f172a;
        }

        .company-section {
          flex: 1;
          min-width: 0;
        }

        .company-name {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .company-section p {
          margin: 3px 0;
          font-size: 10px;
          color: #64748b;
        }

        .invoice-heading {
          min-width: 220px;
          text-align: right;
        }

        .invoice-heading h2 {
          margin: 0 0 12px;
          font-size: 34px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .invoice-meta {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .invoice-meta div {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          font-size: 10px;
        }

        .invoice-meta span {
          color: #94a3b8;
        }

        .invoice-meta strong {
          min-width: 120px;
          color: #0f172a;
        }

        .customer-area {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
          margin-bottom: 18px;
        }

        .bill-to {
          min-width: 0;
        }

        .label {
          margin-bottom: 5px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .bill-to h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
        }

        .bill-to p {
          margin: 4px 0 0;
          max-width: 350px;
          font-size: 10px;
          line-height: 1.4;
          color: #64748b;
        }

        .status-area {
          flex-shrink: 0;
          text-align: right;
        }

        .payment-status {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .payment-status.paid {
          color: #15803d;
          background: #dcfce7;
        }

        .payment-status.partial {
          color: #c2410c;
          background: #ffedd5;
        }

        .payment-status.unpaid {
          color: #dc2626;
          background: #fee2e2;
        }

        .items-section {
          margin-top: 10px;
        }

        .items-section table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .items-section th {
          padding: 10px 8px;
          background: #0f172a;
          color: white;
          font-size: 9px;
          font-weight: 800;
          text-align: left;
          text-transform: uppercase;
        }

        .items-section td {
          padding: 9px 8px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 10px;
          vertical-align: middle;
        }

        .items-section td strong {
          font-weight: 700;
        }

        .items-section td small {
          display: block;
          margin-top: 3px;
          font-size: 8px;
          color: #94a3b8;
        }

        .empty-items {
          padding: 20px !important;
          text-align: center !important;
          color: #94a3b8;
        }

        .number {
          width: 7%;
          text-align: center !important;
        }

        .quantity {
          width: 10%;
          text-align: center !important;
        }

        .price {
          width: 19%;
          text-align: right !important;
        }

        .amount {
          width: 20%;
          text-align: right !important;
          font-weight: 700;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns:
            1fr 330px;
          gap: 35px;
          margin-top: 22px;
          align-items: start;
        }

        .bank-section {
          padding: 13px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
        }

        .bank-details {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 12px 20px;
        }

        .bank-details span {
          display: block;
          margin-bottom: 3px;
          font-size: 8px;
          color: #94a3b8;
        }

        .bank-details strong {
          display: block;
          font-size: 9px;
          color: #334155;
          word-break: break-word;
        }

        .totals-section {
          width: 100%;
        }

        .total-line {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 5px 0;
          font-size: 10px;
        }

        .total-line span {
          color: #64748b;
        }

        .grand-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 7px;
          padding: 10px 0;
          border-top: 2px solid #0f172a;
          border-bottom: 1px solid #cbd5e1;
        }

        .grand-total span {
          font-size: 12px;
          font-weight: 900;
        }

        .grand-total strong {
          font-size: 18px;
          font-weight: 900;
        }

        .payment-received {
          margin-top: 6px;
        }

        .payment-received strong {
          color: #15803d;
        }

        .balance {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-top: 5px;
          padding: 8px 10px;
          border-radius: 5px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 10px;
          font-weight: 800;
        }

        .notes-section {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .notes-section p {
          margin: 4px 0 0;
          font-size: 10px;
          line-height: 1.5;
          color: #64748b;
          white-space: pre-wrap;
        }

        .invoice-footer {
          margin-top: 35px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }

        .invoice-footer strong {
          display: block;
          font-size: 11px;
        }

        .invoice-footer span {
          display: block;
          margin-top: 4px;
          font-size: 8px;
          color: #94a3b8;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body {
            -webkit-print-color-adjust:
              exact !important;
            print-color-adjust:
              exact !important;
          }

          .invoice-background {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          .invoice-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 18mm !important;
            box-shadow: none !important;
          }

          .invoice-header,
          .customer-area,
          .items-section,
          .bottom-grid,
          .notes-section,
          .invoice-footer {
            page-break-inside: avoid !important;
          }

          .items-section tr {
            page-break-inside: avoid !important;
          }
        }

        @media screen and (max-width: 800px) {
          .invoice-background {
            padding: 15px 5px;
            overflow-x: auto;
          }

          .invoice-page {
            margin: 0 auto;
          }
        }
      `}</style>
    </>
  );
}
