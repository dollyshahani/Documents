import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/supabase";
import { getSettings } from "@/lib/today";
import { todayInTz } from "@/lib/dates";
import { Goal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FALLBACK_TALK = `No API key, no excuses — here's the truth anyway:

October flea is coming whether you scroll or not. Content queen isn't a vibe, it's reps. Fame and travel don't find people who are "about to start."

You know today's one thing. The floor is one post and three lines. That's it. That's the whole job.

Get up. Move. Ship rough. Go.`;

// The Call: a hard-hitting talk generated from her REAL state.
export async function POST() {
  const sb = db();
  const settings = await getSettings(sb);
  const date = todayInTz(settings.timezone);

  const [{ data: streak }, { data: goals }, { data: stars }, { data: day }] =
    await Promise.all([
      sb.from("streak").select("*").eq("id", 1).single(),
      sb.from("goals").select("*").eq("status", "todo").order("week_number").order("sort_order"),
      sb.from("north_stars").select("*").order("sort_order"),
      sb.from("days").select("*").eq("date", date).maybeSingle(),
    ]);

  const fleaStar = (stars ?? []).find((s: any) => s.target_date);
  const daysToFlea = fleaStar
    ? Math.max(
        0,
        Math.round(
          (new Date(fleaStar.target_date).getTime() - new Date(date).getTime()) /
            86400000
        )
      )
    : null;

  const state = [
    `Date: ${date}`,
    `Current streak: ${streak?.current_count ?? 0} days`,
    daysToFlea !== null ? `Days until ${fleaStar.title}: ${daysToFlea}` : "",
    `North stars: ${(stars ?? [])
      .map((s: any) => `${s.title} → ${s.translation}`)
      .join(" · ")}`,
    `Today so far: post ${day?.post_done ? "done" : "NOT done"}, log ${
      day?.log_done ? "done" : "NOT done"
    }`,
    `Unchecked goals: ${((goals ?? []) as Goal[])
      .slice(0, 6)
      .map((g) => g.title)
      .join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ talk: FALLBACK_TALK });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2048,
      system: `You are the hard-hitting motivation call for Dolly. She has ADHD; novelty works, willpower doesn't. She asked for this call — she pressed the button because she needs a push RIGHT NOW.

Rules:
- 120 words max. Punchy short sentences. Second person.
- Tie it to her REAL state (streak, countdown, what's not done today). Use the numbers.
- Her north stars and their daily translations are the spine: October lil flea → lose weight. Content queen → lose weight. Fame + travel → make content.
- No lists, no questions she must answer, no "you got this" filler. Tough-love, certain, like a coach who assumes she's about to move.
- End with exactly ONE next physical action she can do in the next 2 minutes.
- Never mention medications, doses, or health advice.`,
      messages: [{ role: "user", content: `Her state right now:\n${state}\n\nGive her the call.` }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ talk: FALLBACK_TALK });
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ talk: text || FALLBACK_TALK });
  } catch {
    return NextResponse.json({ talk: FALLBACK_TALK });
  }
}
