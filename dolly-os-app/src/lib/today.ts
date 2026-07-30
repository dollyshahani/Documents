import { SupabaseClient } from "@supabase/supabase-js";
import { db } from "./supabase";
import { addDays, displayDate, todayInTz, weekNumberFor } from "./dates";
import { Day, Goal, TodayState, TWO_MIN_TASK } from "./types";

export async function getSettings(sb: SupabaseClient) {
  const { data } = await sb.from("settings").select("*").eq("id", 1).single();
  return (
    data ?? {
      morning_time: "07:30",
      night_time: "22:30",
      timezone: "Asia/Kolkata",
      in_bangalore: false,
    }
  );
}

// Rule 2: never an empty state. If nothing is planned the app picks
// the next unchecked goal — current week first, then anything todo.
async function pickGoal(
  sb: SupabaseClient,
  date: string,
  excludeId?: string | null
): Promise<Goal | null> {
  const week = weekNumberFor(date);
  let q = sb
    .from("goals")
    .select("*")
    .eq("status", "todo")
    .order("week_number", { ascending: true })
    .order("sort_order", { ascending: true });
  const { data } = await q;
  if (!data || data.length === 0) return null;
  const candidates = (data as Goal[]).filter((g) => g.id !== excludeId);
  if (candidates.length === 0) return data[0] as Goal;
  // prefer this week's items, then earlier (overdue) weeks, then later
  const thisWeek = candidates.filter((g) => g.week_number === week);
  if (thisWeek.length > 0) return thisWeek[0];
  return candidates[0];
}

export async function getOrCreateDay(
  sb: SupabaseClient,
  date: string
): Promise<Day> {
  const { data: existing } = await sb
    .from("days")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (existing) {
    // backfill a one thing if the row exists but was never assigned
    if (!existing.one_thing_goal_id) {
      const goal = await pickGoal(sb, date);
      if (goal) {
        await sb
          .from("days")
          .update({ one_thing_goal_id: goal.id })
          .eq("id", existing.id);
        existing.one_thing_goal_id = goal.id;
      }
    }
    return existing as Day;
  }
  const goal = await pickGoal(sb, date);
  const { data: created, error } = await sb
    .from("days")
    .insert({ date, one_thing_goal_id: goal?.id ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return created as Day;
}

export function isComplete(day: Day): boolean {
  // The floor is sacred; two-minute mode done also completes the day.
  return (day.post_done && day.log_done) || (day.two_min_used && day.one_thing_done);
}

// Increment the streak exactly once per date, never decrement.
export async function refreshStreak(sb: SupabaseClient, day: Day) {
  if (!isComplete(day)) return;
  const { data: s } = await sb.from("streak").select("*").eq("id", 1).single();
  if (!s || s.last_complete_date === day.date) return;
  const next =
    s.last_complete_date === addDays(day.date, -1) ? s.current_count + 1 : 1;
  await sb
    .from("streak")
    .update({ current_count: next, last_complete_date: day.date })
    .eq("id", 1);
}

export async function getTodayState(): Promise<TodayState> {
  const sb = db();
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);
  const day = await getOrCreateDay(sb, date);

  let oneThing: { id: string; title: string } | null = null;
  if (day.two_min_used) {
    oneThing = { id: "two-min", title: TWO_MIN_TASK };
  } else if (day.one_thing_goal_id) {
    const { data: goal } = await sb
      .from("goals")
      .select("id,title")
      .eq("id", day.one_thing_goal_id)
      .single();
    if (goal) oneThing = goal;
  }

  const { data: s } = await sb.from("streak").select("*").eq("id", 1).single();
  const complete = isComplete(day);
  // Rule 5: current streak only, never the broken one.
  let streakDay = 1;
  if (s) {
    if (s.last_complete_date === date) streakDay = s.current_count;
    else if (s.last_complete_date === addDays(date, -1))
      streakDay = s.current_count + 1;
  }

  return {
    date,
    displayDate: displayDate(date),
    streakDay,
    complete,
    twoMin: day.two_min_used,
    oneThing,
    postDone: day.post_done,
    logDone: day.log_done,
    oneThingDone: day.one_thing_done,
  };
}
