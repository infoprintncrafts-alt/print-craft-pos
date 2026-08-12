"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  sale_date: string;
  total: number;
  paid_amount: number;
  payment_status: string;
};

type Payment = {
  id: string;
  customer_id: string;
  sale_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  received_by: string | null;
  created_at: string;
};

type CustomerBalance = {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  total_sales: number;
  total_paid: number;
  outstanding_balance: number;
};

type PaymentForm = {
  customer_id: string;
  sale_id: string;
  amount: string;
  payment_method: string;
  reference_number: string;
  notes: string;
};

const BUSINESS_NAME = "PRINT & CRAFT (PVT) LTD.";

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function money(value: number): string {
  return (
    "LKR " +
    toNumber(value).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id ?? ""),
    customer_code: toStringOrNull(row.customer_code),
    name: String(row.name ?? "Unknown Customer"),
    phone: toStringOrNull(row.phone),
  };
}

function normalizeSale(row: Record<string, unknown>): Sale {
  return {
    id: String(row.id ?? ""),
    invoice_number: String(row.invoice_number ?? ""),
    customer_id: toStringOrNull(row.customer_id),
    sale_date: String(row.sale_date ?? ""),
    total: toNumber(row.total),
    paid_amount: toNumber(row.paid_amount),
    payment_status: String(row.payment_status ?? "unpaid"),
  };
}

function normalizePayment(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id ?? ""),
    customer_id: String(row.customer_id ?? ""),
    sale_id: toStringOrNull(row.sale_id),
    payment_date: String(row.payment_date ?? ""),
    amount: toNumber(row.amount),
    payment_method: String(row.payment_method ?? "cash"),
    reference_number: toStringOrNull(row.reference_number),
    notes: toStringOrNull(row.notes),
    received_by: toStringOrNull(row.received_by),
    created_at: String(row.created_at ?? ""),
  };
}

