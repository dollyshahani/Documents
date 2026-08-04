import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getOrCreateDay, getSettings, getTodayState, refreshStreak } from "@/lib/today";
import { todayInTz } from "@/lib/dates";
import { Day, Goal } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getTodayState());
}

// Actions: toggle_post · toggle_log · done_one_thing · bad_day · swap
export async function POST(req: NextRequest) {
  const { action } = await req.json();
  const sb = db();
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);
  const day = await getOrCreateDay(sb, date);

  const patch: Partial<Day> = {};

  if (action === "toggle_post") patch.post_done = !day.post_done;
  if (action === "toggle_log") patch.log_done = !day.log_done;

  if (action === "done_one_thing") {
    patch.one_thing_done = !day.one_thing_done;
    // two-minute mode: doing the tiny task also counts as the post
    if (day.two_min_used && patch.one_thing_done) patch.post_done = true;
    // completing the real one thing marks the goal done
    if (!day.two_min_used && day.one_thing_goal_id) {
      await sb
        .from("goals")
        .update({ status: patch.one_thing_done ? "done" : "todo" })
        .eq("id", day.one_thing_goal_id);
    }
  }

  if (action === "bad_day") {
    patch.two_min_used = true;
    patch.mood = "low";
    patch.one_thing_done = false;
  }

  if (action === "swap") {
    // pull a different unchecked goal
    const { data: goals } = await sb
      .from("goals")
      .select("*")
      .eq("status", "todo")
      .order("week_number", { ascending: true })
      .order("sort_order", { ascending: true });
    const others = ((goals ?? []) as Goal[]).filter(
      (g) => g.id !== day.one_thing_goal_id
    );
    if (others.length > 0) {
      patch.one_thing_goal_id = others[0].id;
      patch.one_thing_done = false;
      patch.two_min_used = false;
    }
  }

  if (Object.keys(patch).length > 0) {
    await sb.from("days").update(patch).eq("id", day.id);
  }
  const updated = { ...day, ...patch } as Day;
  await refreshStreak(sb, updated);
  return NextResponse.json(await getTodayState());
}
