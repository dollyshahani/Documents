import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSettings } from "@/lib/today";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = db();
  return NextResponse.json(await getSettings(sb));
}

export async function POST(req: NextRequest) {
  const { morning_time, night_time, timezone, in_bangalore } = await req.json();
  const sb = db();
  await sb
    .from("settings")
    .update({ morning_time, night_time, timezone, in_bangalore })
    .eq("id", 1);
  return NextResponse.json({ ok: true });
}
