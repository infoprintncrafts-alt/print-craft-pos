"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "./InvoiceTemplate.module.css";

export type InvoiceTemplateItem = {
  id: number;
  description: string;
  unitPrice: number;
  discount: number;
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

type Customer = { name: string; address: string; phone: string };

type InvoiceProps = {
  business?: Partial<InvoiceTemplateBusiness>;
  invoiceNumber?: string;
  customer?: Partial<Customer>;
  items?: InvoiceTemplateItem[];
  initialPaid?: number;
  paymentMethod?: string;
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
}: InvoiceProps) {
  const businessDetails = { ...DEFAULT_INVOICE_BUSINESS, ...business };
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
  }, []);

  const subtotal = useMemo(
    () => rows.reduce((sum, item) => sum + nonNegative(item.unitPrice), 0),
    [rows]
  );
  const totalDiscount = useMemo(
    () =>
      rows.reduce(
        (sum, item) =>
          sum + Math.min(nonNegative(item.discount), nonNegative(item.unitPrice)),
        0
      ),
    [rows]
  );
  const grandTotal = Math.max(subtotal - totalDiscount, 0);
  const balance = Math.max(grandTotal - paid, 0);
  const change = Math.max(paid - grandTotal, 0);

  function updateItem(
    id: number,
    field: keyof InvoiceTemplateItem,
    value: string | number
  ) {
    setRows((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (field === "description") {
          return { ...item, description: String(value) };
        }

        const amount = nonNegative(Number(value));
        if (field === "unitPrice") {
          return {
            ...item,
            unitPrice: amount,
            discount: Math.min(item.discount, amount),
          };
        }

        return { ...item, discount: Math.min(amount, nonNegative(item.unitPrice)) };
      })
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { id: Date.now() + Math.random(), description: "", unitPrice: 0, discount: 0 },
    ]);
  }

  function removeRow(id: number) {
    setRows((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className={styles.invoiceWrapper} data-invoice-template>
      <div className={styles.invoiceToolbar}>
        <span className={styles.previewLabel}>Editable invoice preview</span>
        <button type="button" onClick={addRow}>+ Add Item</button>
        <button type="button" onClick={() => window.print()}>Print Invoice</button>
      </div>

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
            <p><strong>Date:</strong> {dateTime.date || "—"}</p>
            <p><strong>Time:</strong> {dateTime.time || "—"}</p>
          </div>
        </header>

        <div className={styles.invoiceDivider} />

        <section className={styles.detailsSection}>
          <h3>BANK ACCOUNT DETAILS</h3>
          <div className={styles.bankGrid}>
            <p><strong>Bank:</strong> {businessDetails.bankName}</p>
            <p><strong>Account Holder:</strong> {businessDetails.accountHolder}</p>
            <p><strong>Account Number:</strong> {businessDetails.accountNumber}</p>
            <p><strong>Branch:</strong> {businessDetails.branch}</p>
          </div>
          {businessDetails.paymentNote && <p className={styles.paymentNote}>{businessDetails.paymentNote}</p>}
        </section>

        <section className={styles.detailsSection}>
          <h3>CUSTOMER DETAILS</h3>
          <div className={styles.customerGrid}>
            <p><strong>Name:</strong> {customerDetails.name || "Walk-in Customer"}</p>
            <p><strong>Phone:</strong> {customerDetails.phone || "—"}</p>
            <p className={styles.customerAddress}><strong>Address:</strong> {customerDetails.address || "—"}</p>
          </div>
        </section>

        <section className={styles.itemsSection}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th className={styles.numberCol}>No.</th>
                <th>Description of Item / Service</th>
                <th className={styles.priceCol}>Unit Price</th>
                <th className={styles.discountCol}>Item Discount</th>
                <th className={styles.amountCol}>Amount</th>
                <th className={`${styles.actionCol} ${styles.noPrint}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const amount = nonNegative(item.unitPrice) - Math.min(nonNegative(item.discount), nonNegative(item.unitPrice));
                return (
                  <tr key={item.id}>
                    <td className={styles.center}>{index + 1}</td>
                    <td>
                      <input
                        className={styles.descriptionInput}
                        value={item.description}
                        onChange={(event) => updateItem(item.id, "description", event.target.value)}
                        placeholder="Item / Service"
                        aria-label={`Item ${index + 1} description`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className={styles.numberInput}
                        value={item.unitPrice || ""}
                        onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)}
                        aria-label={`Item ${index + 1} unit price`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className={styles.numberInput}
                        value={item.discount || ""}
                        onChange={(event) => updateItem(item.id, "discount", event.target.value)}
                        aria-label={`Item ${index + 1} discount`}
                      />
                    </td>
                    <td className={styles.amountCell}>{money(amount)}</td>
                    <td className={`${styles.noPrint} ${styles.center}`}>
                      <button
                        type="button"
                        className={styles.removeRow}
                        onClick={() => removeRow(item.id)}
                        aria-label={`Remove item ${index + 1}`}
                        title="Remove item"
                      >×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className={styles.bottomSection}>
          <div className={styles.paymentMethod}>
            <h3>PAYMENT METHOD</h3>
            <select value={method} onChange={(event) => setMethod(event.target.value)} aria-label="Payment method">
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Card</option>
              <option>Credit</option>
              <option>Cash + Bank Transfer</option>
              <option>Other</option>
            </select>
          </div>
          <div className={styles.summary}>
            <h3>PAYMENT SUMMARY</h3>
            <div className={styles.summaryRow}><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className={styles.summaryRow}><span>Total Item Discount</span><strong>{money(totalDiscount)}</strong></div>
            <div className={`${styles.summaryRow} ${styles.grandTotal}`}><span>GRAND TOTAL</span><strong>{money(grandTotal)}</strong></div>
            <div className={styles.summaryRow}>
              <label htmlFor="invoice-amount-paid">Amount Paid</label>
              <div className={styles.paidInput}>
                <input
                  id="invoice-amount-paid"
                  type="number"
                  min="0"
                  value={paid || ""}
                  onChange={(event) => setPaid(nonNegative(Number(event.target.value)))}
                />
              </div>
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
          <div className={styles.signature}>
            <span>Customer Signature</span>
            <span>Authorized Signature</span>
          </div>
          <ul className={styles.terms}>{TERMS.map((term) => <li key={term}>{term}</li>)}</ul>
        </footer>
      </article>
    </div>
  );
}
