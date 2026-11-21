"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeGhanaPhone } from "@/lib/phone";

export async function startJob(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Please sign in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, station_id")
    .eq("id", user.id)
    .single();

  if (!profile?.station_id) throw new Error("No station assigned to your account");

  const plate = String(formData.get("plate") || "").trim().toUpperCase().replace(/\s+/g, "");
  const serviceCode = String(formData.get("service_code") || "");
  const phone = normalizeGhanaPhone(String(formData.get("customer_phone") || ""));
  const customerName = String(formData.get("customer_name") || "") || null;

  if (!plate) throw new Error("Enter the car plate number");
  if (!phone) throw new Error("Enter a valid Ghana phone number");

  const { data: service } = await supabase
    .from("services")
    .select("code, name, price_ghs, minutes")
    .eq("station_id", profile.station_id)
    .eq("code", serviceCode)
    .eq("is_active", true)
    .single();

  if (!service) throw new Error("Select a valid service");

  const { count: paidWashes } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("station_id", profile.station_id)
    .eq("customer_phone", phone)
    .eq("payment_status", "paid")
    .eq("counts_for_loyalty", true);

  const isFreeWash = Boolean(paidWashes && paidWashes > 0 && paidWashes % 5 === 0);
  const price = Number(service.price_ghs);
  const amount = isFreeWash ? 0 : price;

  const { data: vehicle } = await supabase
    .from("vehicles")
    .upsert(
      {
        station_id: profile.station_id,
        plate,
        customer_phone: phone,
        customer_name: customerName
      },
      { onConflict: "station_id,plate" }
    )
    .select("id")
    .single();

  const receiptNo = `BQ-${Date.now().toString(36).toUpperCase()}`;
  const estimatedReadyAt = new Date(Date.now() + service.minutes * 60_000).toISOString();

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      station_id: profile.station_id,
      vehicle_id: vehicle!.id,
      plate,
      customer_phone: phone,
      customer_name: customerName,
      service_code: service.code,
      service_name: service.name,
      price_ghs: price,
      discount_ghs: isFreeWash ? price : 0,
      amount_ghs: amount,
      is_free_wash: isFreeWash,
      counts_for_loyalty: true,
      receipt_no: receiptNo,
      estimated_ready_at: estimatedReadyAt,
      created_by: profile.id,
      payment_status: isFreeWash ? "paid" : "unpaid",
      payment_method: isFreeWash ? "free" : null
    })
    .select("id, public_token")
    .single();

  if (error) throw error;

  const paymentLink = isFreeWash
    ? null
    : `https://checkout.paystack.com/${receiptNo}`;

  await supabase.from("messages").insert({
    station_id: profile.station_id,
    job_id: job.id,
    to_phone: phone,
    kind: "job_started",
    channel: "whatsapp",
    body: [
      `BayQueue: Your ${service.name} for ${plate} has started.`,
      `Estimated ready time: ${new Date(estimatedReadyAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}.`,
      isFreeWash ? "This wash is FREE - loyalty reward." : `Pay with MoMo: ${paymentLink}`,
      `Receipt: ${receiptNo}`
    ].filter(Boolean).join("\n")
  });

  await supabase.from("audit_logs").insert({
    station_id: profile.station_id,
    actor_id: profile.id,
    action: "job_started",
    job_id: job.id,
    details: { plate, service: service.code, amount, isFreeWash }
  });

  revalidatePath("/queue");
  return { jobId: job.id, receiptNo, amount, isFreeWash, paymentLink };
}

export async function markReady(jobId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Please sign in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, station_id")
    .eq("id", user.id)
    .single();

  if (!profile?.station_id) throw new Error("No station assigned");

  const { data: job } = await supabase
    .from("jobs")
    .update({
      status: "ready",
      ready_at: new Date().toISOString(),
      ready_by: profile.id
    })
    .eq("id", jobId)
    .eq("station_id", profile.station_id)
    .select("plate, customer_phone")
    .single();

  if (!job) throw new Error("Job not found");

  await supabase.from("messages").insert({
    station_id: profile.station_id,
    job_id: jobId,
    to_phone: job.customer_phone,
    kind: "job_ready",
    channel: "whatsapp",
    body: `BayQueue: Your car ${job.plate} is clean and ready for pickup!`
  });

  await supabase.from("audit_logs").insert({
    station_id: profile.station_id,
    actor_id: profile.id,
    action: "job_marked_ready",
    job_id: jobId,
    details: { marked_at: new Date().toISOString() }
  });

  revalidatePath("/queue");
}

export async function markPaid(jobId: string, method: "cash" | "momo") {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Please sign in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, station_id")
    .eq("id", user.id)
    .single();

  if (!profile?.station_id) throw new Error("No station assigned");

  await supabase
    .from("jobs")
    .update({
      payment_status: "paid",
      payment_method: method,
      paid_at: new Date().toISOString(),
      paid_confirmed_by: profile.id
    })
    .eq("id", jobId)
    .eq("station_id", profile.station_id);

  revalidatePath("/queue");
  revalidatePath("/reports");
}