export default function PaymentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [activeTab, setActiveTab] = useState<
    "record" | "history" | "debts"
  >("record");

  const [form, setForm] = useState<PaymentForm>({
    customer_id: "",
    sale_id: "",
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [customerSales, setCustomerSales] = useState<Sale[]>([]);

  /*
   * =========================================================
   * LOAD DATA
   * =========================================================
   */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!sessionData.session) {
        throw new Error("You are not logged in.");
      }

      /*
       * CUSTOMERS
       */

      const {
        data: customerRows,
        error: customersError,
      } = await supabase
        .from("customers")
        .select("id, customer_code, name, phone")
        .order("name", { ascending: true });

      if (customersError) {
        throw new Error(
          "Unable to load customers: " +
            customersError.message
        );
      }

      const normalizedCustomers = Array.isArray(customerRows)
        ? customerRows.map((row) =>
            normalizeCustomer(
              row as Record<string, unknown>
            )
          )
        : [];

      setCustomers(normalizedCustomers);

      /*
       * SALES
       */

      const {
        data: saleRows,
        error: salesError,
      } = await supabase
        .from("sales")
        .select(
          "id, invoice_number, customer_id, sale_date, total, paid_amount, payment_status"
        )
        .order("sale_date", { ascending: false });

      if (salesError) {
        throw new Error(
          "Unable to load sales: " +
            salesError.message
        );
      }

      const normalizedSales = Array.isArray(saleRows)
        ? saleRows.map((row) =>
            normalizeSale(
              row as Record<string, unknown>
            )
          )
        : [];

      setSales(normalizedSales);

      /*
       * PAYMENTS
       */

      const {
        data: paymentRows,
        error: paymentsError,
      } = await supabase
        .from("customer_payments")
        .select(
          "id, customer_id, sale_id, payment_date, amount, payment_method, reference_number, notes, received_by, created_at"
        )
        .order("payment_date", {
          ascending: false,
        });

      if (paymentsError) {
        throw new Error(
          "Unable to load payments: " +
            paymentsError.message
        );
      }

      const normalizedPayments = Array.isArray(paymentRows)
        ? paymentRows.map((row) =>
            normalizePayment(
              row as Record<string, unknown>
            )
          )
        : [];

      setPayments(normalizedPayments);

    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to load payment data."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /*
   * =========================================================
   * CUSTOMER SEARCH
   * =========================================================
   */

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers.slice(0, 20);
    }

    return customers
      .filter((customer) => {
        return (
          customer.name
            .toLowerCase()
            .includes(query) ||
          (customer.phone ?? "")
            .toLowerCase()
            .includes(query) ||
          (customer.customer_code ?? "")
            .toLowerCase()
            .includes(query)
        );
      })
      .slice(0, 20);
  }, [customers, search]);

  /*
   * =========================================================
   * SELECT CUSTOMER
   * =========================================================
   */

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);

    setForm((current) => ({
      ...current,
      customer_id: customer.id,
      sale_id: "",
      amount: "",
    }));

    setSearch(customer.name);

    const customerSaleList = sales.filter(
      (sale) =>
        sale.customer_id === customer.id &&
        Math.max(
          toNumber(sale.total) -
            toNumber(sale.paid_amount),
          0
        ) > 0
    );

    setCustomerSales(customerSaleList);
  }

  function clearOutstanding(customer: CustomerBalance) {
    const fullCustomer = customers.find(
      (item) => item.id === customer.id
    );

    if (!fullCustomer) {
      return;
    }

    const customerSaleList = sales.filter(
      (sale) =>
        sale.customer_id === fullCustomer.id &&
        Math.max(
          toNumber(sale.total) -
            toNumber(sale.paid_amount),
          0
        ) > 0
    );

    setSelectedCustomer(fullCustomer);
    setSearch(fullCustomer.name);
    setCustomerSales(customerSaleList);
    setForm({
      customer_id: fullCustomer.id,
      sale_id: "",
      amount: Math.max(
        toNumber(customer.outstanding_balance),
        0
      ).toFixed(2),
      payment_method: "cash",
      reference_number: "",
      notes: "Clear outstanding debt",
    });
    setActiveTab("record");
  }

  /*
   * =========================================================
   * SELECT SALE
   * =========================================================
   */

  function selectSale(sale: Sale) {
    const balance = Math.max(
      toNumber(sale.total) -
        toNumber(sale.paid_amount),
      0
    );

    setForm((current) => ({
      ...current,
      sale_id: sale.id,
      amount: balance.toFixed(2),
    }));
  }

  /*
   * =========================================================
   * CUSTOMER CREDIT CALCULATION
   *
   * IMPORTANT:
   *
   * We do NOT need a separate credit table yet.
   *
   * Any amount received above an invoice balance is
   * identified as customer credit.
   *
   * Example:
   *
   * Invoice = 800
   * Customer pays = 1000
   *
   * Invoice receives 800.
   * Customer credit = 200.
   *
   * The credit is stored through the payment record notes
   * and can be identified from payment history.
   * =========================================================
   */

  function calculatePaymentBreakdown() {
    const amount = toNumber(form.amount);

    const sale = sales.find(
      (item) => item.id === form.sale_id
    );

    if (!sale) {
      return {
        paymentAmount: amount,
        invoiceBalance: 0,
        amountAppliedToInvoice: 0,
        creditAmount: amount,
      };
    }

    const invoiceBalance = Math.max(
      toNumber(sale.total) -
        toNumber(sale.paid_amount),
      0
    );

    const amountAppliedToInvoice = Math.min(
      amount,
      invoiceBalance
    );

    const creditAmount = Math.max(
      amount - invoiceBalance,
      0
    );

    return {
      paymentAmount: amount,
      invoiceBalance,
      amountAppliedToInvoice,
      creditAmount,
    };
  }

  /*
   * =========================================================
   * RECORD PAYMENT
   * =========================================================
   */

  async function recordPayment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.customer_id) {
      alert("Please select a customer.");
      return;
    }

    const amount = toNumber(form.amount);

    if (amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!sessionData.session?.user) {
        throw new Error("You are not logged in.");
      }

      const sale = sales.find(
        (item) => item.id === form.sale_id
      );

      let paymentPayloads: Array<{
        customer_id: string;
        sale_id: string | null;
        payment_date: string;
        amount: number;
        payment_method: string;
        reference_number: string | null;
        notes: string | null;
        received_by: string;
      }> = [];

      const sharedPaymentFields = {
        customer_id: form.customer_id,
        payment_date: new Date().toISOString(),
        payment_method:
          form.payment_method || "cash",
        reference_number:
          form.reference_number.trim() ||
          null,
        notes: form.notes.trim() || null,
        received_by:
          sessionData.session.user.id,
      };

      const allocations: Array<{
        sale_id: string;
        amount: number;
      }> = [];

      if (sale) {
        const invoiceBalance = Math.max(
          toNumber(sale.total) -
            toNumber(sale.paid_amount),
          0
        );

        const amountAppliedToInvoice = Math.min(
          amount,
          invoiceBalance
        );

        const creditAmount = Math.max(
          amount - invoiceBalance,
          0
        );

        if (amountAppliedToInvoice > 0) {
          allocations.push({
            sale_id: sale.id,
            amount: amountAppliedToInvoice,
          });
        }

        if (creditAmount > 0) {
          paymentPayloads.push({
            ...sharedPaymentFields,
            sale_id: null,
            amount: creditAmount,
          });
        }
      } else {
        const customerSales = sales
          .filter(
            (item) =>
              item.customer_id === form.customer_id
          )
          .map((item) => ({
            ...item,
            balance: Math.max(
              toNumber(item.total) -
                toNumber(item.paid_amount),
              0
            ),
          }))
          .filter((item) => item.balance > 0)
          .sort((a, b) =>
            new Date(a.sale_date).getTime() -
            new Date(b.sale_date).getTime()
          );

        let remainingAmount = amount;

        for (const invoice of customerSales) {
          if (remainingAmount <= 0) {
            break;
          }

          const allocate = Math.min(
            remainingAmount,
            invoice.balance
          );

          if (allocate > 0) {
            allocations.push({
              sale_id: invoice.id,
              amount: allocate,
            });
            remainingAmount -= allocate;
          }
        }

        if (remainingAmount > 0) {
          paymentPayloads.push({
            ...sharedPaymentFields,
            sale_id: null,
            amount: remainingAmount,
          });
        }
      }

      if (allocations.length > 0) {
        for (const allocation of allocations) {
          paymentPayloads.push({
            ...sharedPaymentFields,
            sale_id: allocation.sale_id,
            amount: allocation.amount,
          });
        }
      }

      if (paymentPayloads.length === 0) {
        paymentPayloads.push({
          ...sharedPaymentFields,
          sale_id: null,
          amount,
        });
      }

      // payment_number is required by the payment ledger. Generate one per
      // allocation because a single customer payment can be split across
      // multiple invoices.
      paymentPayloads = paymentPayloads.map((payload, index) => ({
        ...payload,
        payment_number: `PAY-${Date.now()}-${index}-${crypto.randomUUID().slice(0, 6)}`,
      })) as typeof paymentPayloads;

      const {
        error: insertError,
      } = await supabase
        .from("customer_payments")
        .insert(paymentPayloads);

      if (insertError) {
        throw new Error(
          "Unable to record payment: " +
            insertError.message
        );
      }

      const updateSalePromises = allocations.map(
        async (allocation) => {
          const saleToUpdate = sales.find(
            (item) => item.id === allocation.sale_id
          );

          if (!saleToUpdate) {
            return;
          }

          const currentPaid =
            toNumber(saleToUpdate.paid_amount);
          const saleTotal =
            toNumber(saleToUpdate.total);

          const newPaidAmount = Math.min(
            currentPaid + allocation.amount,
            saleTotal
          );

          const newBalance = Math.max(
            saleTotal - newPaidAmount,
            0
          );

          let paymentStatus =
            "unpaid";

          if (newBalance <= 0) {
            paymentStatus = "paid";
          } else if (
            newPaidAmount > 0
          ) {
            paymentStatus = "partial";
          }

          const {
            error: updateSaleError,
          } = await supabase
            .from("sales")
            .update({
              paid_amount:
                newPaidAmount,
              payment_status:
                paymentStatus,
            })
            .eq("id", allocation.sale_id);

          if (updateSaleError) {
            throw new Error(
              "Payment was recorded, but an invoice could not be updated: " +
                updateSaleError.message
            );
          }
        }
      );

      await Promise.all(updateSalePromises);

      /*
       * =====================================================
       * SUCCESS MESSAGE
       * =====================================================
       */

      const totalAllocated = allocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0
      );

      const totalCredit = paymentPayloads
        .filter((payment) => payment.sale_id === null)
        .reduce((sum, payment) => sum + payment.amount, 0);

      if (totalCredit > 0) {
        alert(
          `Payment recorded successfully.\n\n` +
            `Payment received: ${money(amount)}\n` +
            `Invoice applied: ${money(totalAllocated)}\n` +
            `Customer credit: ${money(totalCredit)}`
        );
      } else {
        alert(
          "Payment recorded successfully."
        );
      }

      /*
       * RESET FORM
       */

      setForm({
        customer_id: "",
        sale_id: "",
        amount: "",
        payment_method: "cash",
        reference_number: "",
        notes: "",
      });

      setSelectedCustomer(null);
      setCustomerSales([]);
      setSearch("");

      await loadData();

      setActiveTab("history");
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to record payment."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * CUSTOMER NAME
   * =========================================================
   */

  function getCustomerName(
    customerId: string | null
  ): string {
    if (!customerId) {
      return "Unknown Customer";
    }

    const customer = customers.find(
      (item) => item.id === customerId
    );

    return (
      customer?.name ||
      "Unknown Customer"
    );
  }

  /*
   * =========================================================
   * INVOICE NUMBER
   * =========================================================
   */

  function getInvoiceNumber(
    saleId: string | null
  ): string {
    if (!saleId) {
      return "-";
    }

    const sale = sales.find(
      (item) => item.id === saleId
    );

    return (
      sale?.invoice_number || "-"
    );
  }

  /*
   * =========================================================
   * TOTALS
   * =========================================================
   */

  // Invoice paid_amount is the financial source of truth. It includes both
  // payments collected while creating the sale and later ledger payments.
  const totalPayments = useMemo(
    () => sales.reduce((sum, sale) => sum + Math.min(toNumber(sale.total), toNumber(sale.paid_amount)), 0),
    [sales]
  );

  const outstandingSales = useMemo(
    () =>
      sales
        .map((sale) => ({
          ...sale,
          balance: Math.max(
            toNumber(sale.total) -
              toNumber(sale.paid_amount),
            0
          ),
        }))
        .filter((sale) => sale.balance > 0),
    [sales]
  );

  const totalOutstanding = useMemo(
    () =>
      outstandingSales.reduce(
        (sum, sale) => sum + sale.balance,
        0
      ),
    [outstandingSales]
  );

  const calculatedBalances = useMemo<CustomerBalance[]>(
    () => {
      const grouped = new Map<string, { totalSales: number; totalPaid: number }>();
      sales.forEach((sale) => {
        const key = sale.customer_id || "__unassigned__";
        const current = grouped.get(key) || { totalSales: 0, totalPaid: 0 };
        current.totalSales += toNumber(sale.total);
        current.totalPaid += Math.min(toNumber(sale.total), toNumber(sale.paid_amount));
        grouped.set(key, current);
      });
      return Array.from(grouped.entries()).map(([id, values]) => {
        const customer = customers.find((item) => item.id === id);
        return { id, customer_code: customer?.customer_code ?? null, name: customer?.name ?? "Unassigned / walk-in sales", phone: customer?.phone ?? null, total_sales: values.totalSales, total_paid: values.totalPaid, outstanding_balance: Math.max(values.totalSales - values.totalPaid, 0) };
      }).filter((customer) => customer.outstanding_balance > 0);
    },
    [customers, sales]
  );

  const customersWithDebt = calculatedBalances.length;

  const totalCustomerSales = useMemo(
    () =>
      sales.reduce(
        (sum, sale) => sum + toNumber(sale.total),
        0
      ),
    [sales]
  );

  /*
   * =========================================================
   * PAYMENT HISTORY FILTER
   * =========================================================
   */

  const filteredPayments = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return payments;
    }

    return payments.filter(
      (payment) => {
        const customerName =
          getCustomerName(
            payment.customer_id
          ).toLowerCase();

        const invoice =
          getInvoiceNumber(
            payment.sale_id
          ).toLowerCase();

        const method =
          payment.payment_method.toLowerCase();

        const reference =
          (
            payment.reference_number ??
            ""
          ).toLowerCase();

        const notes =
          (
            payment.notes ?? ""
          ).toLowerCase();

        return (
          customerName.includes(
            query
          ) ||
          invoice.includes(query) ||
          method.includes(query) ||
          reference.includes(query) ||
          notes.includes(query)
        );
      }
    );
  }, [
    payments,
    search,
    customers,
    sales,
  ]);

  /*
   * =========================================================
   * DEBT FILTER
   * =========================================================
   */

  const filteredBalances = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return calculatedBalances;
    }

    return calculatedBalances.filter(
      (item) => {
        return (
          item.name
            .toLowerCase()
            .includes(query) ||
          (item.phone ?? "")
            .toLowerCase()
            .includes(query) ||
          (item.customer_code ?? "")
            .toLowerCase()
            .includes(query)
        );
      }
    );
  }, [calculatedBalances, search]);

  /*
   * =========================================================
   * WHATSAPP REMINDER
   * =========================================================
   */

  function sendReminder(
    customer: CustomerBalance
  ) {
    if (!customer.phone) {
      alert(
        "This customer does not have a phone number."
      );
      return;
    }

    let number =
      customer.phone.replace(
        /[^0-9]/g,
        ""
      );

    if (number.startsWith("0")) {
      number =
        "94" +
        number.substring(1);
    }

    if (
      !number.startsWith("94") &&
      number.length === 9
    ) {
      number = "94" + number;
    }

    const message =
      "Hello " +
      customer.name +
      ",\n\n" +
      "This is a friendly payment reminder from " +
      BUSINESS_NAME +
      ".\n\n" +
      "Your current outstanding balance is " +
      money(
        customer.outstanding_balance
      ) +
      ".\n\n" +
      "Kindly settle the outstanding amount at your convenience.\n\n" +
      "Thank you.";

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

  /*
   * =========================================================
   * PAYMENT PREVIEW
   * =========================================================
   */

  const paymentBreakdown =
    calculatePaymentBreakdown();

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-5xl">
              💳
            </div>

            <h1 className="mt-3 text-xl font-bold text-slate-900">
              Loading Payments
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Please wait...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Payments & Debts
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Record customer payments,
                manage debts and track
                payment history.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong>{" "}
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Total Sales
              </span>

              <span className="rounded-xl bg-blue-50 p-2 text-xl">
                🧾
              </span>
            </div>

            <p className="mt-3 text-2xl font-black text-slate-900">
              {money(totalCustomerSales)}
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Total Payments
              </span>

              <span className="rounded-xl bg-green-50 p-2 text-xl">
                💰
              </span>
            </div>

            <p className="mt-3 text-2xl font-black text-green-700">
              {money(totalPayments)}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Outstanding Debt
              </span>

              <span className="rounded-xl bg-orange-50 p-2 text-xl">
                ⚠️
              </span>
            </div>

            <p className="mt-3 text-2xl font-black text-orange-600">
              {money(totalOutstanding)}
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Customers With Debt
              </span>

              <span className="rounded-xl bg-purple-50 p-2 text-xl">
                👥
              </span>
            </div>

            <p className="mt-3 text-2xl font-black text-purple-700">
              {customersWithDebt}
            </p>
          </div>
        </section>

        {/* TABS */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-200">
            <button
              type="button"
              onClick={() =>
                setActiveTab("record")
              }
              className={
                "whitespace-nowrap px-5 py-4 text-sm font-bold " +
                (activeTab === "record"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-800")
              }
            >
              💳 Record Payment
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("history")
              }
              className={
                "whitespace-nowrap px-5 py-4 text-sm font-bold " +
                (activeTab === "history"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-800")
              }
            >
              📋 Payment History
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("debts")
              }
              className={
                "whitespace-nowrap px-5 py-4 text-sm font-bold " +
                (activeTab === "debts"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-800")
              }
            >
              ⚠️ Customer Debts
            </button>
          </div>

          {/* =================================================
              RECORD PAYMENT
          ================================================= */}

          {activeTab === "record" && (
            <form
              onSubmit={recordPayment}
              className="p-5 sm:p-6"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* CUSTOMER */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Customer
                  </label>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      setSearch(value);

                      if (
                        selectedCustomer &&
                        value !==
                          selectedCustomer.name
                      ) {
                        setSelectedCustomer(
                          null
                        );

                        setForm(
                          (current) => ({
                            ...current,
                            customer_id:
                              "",
                            sale_id: "",
                            amount: "",
                          })
                        );

                        setCustomerSales(
                          []
                        );
                      }
                    }}
                    placeholder="Search customer name, phone or code..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {!selectedCustomer &&
                    search.trim() && (
                      <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {filteredCustomers.length ===
                        0 ? (
                          <div className="p-4 text-sm text-slate-500">
                            No customers
                            found.
                          </div>
                        ) : (
                          filteredCustomers.map(
                            (customer) => (
                              <button
                                key={
                                  customer.id
                                }
                                type="button"
                                onClick={() =>
                                  selectCustomer(
                                    customer
                                  )
                                }
                                className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                              >
                                <div className="font-bold text-slate-900">
                                  {
                                    customer.name
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  {customer.phone ||
                                    "No phone number"}

                                  {customer.customer_code
                                    ? ` • ${customer.customer_code}`
                                    : ""}
                                </div>
                              </button>
                            )
                          )
                        )}
                      </div>
                    )}

                  {selectedCustomer && (
                    <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-green-900">
                            {
                              selectedCustomer.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-green-700">
                            {selectedCustomer.phone ||
                              "No phone number"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(
                              null
                            );
                            setCustomerSales(
                              []
                            );
                            setSearch("");

                            setForm(
                              (current) => ({
                                ...current,
                                customer_id:
                                  "",
                                sale_id:
                                  "",
                                amount:
                                  "",
                              })
                            );
                          }}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-100"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SALE */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Invoice / Sale
                  </label>

                  <select
                    value={form.sale_id}
                    onChange={(event) => {
                      const selected =
                        customerSales.find(
                          (sale) =>
                            sale.id ===
                            event.target
                              .value
                        );

                      if (selected) {
                        selectSale(
                          selected
                        );
                      } else {
                        setForm(
                          (current) => ({
                            ...current,
                            sale_id:
                              "",
                            amount:
                              "",
                          })
                        );
                      }
                    }}
                    disabled={
                      !selectedCustomer
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {selectedCustomer
                        ? "Select invoice"
                        : "Select customer first"}
                    </option>

                    {customerSales.map(
                      (sale) => {
                        const balance =
                          Math.max(
                            toNumber(
                              sale.total
                            ) -
                              toNumber(
                                sale.paid_amount
                              ),
                            0
                          );

                        return (
                          <option
                            key={sale.id}
                            value={sale.id}
                          >
                            {
                              sale.invoice_number
                            }{" "}
                            — Balance{" "}
                            {money(
                              balance
                            )}
                          </option>
                        );
                      }
                    )}
                  </select>

                  {selectedCustomer &&
                    customerSales.length ===
                      0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        This customer
                        has no unpaid
                        invoices.
                      </p>
                    )}
                </div>

                {/* AMOUNT */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Payment Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          amount:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {form.sale_id &&
                    paymentBreakdown.creditAmount >
                      0 && (
                      <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
                        <p className="text-sm font-bold text-purple-900">
                          💰 Customer
                          Credit
                        </p>

                        <p className="mt-1 text-sm text-purple-700">
                          This payment is
                          greater than the
                          invoice balance.
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-purple-500">
                              Invoice
                            </p>

                            <p className="font-bold text-purple-900">
                              {money(
                                paymentBreakdown.amountAppliedToInvoice
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-purple-500">
                              Credit
                            </p>

                            <p className="font-black text-purple-700">
                              {money(
                                paymentBreakdown.creditAmount
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* METHOD */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Payment Method
                  </label>

                  <select
                    value={
                      form.payment_method
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          payment_method:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="cash">
                      Cash
                    </option>

                    <option value="bank">
                      Bank Transfer
                    </option>

                    <option value="card">
                      Card
                    </option>

                    <option value="online">
                      Online Payment
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>

                {/* REFERENCE */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Reference Number
                    <span className="ml-1 font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>

                  <input
                    type="text"
                    value={
                      form.reference_number
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          reference_number:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Receipt / transfer reference"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* NOTES */}

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Notes
                    <span className="ml-1 font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>

                  <input
                    type="text"
                    value={form.notes}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          notes:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Payment notes"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* PREVIEW */}

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Customer
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {selectedCustomer?.name ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Invoice
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {getInvoiceNumber(
                        form.sale_id
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Payment
                    </p>

                    <p className="mt-1 text-xl font-black text-green-700">
                      {money(
                        toNumber(
                          form.amount
                        )
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Credit
                    </p>

                    <p className="mt-1 text-xl font-black text-purple-700">
                      {money(
                        paymentBreakdown.creditAmount
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* BUTTONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      customer_id:
                        "",
                      sale_id: "",
                      amount: "",
                      payment_method:
                        "cash",
                      reference_number:
                        "",
                      notes: "",
                    });

                    setSelectedCustomer(
                      null
                    );

                    setCustomerSales(
                      []
                    );

                    setSearch("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.customer_id ||
                    toNumber(
                      form.amount
                    ) <= 0
                  }
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving Payment..."
                    : "💳 Record Payment"}
                </button>
              </div>
            </form>
          )}

          {/* =================================================
              PAYMENT HISTORY
          ================================================= */}

          {activeTab === "history" && (
            <div className="p-5 sm:p-6">
              <div className="mb-5">
                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search customer, invoice, method, reference or notes..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {filteredPayments.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                  <div className="text-4xl">
                    💳
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-900">
                    No payments found
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Payment records will
                    appear here.
                  </p>
                </div>
              ) : (
                <>
                  {/* DESKTOP */}

                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                    <table className="w-full min-w-[1000px] text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                            Date
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                            Customer
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                            Invoice
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                            Method
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                            Reference
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                            Notes
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredPayments.map(
                          (payment) => (
                            <tr
                              key={
                                payment.id
                              }
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {formatDate(
                                  payment.payment_date
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <p className="font-bold text-slate-900">
                                  {getCustomerName(
                                    payment.customer_id
                                  )}
                                </p>
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                                {payment.sale_id ? (
                                  <Link
                                    href={`/sales/${payment.sale_id}`}
                                    className="hover:underline"
                                  >
                                    {getInvoiceNumber(
                                      payment.sale_id
                                    )}
                                  </Link>
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
                                  {
                                    payment.payment_method
                                  }
                                </span>
                              </td>

                              <td className="px-4 py-4 text-sm text-slate-500">
                                {payment.reference_number ||
                                  "-"}
                              </td>

                              <td className="max-w-[300px] px-4 py-4 text-sm text-slate-500">
                                {payment.notes ||
                                  "-"}
                              </td>

                              <td className="px-4 py-4 text-right font-black text-green-700">
                                {money(
                                  payment.amount
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE */}

                  <div className="space-y-3 md:hidden">
                    {filteredPayments.map(
                      (payment) => (
                        <div
                          key={
                            payment.id
                          }
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900">
                                {getCustomerName(
                                  payment.customer_id
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(
                                  payment.payment_date
                                )}
                              </p>
                            </div>

                            <p className="font-black text-green-700">
                              {money(
                                payment.amount
                              )}
                            </p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-slate-400">
                                Invoice
                              </p>

                              {payment.sale_id ? (
                                <Link
                                  href={`/sales/${payment.sale_id}`}
                                  className="mt-1 block font-semibold text-blue-600 hover:underline"
                                >
                                  {getInvoiceNumber(
                                    payment.sale_id
                                  )}
                                </Link>
                              ) : (
                                <p className="mt-1 font-semibold text-slate-400">
                                  -
                                </p>
                              )}
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Method
                              </p>

                              <p className="mt-1 font-semibold capitalize text-slate-700">
                                {
                                  payment.payment_method
                                }
                              </p>
                            </div>
                          </div>

                          {payment.reference_number && (
                            <p className="mt-3 text-xs text-slate-500">
                              Reference:{" "}
                              {
                                payment.reference_number
                              }
                            </p>
                          )}

                          {payment.notes && (
                            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                              <strong>
                                Notes:
                              </strong>{" "}
                              {
                                payment.notes
                              }
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* =================================================
              CUSTOMER DEBTS
          ================================================= */}

          {activeTab === "debts" && (
            <div className="p-5 sm:p-6">
              <div className="mb-5">
                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search debtor by name, phone or customer code..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {filteredBalances.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-10 text-center">
                  <div className="text-4xl">
                    🎉
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-green-900">
                    No outstanding debts
                  </h3>

                  <p className="mt-1 text-sm text-green-700">
                    All customer balances
                    are clear.
                  </p>
                </div>
              ) : (
                <>
                  {/* DESKTOP */}

                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                            Customer
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                            Phone
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                            Total Sales
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                            Paid
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                            Outstanding
                          </th>

                          <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredBalances.map(
                          (customer) => (
                            <tr
                              key={
                                customer.id
                              }
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-4">
                                <p className="font-bold text-slate-900">
                                  {
                                    customer.name
                                  }
                                </p>

                                {customer.customer_code && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {
                                      customer.customer_code
                                    }
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-4 text-sm text-slate-600">
                                {customer.phone ||
                                  "-"}
                              </td>

                              <td className="px-4 py-4 text-right text-sm text-slate-700">
                                {money(
                                  customer.total_sales
                                )}
                              </td>

                              <td className="px-4 py-4 text-right text-sm font-semibold text-green-700">
                                {money(
                                  customer.total_paid
                                )}
                              </td>

                              <td className="px-4 py-4 text-right text-sm font-black text-red-600">
                                {money(
                                  customer.outstanding_balance
                                )}
                              </td>

                              <td className="px-4 py-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      sendReminder(
                                        customer
                                      )
                                    }
                                    disabled={
                                      !customer.phone
                                    }
                                    className="rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    WhatsApp
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fullCustomer =
                                        customers.find(
                                          (
                                            item
                                          ) =>
                                            item.id ===
                                            customer.id
                                        );

                                      if (
                                        fullCustomer
                                      ) {
                                        selectCustomer(
                                          fullCustomer
                                        );

                                        setActiveTab(
                                          "record"
                                        );
                                      }
                                    }}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                                  >
                                    Payment
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      clearOutstanding(
                                        customer
                                      )
                                    }
                                    className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE */}

                  <div className="space-y-3 md:hidden">
                    {filteredBalances.map(
                      (customer) => (
                        <div
                          key={
                            customer.id
                          }
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900">
                                {
                                  customer.name
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {customer.phone ||
                                  "No phone number"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-slate-400">
                                Outstanding
                              </p>

                              <p className="mt-1 font-black text-red-600">
                                {money(
                                  customer.outstanding_balance
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                            <div>
                              <p className="text-xs text-slate-400">
                                Total Sales
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-700">
                                {money(
                                  customer.total_sales
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Paid
                              </p>

                              <p className="mt-1 text-sm font-bold text-green-700">
                                {money(
                                  customer.total_paid
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                sendReminder(
                                  customer
                                )
                              }
                              disabled={
                                !customer.phone
                              }
                              className="rounded-lg bg-[#25D366] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                            >
                              WhatsApp
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const fullCustomer =
                                  customers.find(
                                    (item) =>
                                      item.id ===
                                      customer.id
                                  );

                                if (
                                  fullCustomer
                                ) {
                                  selectCustomer(
                                    fullCustomer
                                  );

                                  setActiveTab(
                                    "record"
                                  );
                                }
                              }}
                              className="rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white"
                            >
                              Record Payment
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
