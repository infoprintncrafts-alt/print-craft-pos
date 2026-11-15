import Image from "next/image";
import styles from "./QuotationDocument.module.css";

export type QuotationDocumentItem = {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
};

export type QuotationDocumentData = {
  status: "open" | "converted" | "cancelled";
  quote_number: string;
  quote_date: string;
  valid_until: string | null;
  gross_subtotal: number;
  item_discount: number;
  subtotal: number;
  invoice_discount: number;
  tax: number;
  total: number;
  notes: string | null;
};

export type QuotationCustomer = {
  name: string;
  address: string | null;
  phone: string | null;
} | null;

function money(value: number) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default function QuotationDocument({
  quote,
  customer,
  items,
}: {
  quote: QuotationDocumentData;
  customer: QuotationCustomer;
  items: QuotationDocumentItem[];
}) {
  return (
    <article className={styles.page} data-quotation-document>
      <header className={styles.header}>
        <div className={styles.business}>
          <Image src="/logo.png" alt="Print & Craft logo" width={7023} height={1948} className={styles.logo} preload />
          <h1>PRINT &amp; CRAFT (PVT) LTD.</h1>
          <p>PRINTING · DESIGNING · CUSTOMIZED GIFTS</p>
          <p>No.343, Main Road, Kinniya 01, Trincomalee, Sri Lanka</p>
          <p>Tel / WhatsApp: +94 75 713 8882</p>
          <p>info.printncrafts@gmail.com</p>
        </div>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>PRICE PROPOSAL</p>
          <h2>QUOTATION</h2>
          <p><strong>Quote No:</strong> {quote.quote_number}</p>
          <p><strong>Date:</strong> {formatDate(quote.quote_date)}</p>
          <p><strong>Valid Until:</strong> {formatDate(quote.valid_until)}</p>
        </div>
      </header>

      <div className={`${styles.notice} ${quote.status !== "open" ? styles.noticeInactive : ""}`}>
        {quote.status === "converted" ? "CONVERTED TO TAX INVOICE" : quote.status === "cancelled" ? "CANCELLED QUOTATION" : "PROFORMA · NOT A TAX INVOICE"}
      </div>

      <section className={styles.customerBlock}>
        <h3>PREPARED FOR</h3>
        {customer ? (
          <>
            <p className={styles.customerName}>{customer.name}</p>
            {customer.address && <p>{customer.address}</p>}
            {customer.phone && <p>{customer.phone}</p>}
          </>
        ) : <p>Walk-in customer</p>}
      </section>

      <section className={styles.itemsSection}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th className={styles.numberColumn}>No.</th>
              <th>Description of item / service</th>
              <th className={styles.quantityColumn}>Qty</th>
              <th className={styles.moneyColumn}>Unit price</th>
              <th className={styles.moneyColumn}>Unit discount</th>
              <th className={styles.moneyColumn}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td className={styles.center}>{index + 1}</td>
                <td>{item.item_name}</td>
                <td className={styles.center}>{item.quantity}</td>
                <td className={styles.money}>{money(item.unit_price)}</td>
                <td className={styles.money}>{money(item.discount / Math.max(Number(item.quantity), 1))}</td>
                <td className={styles.money}><strong>{money(item.total)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.summarySection}>
        <div className={styles.notes}>
          <h3>NOTES</h3>
          <p>{quote.notes || "This proposal is subject to the validity date shown above."}</p>
          <p className={styles.ledgerNote}>This quotation does not record a sale, receive payment, or reserve stock. Those records are created only when it is confirmed as an invoice.</p>
        </div>
        <div className={styles.summary}>
          <h3>ESTIMATED TOTAL</h3>
          <div><span>Gross subtotal</span><strong>{money(quote.gross_subtotal)}</strong></div>
          <div><span>Item discount</span><strong>− {money(quote.item_discount)}</strong></div>
          <div><span>Subtotal</span><strong>{money(quote.subtotal)}</strong></div>
          {quote.invoice_discount > 0 && <div><span>Quotation discount</span><strong>− {money(quote.invoice_discount)}</strong></div>}
          {quote.tax > 0 && <div><span>Tax</span><strong>{money(quote.tax)}</strong></div>}
          <div className={styles.total}><span>PROPOSED TOTAL</span><strong>{money(quote.total)}</strong></div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Thank you for the opportunity to prepare this proposal.</p>
        <strong>Final pricing and tax invoice will be confirmed when the quotation is accepted.</strong>
      </footer>
    </article>
  );
}
