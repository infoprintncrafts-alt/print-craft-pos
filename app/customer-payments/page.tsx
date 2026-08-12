"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  whatsapp: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  total: number;
  paid_amount: number;
  payment_status: string;
};

export default function CustomerPaymentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // Selected invoice
  const [selectedSaleId, setSelectedSaleId] = useState("");

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // LOAD CUSTOMERS
  // =====================================================

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You are not logged in.");
      }

      const { data, error } = await supabase
        .from("customers")
        .select(
          `
            id,
            customer_code,
            name,
            phone,
            whatsapp
          `
        )
        .eq("is_active", true)
        .order("name");

      if (error) {
        throw new Error(
          `Unable to load customers: ${error.message}`
        );
      }

      setCustomers(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // CUSTOMER SEARCH
  // =====================================================

  const filteredCustomers = customers.filter((customer) => {
    const search = customerSearch.toLowerCase().trim();

    if (!search) {
      return true;
    }

    return (
      customer.name.toLowerCase().includes(search) ||
      (customer.phone || "")
        .toLowerCase()
        .includes(search) ||
      (customer.whatsapp || "")
        .toLowerCase()
        .includes(search) ||
      (customer.customer_code || "")
        .toLowerCase()
        .includes(search)
    );
  });

  // =====================================================
  // SELECT CUSTOMER
  // =====================================================

  async function selectCustomer(customer: Customer) {
    setCustomerId(customer.id);
    setCustomerSearch(customer.name);

    setSelectedSaleId("");
    setAmount("");
    setNotes("");

    setMessage("");
    setError("");

    await loadCustomerSales(customer.id);
  }

  // =====================================================
  // LOAD CUSTOMER SALES
  // =====================================================

  async function loadCustomerSales(id: string) {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(
          `
            id,
            invoice_number,
            sale_date,
            total,
            paid_amount,
            payment_status
          `
        )
        .eq("customer_id", id)
        .order("sale_date", {
          ascending: false,
        });

      if (error) {
        throw new Error(
          `Unable to load customer sales: ${error.message}`
        );
      }

      setSales(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customer sales."
      );
    }
  }

  // =====================================================
  // MONEY
  // =====================================================

  function money(value: number) {
    return `LKR ${Number(value || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // =====================================================
  // OUTSTANDING SALES
  // =====================================================

  const outstandingSales = sales.filter((sale) => {
    const balance =
      Number(sale.total || 0) -
      Number(sale.paid_amount || 0);

    return balance > 0;
  });

  // =====================================================
  // TOTAL CUSTOMER DEBT
  // =====================================================

  const totalDebt = outstandingSales.reduce(
    (sum, sale) => {
      const balance =
        Number(sale.total || 0) -
        Number(sale.paid_amount || 0);

      return sum + Math.max(balance, 0);
    },
    0
  );

  // =====================================================
  // SELECTED INVOICE
  // =====================================================

  const selectedSale =
    sales.find(
      (sale) => sale.id === selectedSaleId
    ) || null;

  const selectedBalance = selectedSale
    ? Math.max(
        Number(selectedSale.total || 0) -
          Number(selectedSale.paid_amount || 0),
        0
      )
    : 0;

  // =====================================================
  // SELECT INVOICE
  // =====================================================

  function selectInvoice(sale: Sale) {
    setSelectedSaleId(sale.id);
    setAmount("");
    setMessage("");
    setError("");
  }

  // =====================================================
  // SAVE PAYMENT
  // =====================================================

  async function savePayment() {
    setMessage("");
    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (!selectedSale) {
      setError("Please select an invoice.");
      return;
    }

    if (selectedBalance <= 0) {
      setError(
        "This invoice has no outstanding balance."
      );
      return;
    }

    const paymentAmount =
      Number(amount) || 0;

    if (paymentAmount <= 0) {
      setError(
        "Please enter a valid payment amount."
      );
      return;
    }

    if (paymentAmount > selectedBalance) {
      setError(
        `Payment cannot be greater than the selected invoice balance of ${money(
          selectedBalance
        )}.`
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Your login session has expired."
        );
      }

      // =================================================
      // CALL DATABASE FUNCTION
      // =================================================

      const { data, error: paymentError } =
        await supabase.rpc(
          "record_customer_payment",
          {
            p_customer_id: customerId,
            p_sale_id: selectedSale.id,
            p_amount: paymentAmount,
            p_payment_method:
              paymentMethod,
            p_reference_number: null,
            p_notes:
              notes.trim() || null,
          }
        );

      if (paymentError) {
        throw new Error(
          `Unable to record payment: ${paymentError.message}`
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      const newBalance = Math.max(
        selectedBalance - paymentAmount,
        0
      );

      setMessage(
        `Payment of ${money(
          paymentAmount
        )} recorded for ${selectedSale.invoice_number}. Remaining balance: ${money(
          newBalance
        )}.`
      );

      setAmount("");
      setNotes("");

      // Reload invoices
      await loadCustomerSales(customerId);

      // If invoice is fully paid, remove selection
      if (newBalance <= 0) {
        setSelectedSaleId("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save payment."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // CLEAR
  // =====================================================

  function clearPayment() {
    setCustomerId("");
    setCustomerSearch("");
    setSales([]);

    setSelectedSaleId("");

    setAmount("");
    setPaymentMethod("cash");
    setNotes("");

    setMessage("");
    setError("");
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">

        <div className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">

          <div>

            <div className="flex items-center gap-2 text-xs text-slate-400">

              <Link
                href="/"
                className="hover:text-blue-600"
              >
                Dashboard
              </Link>

              <span>›</span>

              <span className="text-slate-500">
                Customer Payments
              </span>

            </div>

            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Customer Payments
            </h1>

          </div>

          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Dashboard
          </Link>

        </div>

      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">

        {/* MESSAGE */}

        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            ✓ {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (

          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <p className="text-sm text-slate-500">
              Loading customers...
            </p>

          </div>

        ) : (

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">

            {/* LEFT */}

            <div className="space-y-5">

              {/* CUSTOMER */}

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 px-5 py-4">

                  <h2 className="text-sm font-bold text-slate-900">
                    Select Customer
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Search by name, phone or customer code
                  </p>

                </div>

                <div className="p-5">

                  <div className="relative">

                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {

                        setCustomerSearch(
                          e.target.value
                        );

                        setCustomerId("");
                        setSelectedSaleId("");
                        setSales([]);
                        setAmount("");

                      }}
                      placeholder="Search customer..."
                      className="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    {customerSearch &&
                      !customerId && (

                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">

                          {filteredCustomers.length ===
                          0 ? (

                            <div className="p-5 text-center text-sm text-slate-400">
                              No customers found
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
                                  className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left hover:bg-blue-50"
                                >

                                  <div>

                                    <p className="text-sm font-bold text-slate-800">
                                      {
                                        customer.name
                                      }
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">

                                      {customer.customer_code ||
                                        "No code"}

                                      {customer.phone
                                        ? ` • ${customer.phone}`
                                        : ""}

                                    </p>

                                  </div>

                                </button>

                              )
                            )

                          )}

                        </div>

                      )}

                  </div>

                </div>

              </section>

              {/* INVOICES */}

              {customerId && (

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-100 px-5 py-4">

                    <div className="flex items-center justify-between gap-3">

                      <div>

                        <h2 className="text-sm font-bold text-slate-900">
                          Outstanding Invoices
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                          Click an invoice to select it
                        </p>

                      </div>

                      <div className="rounded-lg bg-orange-50 px-3 py-2">

                        <p className="text-[10px] font-bold uppercase tracking-wide text-orange-500">
                          Total Debt
                        </p>

                        <p className="text-sm font-black text-orange-700">
                          {money(totalDebt)}
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="overflow-x-auto">

                    <table className="w-full">

                      <thead>

                        <tr className="bg-slate-50 text-left">

                          <th className="w-[55px] px-5 py-3 text-xs font-bold text-slate-400">
                            Select
                          </th>

                          <th className="px-3 py-3 text-xs font-bold text-slate-400">
                            Invoice
                          </th>

                          <th className="px-3 py-3 text-xs font-bold text-slate-400">
                            Date
                          </th>

                          <th className="px-3 py-3 text-right text-xs font-bold text-slate-400">
                            Total
                          </th>

                          <th className="px-3 py-3 text-right text-xs font-bold text-slate-400">
                            Paid
                          </th>

                          <th className="px-5 py-3 text-right text-xs font-bold text-slate-400">
                            Balance
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {outstandingSales.map(
                          (sale) => {

                            const balance =
                              Number(
                                sale.total
                              ) -
                              Number(
                                sale.paid_amount
                              );

                            const selected =
                              selectedSaleId ===
                              sale.id;

                            return (

                              <tr
                                key={
                                  sale.id
                                }
                                onClick={() =>
                                  selectInvoice(
                                    sale
                                  )
                                }
                                className={`cursor-pointer border-t border-slate-100 transition ${
                                  selected
                                    ? "bg-blue-50"
                                    : "hover:bg-slate-50"
                                }`}
                              >

                                {/* RADIO */}

                                <td className="px-5 py-4">

                                  <input
                                    type="radio"
                                    name="selectedInvoice"
                                    checked={
                                      selected
                                    }
                                    onChange={() =>
                                      selectInvoice(
                                        sale
                                      )
                                    }
                                    className="h-4 w-4 accent-blue-600"
                                  />

                                </td>

                                {/* INVOICE */}

                                <td className="px-3 py-4">

                                  <span
                                    className={`text-sm font-bold ${
                                      selected
                                        ? "text-blue-700"
                                        : "text-blue-600"
                                    }`}
                                  >
                                    {
                                      sale.invoice_number
                                    }
                                  </span>

                                  {selected && (
                                    <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                                      Selected
                                    </span>
                                  )}

                                </td>

                                {/* DATE */}

                                <td className="px-3 py-4 text-xs text-slate-500">

                                  {new Date(
                                    sale.sale_date
                                  ).toLocaleDateString(
                                    "en-GB"
                                  )}

                                </td>

                                {/* TOTAL */}

                                <td className="px-3 py-4 text-right text-sm text-slate-700">

                                  {money(
                                    Number(
                                      sale.total
                                    )
                                  )}

                                </td>

                                {/* PAID */}

                                <td className="px-3 py-4 text-right text-sm text-green-600">

                                  {money(
                                    Number(
                                      sale.paid_amount
                                    )
                                  )}

                                </td>

                                {/* BALANCE */}

                                <td className="px-5 py-4 text-right text-sm font-bold text-orange-600">

                                  {money(
                                    balance
                                  )}

                                </td>

                              </tr>

                            );
                          }
                        )}

                      </tbody>

                    </table>

                    {outstandingSales.length ===
                      0 && (

                      <div className="p-8 text-center">

                        <p className="text-sm font-semibold text-green-600">
                          ✓ No outstanding invoices
                        </p>

                      </div>

                    )}

                  </div>

                </section>

              )}

            </div>

            {/* RIGHT */}

            <aside className="lg:sticky lg:top-24">

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                <h2 className="text-sm font-bold text-slate-900">
                  Record Payment
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Record money received against one invoice
                </p>

                {/* SELECTED INVOICE */}

                <div className="mt-5">

                  {selectedSale ? (

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

                      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
                        Selected Invoice
                      </p>

                      <p className="mt-1 text-sm font-black text-blue-800">
                        {
                          selectedSale.invoice_number
                        }
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-blue-100 pt-3">

                        <span className="text-xs text-blue-600">
                          Outstanding
                        </span>

                        <span className="text-lg font-black text-blue-800">
                          {money(
                            selectedBalance
                          )}
                        </span>

                      </div>

                    </div>

                  ) : (

                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">

                      <p className="text-sm font-semibold text-slate-500">
                        Select an invoice
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Choose an invoice from the list
                        before entering payment.
                      </p>

                    </div>

                  )}

                </div>

                {/* AMOUNT */}

                <div className="mt-5">

                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Payment Amount
                  </label>

                  <div className="relative mt-2">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      LKR
                    </span>

                    <input
                      type="number"
                      min="0"
                      max={
                        selectedBalance ||
                        undefined
                      }
                      value={amount}
                      disabled={
                        !selectedSale ||
                        saving
                      }
                      onChange={(e) =>
                        setAmount(
                          e.target.value
                        )
                      }
                      placeholder="0.00"
                      className="h-12 w-full rounded-lg border border-slate-200 pl-12 pr-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                    />

                  </div>

                  {selectedSale && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Maximum payment:{" "}
                      {money(
                        selectedBalance
                      )}
                    </p>
                  )}

                </div>

                {/* QUICK AMOUNT */}

                {selectedSale && (

                  <div className="mt-3 flex gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setAmount(
                          String(
                            selectedBalance
                          )
                        )
                      }
                      disabled={saving}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Full Balance
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAmount(
                          String(
                            Math.round(
                              selectedBalance /
                                2
                            )
                          )
                        )
                      }
                      disabled={saving}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      50%
                    </button>

                  </div>

                )}

                {/* PAYMENT METHOD */}

                <div className="mt-4">

                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Payment Method
                  </label>

                  <select
                    value={
                      paymentMethod
                    }
                    disabled={saving}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value
                      )
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50"
                  >

                    <option value="cash">
                      Cash
                    </option>

                    <option value="bank_transfer">
                      Bank Transfer
                    </option>

                    <option value="card">
                      Card
                    </option>

                    <option value="other">
                      Other
                    </option>

                  </select>

                </div>

                {/* NOTES */}

                <div className="mt-4">

                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Note
                  </label>

                  <textarea
                    value={notes}
                    disabled={
                      !selectedSale ||
                      saving
                    }
                    onChange={(e) =>
                      setNotes(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Optional payment note..."
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50"
                  />

                </div>

                {/* SAVE */}

                <button
                  type="button"
                  onClick={
                    savePayment
                  }
                  disabled={
                    saving ||
                    !customerId ||
                    !selectedSale ||
                    selectedBalance <= 0
                  }
                  className="mt-5 w-full rounded-lg bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {saving
                    ? "Recording Payment..."
                    : "Record Payment"}

                </button>

                {/* CLEAR */}

                <button
                  type="button"
                  onClick={
                    clearPayment
                  }
                  disabled={saving}
                  className="mt-2 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Clear
                </button>

              </section>

            </aside>

          </div>

        )}

      </main>

    </div>
  );
}