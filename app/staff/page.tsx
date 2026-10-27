"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("cashier");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("staff")
        .select("id, name, email, role, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setStaff((data || []) as StaffMember[]);
    } catch (err) {
      console.error("Staff load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load staff.");
    } finally {
      setLoading(false);
    }
  }

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert("Please enter a name and email.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = { name: name.trim(), email: email.trim(), role, is_active: isActive };
      const { error } = editingId
        ? await supabase.from("staff").update(payload).eq("id", editingId)
        : await supabase.from("staff").insert(payload);

      if (error) {
        throw new Error(error.message);
      }

      setName("");
      setEmail("");
      setRole("cashier");
      setIsActive(true);
      setEditingId(null);
      setShowForm(false);

      await loadStaff();
    } catch (err) {
      console.error("Create staff error:", err);
      setError(err instanceof Error ? err.message : "Unable to add staff.");
    } finally {
      setSaving(false);
    }
  }

  function editStaff(member: StaffMember) {
    setEditingId(member.id); setName(member.name); setEmail(member.email); setRole(member.role); setIsActive(member.is_active); setShowForm(true);
  }

  async function toggleStaff(member: StaffMember) {
    const { error: updateError } = await supabase.from("staff").update({ is_active: !member.is_active }).eq("id", member.id);
    if (updateError) setError(updateError.message); else await loadStaff();
  }

  async function deleteStaff(member: StaffMember) {
    if (!window.confirm(`Delete staff member ${member.name}?`)) return;
    const { error: deleteError } = await supabase.from("staff").delete().eq("id", member.id);
    if (deleteError) setError(deleteError.message); else await loadStaff();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage POS users, roles, and employee access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {showForm ? "Hide form" : "Add Staff"}
          </button>
        </div>

        {showForm && (
          <form className="mb-8 space-y-4 rounded-3xl bg-slate-50 p-6" onSubmit={createStaff}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Staff member name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Active</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Staff are stored in the POS access table.</p>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Save changes" : "Create Staff"}
              </button>
            </div>

            {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          </form>
        )}

        {loading ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">Loading staff list...</div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
        ) : staff.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-12 text-center text-slate-500">No staff records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Role</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Added</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-4 text-slate-900">{member.name}</td>
                    <td className="px-4 py-4 text-slate-600">{member.email}</td>
                    <td className="px-4 py-4 text-slate-700">{member.role}</td>
                    <td className="px-4 py-4 text-slate-700">{member.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(member.created_at).toLocaleDateString("en-GB")}</td>
                    <td className="px-4 py-4"><div className="flex gap-2"><button onClick={() => editStaff(member)} className="text-xs font-bold text-blue-600">Edit</button><button onClick={() => void toggleStaff(member)} className="text-xs font-bold text-amber-600">{member.is_active ? "Deactivate" : "Activate"}</button><button onClick={() => void deleteStaff(member)} className="text-xs font-bold text-rose-600">Delete</button></div></td>
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
