import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSettings } from "./today";
import { addDays, todayInTz } from "./dates";
import { sendToAll } from "./push";

// The reel machine. Claude writes → GitHub Action renders → she approves →
// tick cron posts to Instagram in the next free slot. Nothing posts unapproved.

export type Reel = {
  id: string;
  created_at: string;
  status: string;
  source: "auto" | "upload";
  topic: string;
  pillar: string;
  hook: string;
  script: { hook?: string; beats?: { say: string; screen: string }[]; cta?: string };
  caption: string;
  feedback: string | null;
  avatar_url: string | null;
  video_url: string | null;
  scheduled_at: string | null;
  ig_media_id: string | null;
  posted_at: string | null;
  error: string | null;
};

// Posting slots: Mon / Wed / Fri / Sun evenings in her timezone.
const SLOT_DAYS = [1, 3, 5, 0];
const SLOT_TIME = "19:30";
// Unposted reels to keep in the pipe — enough to fill the week, few enough
// that ignoring the review queue never piles up a backlog.
const BUFFER = 3;

const IG_API = "https://graph.facebook.com/v21.0";

// ---------- script writing ----------

const SCRIPT_TOOL = {
  name: "save_reel",
  description: "Save the finished reel script.",
  input_schema: {
    type: "object" as const,
    properties: {
      topic: { type: "string", description: "3-8 word internal label for the idea" },
      pillar: { type: "string", enum: ["ai-building", "productivity"] },
      hook: { type: "string", description: "First spoken line. Under 12 words. Stops the scroll." },
      beats: {
        type: "array",
        minItems: 4,
        maxItems: 7,
        items: {
          type: "object",
          properties: {
            say: { type: "string", description: "What she says. 1-2 short spoken sentences." },
            screen: { type: "string", description: "On-screen text. 2-6 words, punchy, no emoji." },
          },
          required: ["say", "screen"],
        },
      },
      cta: { type: "string", description: "Last spoken line. One short call to action." },
      caption: {
        type: "string",
        description: "Instagram caption: 1-3 short lines, then a blank line, then 5-8 hashtags.",
      },
    },
    required: ["topic", "pillar", "hook", "beats", "cta", "caption"],
  },
};

const SYSTEM = `You write Instagram Reels for @dollybuilds — Dolly, a builder who makes apps, automations and AI workflows, and runs her life on a self-built accountability system (Dolly OS). She has ADHD; her content is real, fast and specific.

Two pillars, alternate them:
- ai-building: things she built or you could build with AI tools (Claude, Claude Code, automations, agents, apps). Concrete tools, concrete steps, concrete results.
- productivity: systems, routines, accountability, building discipline with ADHD — always anchored in a real system or tool, never generic hustle advice.

Rules:
- 30-45 seconds spoken (about 90-120 words total across hook + beats + cta).
- First person, her voice: direct, a little cheeky, zero corporate tone.
- The hook makes a specific promise or a bold claim. No "In this video", no "Hey guys".
- Every beat must earn its place: one idea, one step, or one proof.
- Never invent numbers about her (followers, revenue, users). Never give medical advice.
- If her recent log mentions something she shipped, prefer making the reel about that.
- Don't repeat a topic from the recent list.`;

export async function writeReel(sb: SupabaseClient, redo?: Reel) {
  const settings = await getSettings(sb);
  const today = todayInTz(settings.timezone);

  const [{ data: recent }, { data: logs }] = await Promise.all([
    sb.from("reels").select("topic,pillar").order("created_at", { ascending: false }).limit(30),
    sb.from("logs").select("date,shipped").gte("date", addDays(today, -7)).order("date"),
  ]);

  const shipped = (logs ?? [])
    .filter((l: any) => l.shipped?.trim())
    .map((l: any) => `${l.date}: ${l.shipped}`)
    .join("\n");
  const lastPillar = recent?.[0]?.pillar;

  let ask = `Recent topics (don't repeat):\n${(recent ?? []).map((r: any) => `- ${r.topic}`).join("\n") || "- none yet"}\n\n`;
  ask += `What she shipped this week (from her log):\n${shipped || "nothing logged"}\n\n`;
  if (redo) {
    ask += `REDO this reel. Previous script:\n${JSON.stringify(redo.script)}\nHer feedback: ${redo.feedback || "make it better"}\nKeep the topic unless the feedback says otherwise.`;
  } else {
    ask += `Write the next reel. Use the ${lastPillar === "ai-building" ? "productivity" : "ai-building"} pillar.`;
  }

  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 2048,
    system: SYSTEM,
    tools: [SCRIPT_TOOL],
    tool_choice: { type: "tool", name: "save_reel" },
    messages: [{ role: "user", content: ask }],
  });
  const block = res.content.find((b) => b.type === "tool_use") as any;
  if (!block) throw new Error(`no script returned (stop_reason: ${res.stop_reason})`);
  const s = block.input;

  const row = {
    status: "scripted",
    topic: s.topic,
    pillar: s.pillar,
    hook: s.hook,
    script: { hook: s.hook, beats: s.beats, cta: s.cta },
    caption: s.caption,
    video_url: null,
    error: null,
  };
  if (redo) {
    await sb.from("reels").update(row).eq("id", redo.id);
    return { id: redo.id, topic: s.topic };
  }
  const { data } = await sb.from("reels").insert(row).select("id").single();
  return { id: data?.id, topic: s.topic };
}

