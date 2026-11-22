import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: queued } = await supabase
    .from("messages")
    .select("id, to_phone, body")
    .eq("status", "queued")
    .eq("channel", "whatsapp")
    .limit(20);

  for (const message of queued ?? []) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: message.to_phone,
            type: "text",
            text: { body: message.body }
          })
        }
      );

      const result = await response.json();

      await supabase
        .from("messages")
        .update({
          status: response.ok ? "sent" : "failed",
          provider_id: result?.messages?.[0]?.id ?? null,
          error: response.ok ? null : JSON.stringify(result)
        })
        .eq("id", message.id);
    } catch (error) {
      await supabase
        .from("messages")
        .update({ status: "failed", error: String(error) })
        .eq("id", message.id);
    }
  }

  return NextResponse.json({ processed: queued?.length ?? 0 });
}
