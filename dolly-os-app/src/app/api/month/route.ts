import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSettings, isComplete } from "@/lib/today";
import { todayInTz } from "@/lib/dates";
import { Day } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = db();
  const settings = await getSettings(sb);
  const today = todayInTz(settings.timezone);
  const ym = today.slice(0, 7);
  const [y, m] = [Number(ym.slice(0, 4)), Number(ym.slice(5, 7))];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const { data: dayRows } = await sb
    .from("days")
    .select("*")
    .gte("date", `${ym}-01`)
    .lte("date", `${ym}-${String(daysInMonth).padStart(2, "0")}`);
  const { data: logs } = await sb
    .from("logs")
    .select("*")
    .gte("date", `${ym}-01`)
    .lte("date", `${ym}-${String(daysInMonth).padStart(2, "0")}`);
  const { data: goals } = await sb
    .from("goals")
    .select("*")
    .order("week_number")
    .order("sort_order");
  const { data: streak } = await sb.from("streak").select("*").eq("id", 1).single();
  const { data: stars } = await sb.from("north_stars").select("*").order("sort_order");

  const byDate = new Map((dayRows ?? []).map((d: Day) => [d.date, d]));
  const logByDate = new Map((logs ?? []).map((l: any) => [l.date, l]));

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${ym}-${String(i + 1).padStart(2, "0")}`;
    const row = byDate.get(date);
    // Rule 5: missed days are neutral, futures are open — no guilt states.
    const state =
      date > today ? "future" : row && isComplete(row) ? "complete" : "missed";
    return { date, state, log: logByDate.get(date) ?? null };
  });

  return NextResponse.json({
    today,
    days,
    goals: goals ?? [],
    streak: streak?.current_count ?? 0,
    stars: stars ?? [],
  });
}