// Keep the pipe full. Called from the tick cron; at most one new script per call.
export async function topUpReels(sb: SupabaseClient) {
  const { count } = await sb
    .from("reels")
    .select("id", { count: "exact", head: true })
    .in("status", ["scripted", "rendering", "review", "regenerate", "approved", "publishing"]);
  if ((count ?? 0) >= BUFFER) return { skipped: `pipe full (${count})` };
  return writeReel(sb);
}

// Redo requests: rewrite the script with her feedback, renderer picks it up again.
export async function rewriteRequested(sb: SupabaseClient) {
  const { data } = await sb.from("reels").select("*").eq("status", "regenerate").limit(2);
  const done = [];
  for (const reel of (data ?? []) as Reel[]) done.push(await writeReel(sb, reel));
  return done;
}

// ---------- scheduling ----------

// UTC instant for a wall-clock time on a date in a timezone.
function zonedToUtc(date: string, hhmm: string, tz: string): Date {
  const guess = new Date(`${date}T${hhmm}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(guess);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const asTz = new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour").replace("24", "00")}:${get("minute")}:00Z`
  );
  return new Date(guess.getTime() - (asTz.getTime() - guess.getTime()));
}

export async function nextSlot(sb: SupabaseClient): Promise<string> {
  const settings = await getSettings(sb);
  const today = todayInTz(settings.timezone);
  const { data: taken } = await sb
    .from("reels")
    .select("scheduled_at")
    .in("status", ["approved", "publishing", "posted"])
    .not("scheduled_at", "is", null);
  const takenSet = new Set((taken ?? []).map((r: any) => new Date(r.scheduled_at).getTime()));
  const soonest = Date.now() + 15 * 60 * 1000;

  for (let d = 0; d < 60; d++) {
    const date = addDays(today, d);
    if (!SLOT_DAYS.includes(new Date(date + "T12:00:00Z").getUTCDay())) continue;
    const at = zonedToUtc(date, SLOT_TIME, settings.timezone);
    if (at.getTime() > soonest && !takenSet.has(at.getTime())) return at.toISOString();
  }
  return new Date(soonest).toISOString();
}

// ---------- notifications ----------

export async function notifyReady(sb: SupabaseClient, reel: Reel) {
  const push = await sendToAll(sb, {
    title: "New reel ready 🎬",
    body: reel.hook.slice(0, 150),
    url: "/studio",
  });

  let email: unknown = "skipped (no RESEND_API_KEY)";
  if (process.env.RESEND_API_KEY) {
    const appUrl = process.env.APP_URL || "";
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.REEL_EMAIL_FROM || "Dolly OS <onboarding@resend.dev>",
        to: process.env.REEL_EMAIL_TO || "shahanidolly@gmail.com",
        subject: `Reel ready: ${reel.hook}`,
        html: `<p><b>${reel.hook}</b></p><p><a href="${reel.video_url}">Watch the video</a></p><p><a href="${appUrl}/studio">Approve it in Dolly OS →</a></p><pre style="white-space:pre-wrap">${reel.caption}</pre>`,
      }),
    });
    email = r.ok ? "sent" : `failed ${r.status}`;
  }
  return { push, email };
}

// ---------- Instagram ----------

async function ig(path: string, params: Record<string, string>, method = "POST") {
  const qs = new URLSearchParams({ ...params, access_token: process.env.IG_ACCESS_TOKEN! });
  const res = await fetch(`${IG_API}/${path}${method === "GET" ? `?${qs}` : ""}`, {
    method,
    body: method === "GET" ? undefined : qs,
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || `instagram ${res.status}`);
  return json;
}

// Two-step publish across ticks: create the container when the slot arrives,
// publish it on a later tick once Instagram finishes processing the video.
export async function publishDue(sb: SupabaseClient) {
  const igUser = process.env.IG_USER_ID;
  if (!igUser || !process.env.IG_ACCESS_TOKEN) return { skipped: "instagram not configured" };
  const out: Record<string, string> = {};

  const { data: due } = await sb
    .from("reels")
    .select("*")
    .eq("status", "approved")
    .lte("scheduled_at", new Date().toISOString());
  for (const reel of (due ?? []) as Reel[]) {
    try {
      const c = await ig(`${igUser}/media`, {
        media_type: "REELS",
        video_url: reel.video_url!,
        caption: reel.caption,
        share_to_feed: "true",
      });
      await sb.from("reels").update({ status: "publishing", ig_container_id: c.id }).eq("id", reel.id);
      out[reel.id] = "container created";
    } catch (e: any) {
      await sb.from("reels").update({ status: "failed", error: e.message }).eq("id", reel.id);
      out[reel.id] = `failed: ${e.message}`;
    }
  }

  const { data: processing } = await sb.from("reels").select("*").eq("status", "publishing");
  for (const reel of (processing ?? []) as any[]) {
    try {
      const s = await ig(reel.ig_container_id, { fields: "status_code" }, "GET");
      if (s.status_code === "IN_PROGRESS") {
        out[reel.id] = "processing";
        continue;
      }
      if (s.status_code !== "FINISHED") throw new Error(`container ${s.status_code}`);
      const p = await ig(`${igUser}/media_publish`, { creation_id: reel.ig_container_id });
      await sb
        .from("reels")
        .update({ status: "posted", ig_media_id: p.id, posted_at: new Date().toISOString() })
        .eq("id", reel.id);
      await sendToAll(sb, { title: "Reel is live ✅", body: reel.hook.slice(0, 150), url: "/studio" });
      out[reel.id] = "posted";
    } catch (e: any) {
      await sb.from("reels").update({ status: "failed", error: e.message }).eq("id", reel.id);
      out[reel.id] = `failed: ${e.message}`;
    }
  }
  return out;
}
