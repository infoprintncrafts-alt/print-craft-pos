"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Supplier = {
  id: string;
  supplier_name: string;
  contact_person: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError("");

      const selectFields =
        "id, supplier_name, contact_person, phone, whatsapp, email, address, notes, created_at";

      const selectFieldsWithContact =
        "id, supplier_name, contact_person, phone, whatsapp, email, address, notes, created_at";
      const selectFieldsWithoutContact =
        "id, supplier_name, phone, whatsapp, email, address, notes, created_at";

      let result = await supabase
        .from("suppliers")
        .select(selectFieldsWithContact)
        .order("supplier_name", { ascending: true });

      if (result.error && result.error.message.includes("contact_person")) {
        const fallback = await supabase
          .from("suppliers")
          .select(selectFieldsWithoutContact)
          .order("supplier_name", { ascending: true });

        if (fallback.error) {
          throw new Error(fallback.error.message);
        }

        const fallbackData = (fallback.data || []).map((row: any) => ({
          ...row,
          contact_person: null,
        }));

        setSuppliers(fallbackData as Supplier[]);
        return;
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      setSuppliers((result.data || []) as Supplier[]);
    } catch (err) {
      console.error("Load suppliers error:", err);
      setError(err instanceof Error ? err.message : "Unable to load suppliers.");
    } finally {
      setLoading(false);
    }
  }

  async function createSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supplierName = name.trim();

    if (!supplierName) {
      alert("Please enter the supplier name.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: Record<string, unknown> = {
        supplier_name: supplierName,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (contactPerson.trim()) {
        payload.contact_person = contactPerson.trim();
      }

      let insertResult = await supabase.from("suppliers").insert(payload);

      if (insertResult.error && insertResult.error.message.includes("contact_person")) {
        delete payload.contact_person;
        insertResult = await supabase.from("suppliers").insert(payload);
      }

      if (insertResult.error) {
        throw new Error(insertResult.error.message);
      }

      setName("");
      setContactPerson("");
      setPhone("");
      setWhatsapp("");
      setEmail("");
      setAddress("");
      setNotes("");
      await loadSuppliers();
    } catch (err) {
      console.error("Create supplier error:", err);
      setError(err instanceof Error ? err.message : "Unable to save supplier.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage supplier contacts and purchase sources.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"}
          </div>
        </div>

        <form className="mb-8 grid gap-4 md:grid-cols-2" onSubmit={createSupplier}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Supplier Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Contact Person</label>
            <input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">WhatsApp</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              rows={3}
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Supplier"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            Loading suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">
            No suppliers found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Supplier</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Contact</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Phone</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-4 text-slate-900">{supplier.supplier_name}</td>
                    <td className="px-4 py-4 text-slate-600">{supplier.contact_person || "—"}</td>
                    <td className="px-4 py-4 text-slate-600">{supplier.phone || supplier.whatsapp || "—"}</td>
                    <td className="px-4 py-4 text-slate-600">{supplier.email || "—"}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(supplier.created_at).toLocaleDateString("en-GB")}</td>
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
