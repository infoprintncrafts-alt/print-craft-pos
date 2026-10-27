"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Setting = {
  id: string;
  key: string;
  value: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

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

      setSettings((data || []) as Setting[]);
    } catch (err) {
      console.error("Settings load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load settings.");
    } finally {
      setLoading(false);
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
