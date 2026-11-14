import InvoiceTemplate, {
  DEFAULT_INVOICE_BUSINESS,
  type InvoiceTemplateItem,
} from "@/app/components/InvoiceTemplate";

const sampleItems: InvoiceTemplateItem[] = [
  { id: 1, description: "A4 Colour Printing", unitPrice: 2000, discount: 200 },
  { id: 2, description: "Business Cards", unitPrice: 1500, discount: 0 },
];

export default function InvoicePage() {
  return (
    <InvoiceTemplate
      invoiceNumber="PC-2026-0001"
      business={DEFAULT_INVOICE_BUSINESS}
      customer={{
        name: "Mohamed Customer",
        address: "Kinniya, Sri Lanka",
        phone: "0771234567",
      }}
      items={sampleItems}
      initialPaid={2000}
      paymentMethod="Cash"
    />
  );
}
