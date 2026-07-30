import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getOrCreateDay, getSettings, refreshStreak } from "@/lib/today";
import { addDays, todayInTz, weekNumberFor } from "@/lib/dates";
import { Day } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = db();
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);
  const { data } = await sb.from("logs").select("*").eq("date", date).maybeSingle();
  return NextResponse.json(data ?? { date, shipped: "", signal: "", tomorrow: "" });
}

// The key loop: the evening log IS tomorrow's planning.
export async function POST(req: NextRequest) {
  const { shipped, signal, tomorrow, mood } = await req.json();
  const sb = db();
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);

  await sb
    .from("logs")
    .upsert({ date, shipped, signal, tomorrow }, { onConflict: "date" });

  const day = await getOrCreateDay(sb, date);
  const patch: Partial<Day> = { log_done: true };
  if (mood === "low" || mood === "ok" || mood === "high") patch.mood = mood;
  await sb.from("days").update(patch).eq("id", day.id);
  await refreshStreak(sb, { ...day, ...patch } as Day);

  // Set tomorrow's ONE THING from the "tomorrow" line.
  const text = (tomorrow ?? "").trim();
  if (text) {
    const tomorrowDate = addDays(date, 1);
    const { data: goal } = await sb
      .from("goals")
      .insert({
        title: text,
        week_number: weekNumberFor(tomorrowDate),
        sort_order: -1, // planned items outrank the backlog
        category: "admin",
      })
      .select("*")
      .single();
    if (goal) {
      await sb
        .from("days")
        .upsert(
          { date: tomorrowDate, one_thing_goal_id: goal.id },
          { onConflict: "date" }
        );
    }
  }
  return NextResponse.json({ ok: true });
}
