import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { cronAuthorized } from "@/lib/push";
import { getSettings } from "@/lib/today";
import { sendMorningPush, sendNightPush, sendPhonePush } from "@/lib/jobs";

export const dynamic = "force-dynamic";

// The scheduler entrypoint. Hit this every ~10 minutes (Vercel Pro cron, or
// cron-job.org on the Hobby plan) and it sends whichever pushes are due based
// on the times in Settings — which makes those times real, and makes
// "set morning ping to 3 minutes from now" an actual test.
//
// phone-out fires 30 minutes after the night ping (22:30 → 23:00 by default).
// push_log guarantees each kind sends at most once per day, so overlapping
// schedulers are harmless.

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Window: fire if now is within [target, target + 45min]. Wide enough that a
// 10-minute tick never misses; push_log stops repeats inside the window.
const due = (now: number, target: number) => {
  const diff = (now - target + 1440) % 1440;
  return diff >= 0 && diff <= 45;
};

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = db();
  const settings = await getSettings(sb);

  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const now = toMin(hm);

  const morningAt = toMin(settings.morning_time || "07:30");
  const nightAt = toMin(settings.night_time || "22:30");
  const phoneAt = (nightAt + 30) % 1440;

  const ran: Record<string, unknown> = { now: hm };
  if (due(now, morningAt)) ran.morning = await sendMorningPush(sb);
  if (due(now, nightAt)) ran.night = await sendNightPush(sb);
  if (due(now, phoneAt)) ran.phone = await sendPhonePush(sb);

  return NextResponse.json(ran);
}
