import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  }
  const sb = db();
  await sb.from("push_subs").upsert(
    {
      endpoint: sub.endpoint,
      keys_p256dh: sub.keys.p256dh,
      keys_auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  return NextResponse.json({ ok: true });
}
