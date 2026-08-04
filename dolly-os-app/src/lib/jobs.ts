import { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateDay, getSettings } from "./today";
import { addDays, todayInTz } from "./dates";
import { sendToAll } from "./push";
import { TWO_MIN_TASK } from "./types";

// Insert-or-skip: true means we own this send, false means already sent today.
async function claim(sb: SupabaseClient, kind: string, date: string): Promise<boolean> {
  const { error } = await sb.from("push_log").insert({ kind, date });
  return !error;
}

export async function sendMorningPush(sb: SupabaseClient, force = false) {
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);
  if (!force && !(await claim(sb, "morning", date))) {
    return { skipped: "already sent today" };
  }
  const day = await getOrCreateDay(sb, date);

  const { data: yesterday } = await sb
    .from("days")
    .select("mood")
    .eq("date", addDays(date, -1))
    .maybeSingle();

  // Title priority: low-mood 2-min override > the day's yap hook > the one thing.
  // Waking up to the first line of your own reel is the whole point of the hook.
  let title = "Today";
  if (yesterday?.mood === "low") {
    title = TWO_MIN_TASK;
  } else if (day.hook?.trim()) {
    title = day.hook.trim();
  } else if (day.one_thing_goal_id) {
    const { data: goal } = await sb
      .from("goals")
      .select("title")
      .eq("id", day.one_thing_goal_id)
      .single();
    if (goal) title = goal.title;
  }

  // The whole morning stack rides ONE notification: move + floor + meds + custom line.
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  const { data: meds } = await sb.from("meds").select("name,days").eq("active", true);
  const dueToday = (meds ?? [])
    .filter((m: any) => (m.days ?? []).includes(weekday))
    .map((m: any) => m.name);

  const parts = [
    settings.in_bangalore ? "Gym first." : "Move first (10-min anything).",
    "Floor: 1 post + log.",
  ];
  if (dueToday.length > 0) parts.push(`${dueToday.join(" + ")}.`);
  if (settings.morning_stack?.trim()) parts.push(settings.morning_stack.trim());

  return sendToAll(sb, {
    title: title.slice(0, 80),
    body: parts.join(" ").slice(0, 190),
    url: "/",
  });
}

export async function sendNightPush(sb: SupabaseClient, force = false) {
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);
  if (!force && !(await claim(sb, "night", date))) {
    return { skipped: "already sent today" };
  }
  return sendToAll(sb, {
    title: "3 lines. Posted?",
    body: "What shipped, one signal, tomorrow's one thing + hook.",
    url: "/log",
  });
}

export async function sendPhonePush(sb: SupabaseClient, force = false) {
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);
  if (!force && !(await claim(sb, "phone", date))) {
    return { skipped: "already sent today" };
  }
  return sendToAll(sb, {
    title: "Phone out of the room.",
    body: "This is where tomorrow morning is won.",
  });
}
