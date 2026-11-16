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
  specialInstructions: string;
};

type WarningKey = "fragile" | "upright" | "dry" | "noStack";

const initialDetails: LabelDetails = {
  recipientName: "",
  recipientPhone: "",
  recipientAddress: "",
  reference: "",
  contents: "",
  specialInstructions: "",
};

const warningOptions: { key: WarningKey; label: string }[] = [
  { key: "fragile", label: "Fragile" },
  { key: "upright", label: "This side up" },
  { key: "dry", label: "Keep dry" },
  { key: "noStack", label: "Do not stack" },
];

const code39Patterns: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw",
  C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
  G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
  O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn",
  S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw",
  W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn",
  "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn",
};

function TrackingBarcode({ value }: { value: string }) {
  const trackingNumber = value.trim().toUpperCase();
  const canEncode = trackingNumber.length > 0 &&
    trackingNumber.split("").every((character) => Object.hasOwn(code39Patterns, character));

  if (!canEncode) {
    return <div className={styles.barcodePlaceholder}>ENTER A CODE 39 TRACKING NUMBER FOR BARCODE</div>;
  }

  const bars: { x: number; width: number }[] = [];
  let cursor = 10;

  for (const character of `*${trackingNumber}*`) {
    const pattern = code39Patterns[character];
    pattern.split("").forEach((size, index) => {
      const width = size === "w" ? 3 : 1;
      if (index % 2 === 0) bars.push({ x: cursor, width });
      cursor += width;
    });
    cursor += 1;
  }

  return (
    <svg className={styles.barcode} viewBox={`0 0 ${cursor + 9} 100`} preserveAspectRatio="none" role="img" aria-label={`Code 39 barcode for ${trackingNumber}`}>
      <rect x="0" y="0" width={cursor + 9} height="100" fill="#fff" />
      {bars.map((bar, index) => <rect key={index} x={bar.x} y="0" width={bar.width} height="100" fill="#111" />)}
    </svg>
  );
}

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
  const [signatureRequired, setSignatureRequired] = useState(false);
  const [insuranceRequired, setInsuranceRequired] = useState(false);
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
  const labelDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  }).format(new Date());

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
              <label className={styles.fieldLabel} htmlFor="label-reference">Tracking number</label>
              <input
                id="label-reference"
                className={styles.field}
                value={details.reference}
                onChange={(event) => updateDetails("reference", event.target.value)}
                placeholder="Enter a tracking number"
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

          <div className={styles.deliveryOptions}>
            <label className={styles.deliveryOption}>
              <input type="checkbox" checked={insuranceRequired} onChange={() => setInsuranceRequired((value) => !value)} />
              <span>Insurance required</span>
            </label>
            <label className={styles.deliveryOption}>
              <input type="checkbox" checked={signatureRequired} onChange={() => setSignatureRequired((value) => !value)} />
              <span>Signature required</span>
            </label>
          </div>

          <label className={styles.fieldLabel} htmlFor="label-instructions">Special instructions</label>
          <textarea
            id="label-instructions"
            className={`${styles.field} ${styles.addressField}`}
            value={details.specialInstructions}
            onChange={(event) => updateDetails("specialInstructions", event.target.value)}
            placeholder="e.g. Leave at front desk"
            rows={2}
          />
          <p className={styles.helper}>Barcode uses Code 39: A–Z, 0–9, space, and - . $ / + %.</p>

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
              <div className={styles.returnAddress}>
                <div className={styles.logoFrame}>
                  <Image src="/logo.png" alt="Print & Craft logo" width={7023} height={1948} className={styles.logo} />
                </div>
                <div className={styles.returnCopy}>
                  <strong>RETURN ADDRESS</strong>
                  <b>PRINT &amp; CRAFT (PVT) LTD.</b>
                  <span>No.343, Main Road, Kinniya 01, Trincomalee, Sri Lanka</span>
                  <span>+94 75 713 8882 · info.printncrafts@gmail.com</span>
                </div>
              </div>
              <div className={styles.topWarning}>
                <span>{activeWarnings[0]?.label.toUpperCase() || "DELIVERY"}</span>
                <strong>
                  {activeWarnings.some(({ key }) => key === "fragile")
                    ? "PLEASE HANDLE WITH CARE"
                    : activeWarnings.length > 0
                      ? "FOLLOW HANDLING SYMBOLS"
                      : "CUSTOMER DELIVERY"}
                </strong>
              </div>
            </header>

            <div className={styles.serviceBar}>
              <strong>SHIPPING LABEL</strong>
              <span>DATE: {labelDate}</span>
            </div>

            <div className={styles.fromToGrid}>
              <section className={styles.addressPanel}>
                <h2>FROM:</h2>
                <div className={styles.addressLines}>
                  <strong>PRINT &amp; CRAFT (PVT) LTD.</strong>
                  <span>No.343, Main Road, Kinniya 01, Trincomalee, Sri Lanka</span>
                  <span>Phone: +94 75 713 8882</span>
                  <span>WhatsApp: +94 75 713 8882</span>
                </div>
              </section>
              <section className={styles.addressPanel}>
                <h2>TO:</h2>
                <div className={styles.addressLines}>
                  <strong>{details.recipientName || "Recipient name"}</strong>
                  <span>{details.recipientAddress || "Delivery address"}</span>
                  <span>Phone: {details.recipientPhone || "Add recipient phone"}</span>
                </div>
              </section>
            </div>

            <section className={styles.additionalInfo}>
              <h2>ADDITIONAL INFORMATION:</h2>
              <div className={styles.infoGrid}>
                <p><strong>Package contents:</strong> {details.contents || "—"}</p>
                <p><strong>Insurance:</strong> {insuranceRequired ? "Yes" : "No"}</p>
                <p><strong>Signature required:</strong> {signatureRequired ? "Yes" : "No"}</p>
                <div className={`${styles.wideInfo} ${styles.handlingInfo}`}>
                  <strong>Handling:</strong>
                  {activeWarnings.length > 0 ? activeWarnings.map(({ key, label }) => (
                    <span className={styles.handlingTag} key={key}><WarningIcon type={key} />{label}</span>
                  )) : <span>Standard handling</span>}
                </div>
                <p className={styles.wideInfo}><strong>Special instructions:</strong> {details.specialInstructions || "None"}</p>
              </div>
            </section>

            <footer className={styles.trackingFooter}>
              <div className={styles.trackingNumber}>
                <span>TRACKING NUMBER</span>
                <strong>{details.reference || "ENTER TRACKING NUMBER"}</strong>
              </div>
              <div className={styles.barcodeWrap}>
                <TrackingBarcode value={details.reference} />
                <span>{details.reference.trim().toUpperCase() || "BARCODE"}</span>
              </div>
            </footer>
          </article>
        </section>
      </div>
    </main>
  );
}
