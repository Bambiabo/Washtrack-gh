import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatGhs } from "@/lib/phone";

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("station_id")
    .eq("id", user!.id)
    .single();

  const startDate = from ?? new Date().toISOString().slice(0, 10);
  const endDate = to ?? new Date().toISOString().slice(0, 10);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("service_name, amount_ghs, payment_method, payment_status, is_free_wash")
    .eq("station_id", profile?.station_id)
    .gte("created_at", `${startDate}T00:00:00Z`)
    .lte("created_at", `${endDate}T23:59:59Z`);

  const total = (jobs ?? []).reduce((sum, job) => sum + Number(job.amount_ghs), 0);
  const cash = (jobs ?? []).filter((job) => job.payment_method === "cash").reduce((sum, job) => sum + Number(job.amount_ghs), 0);
  const momo = (jobs ?? []).filter((job) => job.payment_method === "momo").reduce((sum, job) => sum + Number(job.amount_ghs), 0);
  const freeWashes = (jobs ?? []).filter((job) => job.is_free_wash).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Reports</h1>

      <form className="card grid grid-cols-2 gap-3" action="/reports">
        <input type="date" name="from" defaultValue={startDate} className="input" />
        <input type="date" name="to" defaultValue={endDate} className="input" />
        <button className="btn btn-primary col-span-2">Apply filters</button>
      </form>

      <div className="card grid grid-cols-2 gap-4 text-center">
        <div><p className="text-xs text-slate-500">Cars</p><p className="text-2xl font-black">{jobs?.length ?? 0}</p></div>
        <div><p className="text-xs text-slate-500">Revenue</p><p className="text-2xl font-black">{formatGhs(total)}</p></div>
        <div><p className="text-xs text-slate-500">Cash</p><p className="text-xl font-bold">{formatGhs(cash)}</p></div>
        <div><p className="text-xs text-slate-500">MoMo</p><p className="text-xl font-bold">{formatGhs(momo)}</p></div>
        <div className="col-span-2"><p className="text-xs text-slate-500">Free washes</p><p className="text-xl font-bold">{freeWashes}</p></div>
      </div>

      <a
        className="btn border border-slate-300 dark:border-slate-700"
        href={`/api/reports/export?from=${startDate}&to=${endDate}`}
      >
        Export CSV
      </a>
    </div>
  );
}
