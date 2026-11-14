"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./InvoiceTemplate.module.css";

export type InvoiceTemplateItem = {
  id: number | string;
  description: string;
  unitPrice: number;
  discount: number;
  quantity?: number;
};

export type InvoiceTemplateBusiness = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  logo: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branch: string;
  paymentNote: string;
};

type Customer = { name: string | null; address: string | null; phone: string | null };

type InvoiceProps = {
  business?: Partial<InvoiceTemplateBusiness>;
  invoiceNumber?: string;
  customer?: Partial<Customer>;
  items?: InvoiceTemplateItem[];
  initialPaid?: number;
  paymentMethod?: string;
  editable?: boolean;
  showToolbar?: boolean;
  date?: string;
  time?: string;
  dueDate?: string;
  paymentStatus?: string;
  invoiceDiscount?: number;
  tax?: number;
  total?: number;
};

export const DEFAULT_INVOICE_BUSINESS: InvoiceTemplateBusiness = {
  name: "PRINT & CRAFT (PVT) LTD.",
  tagline: "PRINTING • DESIGNING • CUSTOMIZED GIFTS",
  address: "No.343, Main Road, Kinniya 01, Trincomalee, Sri Lanka",
  phone: "+94 75 713 8882",
  whatsapp: "+94 75 713 8882",
  email: "info.printncrafts@gmail.com",
  logo: "/logo.png",
  bankName: "HNB Bank",
  accountHolder: "MJM HASSAN",
  accountNumber: "16 90 20 157 157",
  branch: "Kinniya",
  paymentNote:
    "Please mention your invoice number as the bank transfer reference and send payment confirmation.",
};

const TERMS = [
  "Please check all items before leaving the premises.",
  "Customized orders are non-refundable once production begins.",
  "Please retain this invoice for future reference.",
];
const PAYMENT_OPTIONS = ["Bank Transfer", "Cash", "Card", "Credit"];

