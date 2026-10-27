"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(updateError.message); else setMessage("Password updated. You can now sign in.");
    setSaving(false);
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl"><h1 className="text-2xl font-bold">Reset password</h1><p className="mt-2 text-sm text-slate-500">Choose a new password for your account.</p>{error && <p className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}<label className="mt-5 block text-sm font-semibold">New password<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" /></label><label className="mt-4 block text-sm font-semibold">Confirm password<input type="password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" /></label><button disabled={saving} className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Updating…" : "Update password"}</button><Link href="/login" className="mt-4 block text-center text-sm font-semibold text-blue-600">Back to sign in</Link></form></main>;
}
