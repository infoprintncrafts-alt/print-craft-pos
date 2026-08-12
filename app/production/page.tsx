"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const stages = ["new", "designing", "approved", "production", "quality_check", "ready", "delivered"];
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

type Job = { id: string; order_number: string; title: string; status: string; due_date: string | null; quantity: number };

export default function ProductionPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  async function load() { const { data } = await supabase.from("orders").select("id,order_number,title,status,due_date,quantity").not("status", "eq", "cancelled").order("due_date"); setJobs((data ?? []) as Job[]); }
  useEffect(() => { void load(); }, []);
  async function move(job: Job, status: string) { await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", job.id); await supabase.from("order_status_history").insert({ order_id: job.id, status }); await load(); }
  return <main className="min-h-screen bg-slate-50 p-5 sm:p-8"><div className="mx-auto max-w-7xl"><div className="mb-6"><Link href="/orders" className="text-xs font-bold text-blue-600">← Orders</Link><p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Operations</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Production board</h1><p className="mt-1 text-sm text-slate-500">Move jobs through the production lifecycle as work progresses.</p></div><div className="grid gap-4 overflow-x-auto pb-4 lg:grid-cols-4 xl:grid-cols-7">{stages.map((stage) => <section key={stage} className="min-w-[240px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">{label(stage)}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{jobs.filter((job) => job.status === stage).length}</span></div><div className="space-y-3">{jobs.filter((job) => job.status === stage).map((job) => <article key={job.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><Link href={`/orders/${job.id}`} className="text-xs font-bold text-blue-600">{job.order_number}</Link><p className="mt-1 text-sm font-semibold text-slate-800">{job.title}</p><p className="mt-2 text-xs text-slate-400">Qty {job.quantity}{job.due_date ? ` · Due ${new Date(job.due_date).toLocaleDateString("en-GB")}` : ""}</p>{stage !== "delivered" && <button onClick={() => move(job, stages[Math.min(stages.indexOf(stage) + 1, stages.length - 1)])} className="mt-3 w-full rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-blue-600">Move forward →</button>}</article>)}</div></section>)}</div></div></main>;
}
