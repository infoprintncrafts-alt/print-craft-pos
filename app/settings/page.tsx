"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Setting = {
  id: string;
  key: string;
  value: string;
};

type InvoiceBankSettings = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  paymentNote: string;
};

const DEFAULT_INVOICE_BANK_SETTINGS: InvoiceBankSettings = {
  bankName: "HNB",
  accountName: "MJM HASSAN",
  accountNumber: "16 90 20 157 157",
  branch: "Kinniya",
  paymentNote: "Please mention your invoice number as the bank transfer reference and send payment confirmation.",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invoiceBankSettings, setInvoiceBankSettings] = useState(DEFAULT_INVOICE_BANK_SETTINGS);
  const [savingInvoiceBankSettings, setSavingInvoiceBankSettings] = useState(false);

  const recommendedSettings = [
    ["business_name", "PRINT & CRAFT (PVT) LTD."], ["invoice_prefix", "INV-"], ["currency", "LKR"],
    ["whatsapp_number", "94757138882"], ["payment_terms_days", "30"], ["low_stock_alert", "true"],
  ] as const;

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("settings")
        .select("id, key, value")
        .order("key", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      const loadedSettings = (data || []) as Setting[];
      setSettings(loadedSettings);
      const getSettingValue = (key: string, fallback: string) =>
        loadedSettings.find((setting) => setting.key === key)?.value || fallback;
      setInvoiceBankSettings({
        bankName: getSettingValue("invoice_bank_name", DEFAULT_INVOICE_BANK_SETTINGS.bankName),
        accountName: getSettingValue("invoice_bank_account_name", DEFAULT_INVOICE_BANK_SETTINGS.accountName),
        accountNumber: getSettingValue("invoice_bank_account_number", DEFAULT_INVOICE_BANK_SETTINGS.accountNumber),
        branch: getSettingValue("invoice_bank_branch", DEFAULT_INVOICE_BANK_SETTINGS.branch),
        paymentNote: getSettingValue("invoice_bank_payment_note", DEFAULT_INVOICE_BANK_SETTINGS.paymentNote),
      });
    } catch (err) {
      console.error("Settings load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function saveInvoiceBankSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingInvoiceBankSettings(true);
    setError("");

    const values = [
      ["invoice_bank_name", invoiceBankSettings.bankName],
      ["invoice_bank_account_name", invoiceBankSettings.accountName],
      ["invoice_bank_account_number", invoiceBankSettings.accountNumber],
      ["invoice_bank_branch", invoiceBankSettings.branch],
      ["invoice_bank_payment_note", invoiceBankSettings.paymentNote],
    ].map(([key, value]) => ({ key, value: value.trim() }));

    try {
      const { error: saveError } = await supabase
        .from("settings")
        .upsert(values, { onConflict: "key" });

      if (saveError) throw new Error(saveError.message);
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save invoice bank details.");
    } finally {
      setSavingInvoiceBankSettings(false);
    }
  }

  async function createSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newKey.trim() || !newValue.trim()) {
      alert("Please enter both a key and value.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = { key: newKey.trim().toLowerCase().replace(/\s+/g, "_"), value: newValue.trim() };
      const { error } = editingId
        ? await supabase.from("settings").update(payload).eq("id", editingId)
        : await supabase.from("settings").upsert(payload, { onConflict: "key" });

      if (error) {
        throw new Error(error.message);
      }

      setNewKey("");
      setNewValue("");
      setEditingId(null);
      await loadSettings();
    } catch (err) {
      console.error("Create setting error:", err);
      setError(err instanceof Error ? err.message : "Unable to save setting.");
    } finally {
      setSaving(false);
    }
  }

  function editSetting(setting: Setting) { setEditingId(setting.id); setNewKey(setting.key); setNewValue(setting.value); }
  async function addRecommendedSetting(key: string, value: string) {
    setSaving(true); setError("");
    const { error: saveError } = await supabase.from("settings").upsert({ key, value }, { onConflict: "key" });
    if (saveError) setError(saveError.message); else await loadSettings();
    setSaving(false);
  }
  async function deleteSetting(setting: Setting) {
    if (!window.confirm(`Delete setting “${setting.key}”?`)) return;
    const { error: deleteError } = await supabase.from("settings").delete().eq("id", setting.id);
    if (deleteError) setError(deleteError.message); else await loadSettings();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="mt-2 text-sm text-slate-500">
              Configure system defaults and business settings.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {settings.length} setting{settings.length === 1 ? "" : "s"}
          </div>
        </div>

        <form onSubmit={saveInvoiceBankSettings} className="mb-8 rounded-3xl border border-teal-100 bg-teal-50/40 p-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-teal-950">Invoice bank details</h2>
            <p className="mt-1 text-sm text-teal-800">These details appear in the bank transfer section of every invoice.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Bank name
              <input value={invoiceBankSettings.bankName} onChange={(event) => setInvoiceBankSettings((current) => ({ ...current, bankName: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Account name
              <input value={invoiceBankSettings.accountName} onChange={(event) => setInvoiceBankSettings((current) => ({ ...current, accountName: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Account number
              <input value={invoiceBankSettings.accountNumber} onChange={(event) => setInvoiceBankSettings((current) => ({ ...current, accountNumber: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Branch
              <input value={invoiceBankSettings.branch} onChange={(event) => setInvoiceBankSettings((current) => ({ ...current, branch: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal" />
            </label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">
              Payment instruction
              <textarea value={invoiceBankSettings.paymentNote} onChange={(event) => setInvoiceBankSettings((current) => ({ ...current, paymentNote: event.target.value }))} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal" />
            </label>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">Bank details are stored with the other POS settings.</p>
            <button type="submit" disabled={savingInvoiceBankSettings} className="rounded-xl bg-teal-800 px-5 py-3 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50">
              {savingInvoiceBankSettings ? "Saving..." : "Save invoice bank details"}
            </button>
          </div>
        </form>

        <section className="mb-8 rounded-3xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-sm font-bold text-blue-950">System controls</h2>
          <p className="mt-1 text-sm text-blue-800">Add common defaults, then edit their values below whenever the business changes.</p>
          <div className="mt-4 flex flex-wrap gap-2">{recommendedSettings.map(([key, value]) => <button key={key} type="button" disabled={saving} onClick={() => void addRecommendedSetting(key, value)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">+ {key.replaceAll("_", " ")}</button>)}</div>
        </section>

        <form className="mb-8 space-y-4 rounded-3xl bg-slate-50 p-6" onSubmit={createSetting}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Key</label>
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="e.g. business_name, invoice_prefix, whatsapp_number"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Value</label>
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="e.g. INV-"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Create or update settings for business defaults.</p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Setting" : "Save Setting"}
            </button>
          </div>

          {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        </form>

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">Loading settings...</div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
        ) : settings.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            No settings found. Create system values to manage POS defaults.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Key</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Value</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <tr key={setting.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-4 text-slate-900">{setting.key}</td>
                    <td className="px-4 py-4 text-slate-600">{setting.value}</td>
                    <td className="px-4 py-4"><button onClick={() => editSetting(setting)} className="mr-3 text-xs font-bold text-blue-600">Edit</button><button onClick={() => void deleteSetting(setting)} className="text-xs font-bold text-rose-600">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