function money(value: number) {
  return `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function nonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

export default function InvoiceTemplate({
  business,
  invoiceNumber = "INV-0001",
  customer,
  items: initialItems,
  initialPaid = 0,
  paymentMethod: initialMethod = "Cash",
  editable = true,
  showToolbar = true,
  date,
  time,
  dueDate,
  paymentStatus,
  invoiceDiscount = 0,
  tax = 0,
  total,
}: InvoiceProps) {
  const [bankOverrides, setBankOverrides] = useState<Partial<InvoiceTemplateBusiness>>({});
  const businessDetails = { ...DEFAULT_INVOICE_BUSINESS, ...bankOverrides, ...business };
  const customerDetails = {
    name: customer?.name ?? "",
    address: customer?.address ?? "",
    phone: customer?.phone ?? "",
  };
  const [rows, setRows] = useState<InvoiceTemplateItem[]>(
    initialItems ?? [
      { id: 1, description: "", unitPrice: 0, discount: 0 },
      { id: 2, description: "", unitPrice: 0, discount: 0 },
      { id: 3, description: "", unitPrice: 0, discount: 0 },
      { id: 4, description: "", unitPrice: 0, discount: 0 },
      { id: 5, description: "", unitPrice: 0, discount: 0 },
    ]
  );
  const [paid, setPaid] = useState(nonNegative(initialPaid));
  const [method, setMethod] = useState(initialMethod);
  const [dateTime, setDateTime] = useState({ date: "", time: "" });

  useEffect(() => {
    const now = new Date();
    setDateTime({
      date: now.toLocaleDateString("en-GB"),
      time: now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    let active = true;
    async function loadBankDetails() {
      const { data, error } = await supabase
        .from("settings")
        .select("key,value")
        .in("key", [
          "invoice_bank_name",
          "invoice_bank_account_name",
          "invoice_bank_account_number",
          "invoice_bank_branch",
          "invoice_bank_payment_note",
        ]);

      if (!active || error) return;
      const values = new Map((data ?? []).map(({ key, value }) => [key, value?.trim()]));
      setBankOverrides({
        ...(values.get("invoice_bank_name") ? { bankName: values.get("invoice_bank_name") } : {}),
        ...(values.get("invoice_bank_account_name") ? { accountHolder: values.get("invoice_bank_account_name") } : {}),
        ...(values.get("invoice_bank_account_number") ? { accountNumber: values.get("invoice_bank_account_number") } : {}),
        ...(values.get("invoice_bank_branch") ? { branch: values.get("invoice_bank_branch") } : {}),
        ...(values.get("invoice_bank_payment_note") ? { paymentNote: values.get("invoice_bank_payment_note") } : {}),
      });
    }

    void loadBankDetails();
    return () => {
      active = false;
    };
  }, []);

  const subtotal = useMemo(
    () => rows.reduce((sum, item) => sum + nonNegative(item.unitPrice) * nonNegative(item.quantity ?? 1), 0),
    [rows]
  );
  const totalDiscount = useMemo(
    () =>
      rows.reduce(
        (sum, item) =>
          sum + Math.min(nonNegative(item.discount), nonNegative(item.unitPrice) * nonNegative(item.quantity ?? 1)),
        0
      ),
    [rows]
  );
  const safeInvoiceDiscount = nonNegative(invoiceDiscount);
  const safeTax = nonNegative(tax);
  const computedTotal = Math.max(subtotal - totalDiscount - safeInvoiceDiscount + safeTax, 0);
  const grandTotal = total === undefined ? computedTotal : nonNegative(total);
  const balance = Math.max(grandTotal - paid, 0);
  const change = Math.max(paid - grandTotal, 0);

  function updateItem(
    id: number | string,
    field: "description" | "quantity" | "unitPrice" | "discount",
    value: string | number
  ) {
    setRows((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (field === "description") {
          return { ...item, description: String(value) };
        }

        const amount = nonNegative(Number(value));
        if (field === "quantity") {
          const quantity = amount;
          const lineGross = nonNegative(item.unitPrice) * quantity;
          return { ...item, quantity, discount: Math.min(item.discount, lineGross) };
        }

        if (field === "unitPrice") {
          return {
            ...item,
            unitPrice: amount,
            discount: Math.min(item.discount, amount * nonNegative(item.quantity ?? 1)),
          };
        }

        return {
          ...item,
          discount: Math.min(amount, nonNegative(item.unitPrice) * nonNegative(item.quantity ?? 1)),
        };
      })
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { id: Date.now() + Math.random(), description: "", quantity: 1, unitPrice: 0, discount: 0 },
    ]);
  }

  function removeRow(id: number | string) {
    setRows((current) => current.filter((item) => item.id !== id));
  }

  function isPaymentOptionSelected(option: string) {
    return method.toLowerCase().replaceAll("_", " ").includes(option.toLowerCase());
  }

  function updatePaymentOption(option: string, checked: boolean) {
    const selected = PAYMENT_OPTIONS.filter(isPaymentOptionSelected);
    const next = checked
      ? option === "Credit"
        ? ["Credit"]
        : [...new Set([...selected.filter((selectedOption) => selectedOption !== "Credit"), option])]
      : selected.filter((selectedOption) => selectedOption !== option);
    setMethod(next.length > 0 ? next.join(" + ") : "Credit");
  }

  return (
    <div className={styles.invoiceWrapper} data-invoice-template>
      {showToolbar && (
        <div className={styles.invoiceToolbar}>
          <span className={styles.previewLabel}>{editable ? "Editable invoice preview" : "Invoice"}</span>
          {editable && <button type="button" onClick={addRow}>+ Add Item</button>}
          <button type="button" onClick={() => window.print()}>Print Invoice</button>
        </div>
      )}

      <article className={styles.invoicePage}>
        <header className={styles.invoiceHeader}>
          <div className={styles.businessBrand}>
            {businessDetails.logo && (
              <Image
                src={businessDetails.logo}
                alt={`${businessDetails.name} logo`}
                width={7023}
                height={1948}
                className={styles.businessLogo}
                preload
              />
            )}
            <div>
              <h1>{businessDetails.name}</h1>
              <p className={styles.tagline}>{businessDetails.tagline}</p>
              <p>{businessDetails.address}</p>
              <p>Tel: {businessDetails.phone}</p>
              <p>WhatsApp: {businessDetails.whatsapp}</p>
              <p>{businessDetails.email}</p>
            </div>
          </div>
          <div className={styles.invoiceHeading}>
            <h2>INVOICE</h2>
            <p><strong>Invoice No:</strong> {invoiceNumber}</p>
            <p><strong>Date:</strong> {date || dateTime.date || "—"}</p>
            {dueDate && <p><strong>Due Date:</strong> {dueDate}</p>}
            <p><strong>Time:</strong> {time || (date ? "—" : dateTime.time || "—")}</p>
            {paymentStatus && <p className={styles.paymentStatus}><strong>Status:</strong> {paymentStatus}</p>}
          </div>
        </header>

        <div className={styles.invoiceDivider} />

        <div className={styles.partiesGrid}>
          <section className={styles.detailsSection}>
            <h3>CUSTOMER DETAILS</h3>
            <div className={styles.customerGrid}>
              <p><strong>Name:</strong> {customerDetails.name || "Walk-in Customer"}</p>
              <p><strong>Address:</strong> {customerDetails.address || "—"}</p>
              <p><strong>Phone:</strong> {customerDetails.phone || "—"}</p>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h3>BANK ACCOUNT DETAILS</h3>
            <div className={styles.bankGrid}>
              <p>{businessDetails.accountHolder}</p>
              <p>{businessDetails.bankName}</p>
              <p>{businessDetails.accountNumber}</p>
              <p>{businessDetails.branch}</p>
            </div>
            {businessDetails.paymentNote && <p className={styles.paymentNote}>{businessDetails.paymentNote}</p>}
          </section>
        </div>

        <section className={styles.itemsSection}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th className={styles.numberCol}>No.</th>
                <th>Description of Item / Service</th>
                <th className={styles.quantityCol}>Qty</th>
                <th className={styles.priceCol}>Unit Price</th>
                <th className={styles.discountCol}>Item Discount</th>
                <th className={styles.amountCol}>Amount</th>
                {editable && <th className={`${styles.actionCol} ${styles.noPrint}`}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const quantity = nonNegative(item.quantity ?? 1);
                const gross = nonNegative(item.unitPrice) * quantity;
                const amount = gross - Math.min(nonNegative(item.discount), gross);
                return (
                  <tr key={item.id}>
                    <td className={styles.center}>{index + 1}</td>
                    <td>
                      {editable ? (
                        <input
                          className={styles.descriptionInput}
                          value={item.description}
                          onChange={(event) => updateItem(item.id, "description", event.target.value)}
                          placeholder="Item / Service"
                          aria-label={`Item ${index + 1} description`}
                        />
                      ) : item.description}
                    </td>
                    <td className={styles.center}>{quantity}</td>
                    <td>
                      {editable ? (
                        <input type="number" min="0" className={styles.numberInput} value={item.unitPrice || ""} onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)} aria-label={`Item ${index + 1} unit price`} />
                      ) : <span className={styles.moneyCell}>{money(item.unitPrice)}</span>}
                    </td>
                    <td>
                      {editable ? (
                        <input type="number" min="0" className={styles.numberInput} value={item.discount || ""} onChange={(event) => updateItem(item.id, "discount", event.target.value)} aria-label={`Item ${index + 1} discount`} />
                      ) : <span className={styles.moneyCell}>{money(item.discount)}</span>}
                    </td>
                    <td className={styles.amountCell}>{money(amount)}</td>
                    {editable && <td className={`${styles.noPrint} ${styles.center}`}><button type="button" className={styles.removeRow} onClick={() => removeRow(item.id)} aria-label={`Remove item ${index + 1}`} title="Remove item">×</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className={styles.bottomSection}>
          <div className={styles.paymentMethod}>
            <h3>PAYMENT METHOD</h3>
            <div className={styles.paymentOptions}>
              {PAYMENT_OPTIONS.map((option) => (
                <label key={option} className={styles.paymentChoice}>
                  <input
                    type="checkbox"
                    checked={isPaymentOptionSelected(option)}
                    disabled={!editable}
                    onChange={(event) => updatePaymentOption(option, event.target.checked)}
                    aria-label={option}
                  />
                  <span className={styles.paymentMarker} aria-hidden="true" />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {!PAYMENT_OPTIONS.some(isPaymentOptionSelected) && method !== "Credit" && (
              <p className={styles.paymentMethodValue}>{method}</p>
            )}
            <ul className={styles.terms}>{TERMS.map((term) => <li key={term}>{term}</li>)}</ul>
          </div>
          <div className={styles.summary}>
            <h3>PAYMENT SUMMARY</h3>
            <div className={styles.summaryRow}><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className={styles.summaryRow}><span>Total Item Discount</span><strong>{money(totalDiscount)}</strong></div>
            {safeInvoiceDiscount > 0 && <div className={styles.summaryRow}><span>Invoice Discount</span><strong>{money(safeInvoiceDiscount)}</strong></div>}
            {safeTax > 0 && <div className={styles.summaryRow}><span>Tax</span><strong>{money(safeTax)}</strong></div>}
            <div className={`${styles.summaryRow} ${styles.grandTotal}`}><span>GRAND TOTAL</span><strong>{money(grandTotal)}</strong></div>
            <div className={styles.summaryRow}>
              <label htmlFor="invoice-amount-paid">Amount Paid</label>
              {editable ? (
                <div className={styles.paidInput}>
                  <input
                    id="invoice-amount-paid"
                    type="number"
                    min="0"
                    value={paid || ""}
                    onChange={(event) => setPaid(nonNegative(Number(event.target.value)))}
                  />
                </div>
              ) : <strong>{money(paid)}</strong>}
            </div>
            <div className={`${styles.summaryRow} ${styles.balanceRow}`}>
              <span>{change > 0 ? "Change" : "BALANCE DUE"}</span>
              <strong>{money(change > 0 ? change : balance)}</strong>
            </div>
          </div>
        </section>

        <footer className={styles.invoiceFooter}>
          <p className={styles.thankYou}>THANK YOU FOR YOUR BUSINESS!</p>
          <p>We appreciate your trust and support.</p>
        </footer>
      </article>
    </div>
  );
}
