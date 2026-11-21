"use client";

import { useEffect, useState, useTransition } from "react";
import { startJob } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const services = [
  { code: "full_wash", label: "Full Wash" },
  { code: "engine_wash", label: "Engine Wash" },
  { code: "oil_change", label: "Oil Change" },
  { code: "full_wash_oil_change", label: "Full Wash + Oil Change" }
];

export default function SupervisorPage() {
  const supabase = createSupabaseBrowserClient();
  const [servicesList, setServicesList] = useState(services);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    supabase
      .from("services")
      .select("code, name")
      .eq("is_active", true)
      .order("sort")
      .then(({ data }) => {
        if (data?.length) setServicesList(data);
      });
  }, [supabase]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const job = await startJob(formData);
        setResult(
          job.isFreeWash
            ? "FREE WASH started and customer notified."
            : `Job started. Receipt ${job.receiptNo} sent.`
        );
        event.currentTarget.reset();
      } catch (error) {
        setResult(error instanceof Error ? error.message : "Could not start job");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Start Job</h1>

      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold">Car plate number</label>
          <input name="plate" className="input uppercase" placeholder="GR 1234-24" required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Service</label>
          <select name="service_code" className="input" required>
            {servicesList.map((service) => (
              <option key={service.code} value={service.code}>{service.label ?? service.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Customer phone</label>
          <input name="customer_phone" className="input" inputMode="tel" placeholder="024 000 0000" required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Customer name (optional)</label>
          <input name="customer_name" className="input" />
        </div>

        <button className="btn btn-primary text-lg" disabled={pending}>
          {pending ? "Starting..." : "START JOB"}
        </button>
      </form>

      {result && <div className="card text-center font-semibold text-blue-600">{result}</div>}
    </div>
  );
}
