import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSettings } from "@/lib/today";
import { todayInTz } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Adherence tracking only: names + days of week. Never doses, never advice.
export async function GET() {
  const sb = db();
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();

  const { data: meds } = await sb
    .from("meds")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  // this week's takes (for the weekly checklist view)
  const start = new Date(date + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - weekday); // back to Sunday
  const weekStart = start.toISOString().slice(0, 10);
  const { data: takes } = await sb
    .from("med_takes")
    .select("med_id,date")
    .gte("date", weekStart);

  return NextResponse.json({
    date,
    weekday,
    weekStart,
    meds: meds ?? [],
    takes: takes ?? [],
  });
}

// Actions: add {name, days} · toggle_take {med_id, date} · remove {med_id}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = db();

  if (body.action === "add") {
    const name = (body.name ?? "").trim();
    const days: number[] = Array.isArray(body.days) ? body.days : [];
    if (!name || days.length === 0) {
      return NextResponse.json({ error: "name and days required" }, { status: 400 });
    }
    await sb.from("meds").insert({ name, days });
  }

  if (body.action === "toggle_take") {
    const { med_id, date } = body;
    const { data: existing } = await sb
      .from("med_takes")
      .select("id")
      .eq("med_id", med_id)
      .eq("date", date)
      .maybeSingle();
    if (existing) await sb.from("med_takes").delete().eq("id", existing.id);
    else await sb.from("med_takes").insert({ med_id, date });
  }

  if (body.action === "remove") {
    await sb.from("meds").update({ active: false }).eq("id", body.med_id);
  }

  return GET();
}
