import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("station_id")
    .eq("id", user!.id)
    .single();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("receipt_no, plate, customer_phone, service_name, amount_ghs, payment_method, payment_status, is_free_wash, created_at")
    .eq("station_id", profile?.station_id)
    .gte("created_at", `${from}T00:00:00Z`)
    .lte("created_at", `${to}T23:59:59Z`);

  const rows = (jobs ?? []).map((job) => [
    job.receipt_no,
    job.plate,
    job.customer_phone,
    job.service_name,
    job.amount_ghs,
    job.payment_method ?? "",
    job.payment_status,
    job.is_free_wash ? "YES" : "NO",
    job.created_at
  ]);

  const csv = [
    ["Receipt", "Plate", "Phone", "Service", "Amount GHS", "Method", "Payment status", "Free wash", "Created at"],
    ...rows
  ]
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="bayqueue-report.csv"`
    }
  });
}
