"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./shipping-labels.module.css";

type Customer = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
};

type LabelDetails = {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  reference: string;
  contents: string;
};

type WarningKey = "fragile" | "upright" | "dry" | "noStack";

const initialDetails: LabelDetails = {
  recipientName: "",
  recipientPhone: "",
  recipientAddress: "",
  reference: "",
  contents: "",
};

const warningOptions: { key: WarningKey; label: string }[] = [
  { key: "fragile", label: "Fragile" },
  { key: "upright", label: "This side up" },
  { key: "dry", label: "Keep dry" },
  { key: "noStack", label: "Do not stack" },
];

function WarningIcon({ type }: { type: WarningKey }) {
  if (type === "fragile") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M16 5h16l-2.5 15a9.5 9.5 0 0 1-19 0L8 5h8Zm1.5 0L20 20m12-15-2.5 15M20 29v8m8-8v8m-12 5h16" />
        <path d="m24 13 2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7L24 13Z" className={styles.iconAccent} />
      </svg>
    );
  }

  if (type === "upright") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M14 40V9m-7 7 7-7 7 7m13 24V9m-7 7 7-7 7 7" />
      </svg>
    );
  }

  if (type === "dry") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M5 22a19 19 0 0 1 38 0H5Zm19 0v7a5 5 0 0 0 10 0m-23 9 3-4m6 6 2-5m7 4 3-4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m24 5 17 9-17 9-17-9 17-9Zm-17 9v19l17 10 17-10V14M24 23v20m-17-10 17-10 17 10M5 8h38" />
    </svg>
  );
}

