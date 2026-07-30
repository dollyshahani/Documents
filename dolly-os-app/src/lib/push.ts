import webpush from "web-push";
import { SupabaseClient } from "@supabase/supabase-js";

export async function sendToAll(
  sb: SupabaseClient,
  payload: { title: string; body: string; url?: string }
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:shahanidolly@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const { data: subs } = await sb.from("push_subs").select("*");
  if (!subs) return { sent: 0 };
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      // subscription gone — clean it up
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await sb.from("push_subs").delete().eq("id", sub.id);
      }
    }
  }
  return { sent };
}

export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured — allow (dev)
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
