import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getOrCreateDay, getSettings } from "@/lib/today";
import { addDays, todayInTz } from "@/lib/dates";
import { cronAuthorized, sendToAll } from "@/lib/push";
import { TWO_MIN_TASK } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = db();
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);
  const day = await getOrCreateDay(sb, date);

  // If yesterday's mood was low, send the 2-minute version instead.
  const { data: yesterday } = await sb
    .from("days")
    .select("mood")
    .eq("date", addDays(date, -1))
    .maybeSingle();

  let title = "Today";
  if (yesterday?.mood === "low") {
    title = TWO_MIN_TASK;
  } else if (day.one_thing_goal_id) {
    const { data: goal } = await sb
      .from("goals")
      .select("title")
      .eq("id", day.one_thing_goal_id)
      .single();
    if (goal) title = goal.title;
  }

  // meds due today ride along in the morning push (max 3 pushes/day rule)
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  const { data: meds } = await sb.from("meds").select("name,days").eq("active", true);
  const dueToday = (meds ?? [])
    .filter((m: any) => (m.days ?? []).includes(weekday))
    .map((m: any) => m.name);
  const medsLine = dueToday.length > 0 ? ` ${dueToday.join(" + ")} today.` : "";

  const move = settings.in_bangalore ? "Gym first." : "Move first (10-min anything).";
  const result = await sendToAll(sb, {
    title: title.slice(0, 80),
    body: `${move} Floor: 1 post + log.${medsLine}`.slice(0, 190),
    url: "/",
  });
  return NextResponse.json(result);
}