export default function ShippingLabelsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [details, setDetails] = useState<LabelDetails>(initialDetails);
  const [warnings, setWarnings] = useState<Record<WarningKey, boolean>>({
    fragile: false,
    upright: false,
    dry: false,
    noStack: false,
  });
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerLoadError, setCustomerLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, address, phone, whatsapp")
        .eq("is_active", true)
        .order("name");

      if (!active) return;

      if (error) {
        setCustomerLoadError("Customer list could not load. You can still enter the address manually.");
      } else {
        setCustomers((data ?? []) as Customer[]);
      }

      setLoadingCustomers(false);
    }

    void loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  function updateDetails(field: keyof LabelDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
  }

  function selectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    const customer = customers.find((item) => item.id === customerId);

    if (!customer) {
      setDetails((current) => ({ ...current, ...initialDetails }));
      return;
    }

    setDetails((current) => ({
      ...current,
      recipientName: customer.name,
      recipientPhone: customer.phone || customer.whatsapp || "",
      recipientAddress: customer.address || "",
    }));
  }

  function toggleWarning(key: WarningKey) {
    setWarnings((current) => ({ ...current, [key]: !current[key] }));
  }

  const activeWarnings = warningOptions.filter(({ key }) => warnings[key]);

  return (
    <main className={styles.page}>
      <div className={`${styles.toolbar} ${styles.noPrint}`}>
        <div className={styles.pageHeading}>
          <span className={styles.eyebrow}>CUSTOMER TOOLS</span>
          <h1>Shipping label</h1>
          <p>Prepare a customer label and print it in landscape at 100 × 70 cm.</p>
        </div>
        <button type="button" className={styles.printButton} onClick={() => window.print()}>
          <span aria-hidden="true">↗</span> Print label
        </button>
      </div>

      <div className={styles.workspace}>
        <section className={`${styles.editor} ${styles.noPrint}`} aria-label="Shipping label details">
          <div className={styles.editorHeader}>
            <div>
              <h2>Recipient details</h2>
              <p>Select a customer, then adjust the label fields if needed.</p>
            </div>
            <span className={styles.stepNumber}>01</span>
          </div>

          <label className={styles.fieldLabel} htmlFor="shipping-customer">Customer record</label>
          <select
            id="shipping-customer"
            className={styles.field}
            value={selectedCustomerId}
            onChange={(event) => selectCustomer(event.target.value)}
          >
            <option value="">Enter details manually</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          {loadingCustomers && <p className={styles.helper}>Loading customer records…</p>}
          {customerLoadError && <p className={styles.error}>{customerLoadError}</p>}

          <label className={styles.fieldLabel} htmlFor="recipient-name">Recipient name</label>
          <input
            id="recipient-name"
            className={styles.field}
            value={details.recipientName}
            onChange={(event) => updateDetails("recipientName", event.target.value)}
            placeholder="Full name or business"
          />

          <label className={styles.fieldLabel} htmlFor="recipient-phone">Phone / WhatsApp</label>
          <input
            id="recipient-phone"
            className={styles.field}
            value={details.recipientPhone}
            onChange={(event) => updateDetails("recipientPhone", event.target.value)}
            placeholder="Recipient contact number"
          />

          <label className={styles.fieldLabel} htmlFor="recipient-address">Delivery address</label>
          <textarea
            id="recipient-address"
            className={`${styles.field} ${styles.addressField}`}
            value={details.recipientAddress}
            onChange={(event) => updateDetails("recipientAddress", event.target.value)}
            placeholder="Street, town, district and postal code"
            rows={4}
          />

          <div className={styles.twoFields}>
            <div>
              <label className={styles.fieldLabel} htmlFor="label-reference">Order / tracking no.</label>
              <input
                id="label-reference"
                className={styles.field}
                value={details.reference}
                onChange={(event) => updateDetails("reference", event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className={styles.fieldLabel} htmlFor="label-contents">Package contents</label>
              <input
                id="label-contents"
                className={styles.field}
                value={details.contents}
                onChange={(event) => updateDetails("contents", event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className={styles.warningHeader}>
            <div>
              <h3>Handling warnings</h3>
              <p>Choose any icons that apply to this parcel.</p>
            </div>
            <span aria-hidden="true">!</span>
          </div>
          <div className={styles.warningChoices}>
            {warningOptions.map(({ key, label }) => (
              <label key={key} className={styles.warningChoice}>
                <input type="checkbox" checked={warnings[key]} onChange={() => toggleWarning(key)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className={styles.editorNote}>Print dialog page setup: landscape, custom paper 100 × 70 cm, scale 100%.</p>
        </section>

        <section className={styles.previewSection} aria-label="Shipping label preview">
          <div className={`${styles.previewHeader} ${styles.noPrint}`}>
            <div>
              <span className={styles.eyebrow}>LIVE PREVIEW</span>
              <h2>Print ready</h2>
            </div>
            <span className={styles.sizeBadge}>100 × 70 cm <i>·</i> Landscape</span>
          </div>

          <article className={styles.label} data-shipping-label>
            <header className={styles.labelHeader}>
              <div className={styles.sender}>
                <Image src="/logo.png" alt="Print & Craft logo" width={7023} height={1948} className={styles.logo} />
                <div className={styles.senderDetails}>
                  <strong>PRINT &amp; CRAFT (PVT) LTD.</strong>
                  <span>No.343, Main Road, Kinniya 01, Trincomalee, Sri Lanka</span>
                  <span>Tel / WhatsApp: +94 75 713 8882 · info.printncrafts@gmail.com</span>
                </div>
              </div>
              <div className={styles.labelTitle}>
                <span>DELIVERY</span>
                <h2>SHIPPING LABEL</h2>
                <div>PRINT &amp; CRAFT <b>·</b> SRI LANKA</div>
              </div>
            </header>

            <div className={styles.labelRule} />

            <div className={styles.labelBody}>
              <section className={styles.destination}>
                <div className={styles.destinationHeading}>
                  <span className={styles.toIcon} aria-hidden="true">→</span>
                  <div>
                    <span>DELIVER TO</span>
                    <h3>RECIPIENT</h3>
                  </div>
                </div>
                <div className={styles.recipientName}>{details.recipientName || "Recipient name"}</div>
                <div className={styles.recipientAddress}>{details.recipientAddress || "Delivery address will appear here"}</div>
                {details.recipientPhone && <div className={styles.recipientPhone}><span>CONTACT</span>{details.recipientPhone}</div>}
              </section>

              <aside className={styles.shipmentDetails}>
                <div className={styles.shipmentMark} aria-hidden="true"><span>PC</span><i>→</i></div>
                <div className={styles.referenceBlock}>
                  <span>ORDER / TRACKING NO.</span>
                  <strong>{details.reference || "— — — — — — — —"}</strong>
                </div>
                {details.contents && (
                  <div className={styles.contentsBlock}>
                    <span>PACKAGE CONTENTS</span>
                    <strong>{details.contents}</strong>
                  </div>
                )}
                <div className={styles.originBlock}>
                  <span>SENT WITH CARE FROM</span>
                  <strong>KINNIYA · SRI LANKA</strong>
                </div>
              </aside>
            </div>

            <footer className={styles.labelFooter}>
              <div className={styles.warningStrip}>
                {activeWarnings.length > 0 ? activeWarnings.map(({ key, label }) => (
                  <div className={styles.warningItem} key={key}>
                    <WarningIcon type={key} />
                    <span>{label}</span>
                  </div>
                )) : <div className={styles.noWarnings}>STANDARD HANDLING</div>}
              </div>
              <div className={styles.footerBrand}>
                <strong>PRINT &amp; CRAFT</strong>
                <span>PRINTING · DESIGNING · CUSTOMIZED GIFTS</span>
              </div>
            </footer>
          </article>
        </section>
      </div>
    </main>
  );
}
