"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const statuses = ["new", "quotation", "designing", "approved", "production", "quality_check", "ready", "delivered", "completed", "cancelled"];
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
type Job = { id: string; order_number: string; title: string; description: string | null; status: string; quantity: number; due_date: string | null; total: number; advance_paid: number; sale_id: string | null };

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { async function load() { const { data } = await supabase.from("orders").select("id,order_number,title,description,status,quantity,due_date,total,advance_paid,sale_id").eq("id", params.id).maybeSingle(); setJob(data as Job | null); } if (params.id) void load(); }, [params.id]);
  async function saveStatus(status: string) { if (!job) return; setSaving(true); const result = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", job.id); if (result.error) setError(result.error.message); else { await supabase.from("order_status_history").insert({ order_id: job.id, status }); setJob({ ...job, status }); } setSaving(false); }
  if (!job) return <main className="p-8 text-center text-sm text-slate-500">Loading job…</main>;
  return <main className="min-h-screen bg-slate-50 p-5 sm:p-8"><div className="mx-auto max-w-4xl space-y-6"><Link href="/orders" className="text-xs font-bold text-blue-600">← All jobs</Link>{message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}{error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold text-blue-600">{job.order_number}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{job.title}</h1><p className="mt-2 text-sm text-slate-500">{job.description || "No additional description"}</p><div className="mt-8 grid gap-4 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Quantity</p><p className="mt-1 text-xl font-bold">{job.quantity}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Due date</p><p className="mt-1 text-sm font-bold">{job.due_date ? new Date(job.due_date).toLocaleDateString("en-GB") : "Not set"}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Total</p><p className="mt-1 text-sm font-bold">LKR {Number(job.total || 0).toLocaleString()}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Balance</p><p className="mt-1 text-sm font-bold">LKR {Math.max(Number(job.total || 0) - Number(job.advance_paid || 0), 0).toLocaleString()}</p></div></div><label className="mt-8 block text-xs font-bold uppercase tracking-wider text-slate-400">Update status<select disabled={saving} value={job.status} onChange={(event) => void saveStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-blue-500">{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label><Link href={`/sales?orderId=${job.id}`} className="mt-5 block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700">Take to new sale & collect payment</Link></div><button onClick={() => router.push("/production")} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">Open production board</button></div></main>;
}
