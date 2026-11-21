"use client";

import { useEffect, useState, useTransition } from "react";
import { markPaid, markReady } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatGhs } from "@/lib/phone";

type Job = {
  id: string;
  plate: string;
  service_name: string;
  amount_ghs: string;
  status: string;
  payment_status: string;
  is_free_wash: boolean;
  receipt_no: string;
};

export default function QueuePage() {
  const supabase = createSupabaseBrowserClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pending, startTransition] = useTransition();

  async function load() {
    const { data } = await supabase
      .from("jobs")
      .select("id, plate, service_name, amount_ghs, status, payment_status, is_free_wash, receipt_no")
      .in("status", ["in_progress", "ready"])
      .order("created_at", { ascending: false });

    setJobs(data ?? []);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("bayqueue-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const active = jobs.filter((job) => job.status === "in_progress");
  const ready = jobs.filter((job) => job.status === "ready");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">Live Queue</h1>

      <section>
        <h2 className="mb-2 font-bold">In progress ({active.length})</h2>
        {active.map((job) => (
          <div key={job.id} className="card mb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black">{job.plate}</p>
                <p className="text-sm text-slate-500">{job.service_name}</p>
                <p className="text-sm">{formatGhs(job.amount_ghs)} - {job.payment_status}</p>
              </div>
              {job.is_free_wash && <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white">FREE</span>}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn btn-primary" disabled={pending} onClick={() => startTransition(() => markReady(job.id))}>
                Mark Ready
              </button>
              <button className="btn border border-slate-300 dark:border-slate-700" disabled={pending} onClick={() => startTransition(() => markPaid(job.id, "cash"))}>
                Cash Paid
              </button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-bold">Ready for pickup ({ready.length})</h2>
        {ready.map((job) => (
          <div key={job.id} className="card mb-3 border-emerald-500">
            <p className="text-lg font-black">{job.plate}</p>
            <p className="text-sm text-slate-500">{job.service_name} - {job.receipt_no}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
