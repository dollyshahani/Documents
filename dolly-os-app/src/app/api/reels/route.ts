import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { nextSlot, Reel, writeReel } from "@/lib/reels";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const sb = db();
  const { data } = await sb
    .from("reels")
    .select("*")
    .neq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(40);
  return NextResponse.json({ reels: data ?? [] });
}

// Kick the GitHub renderer right away instead of waiting for its schedule.
// Optional: without GITHUB_DISPATCH_TOKEN the hourly run picks it up.
async function kickRenderer() {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO || "dollyshahani/Documents";
  if (!token) return;
  await fetch(`https://api.github.com/repos/${repo}/actions/workflows/reels.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({ ref: process.env.GITHUB_REF_NAME || "master" }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const { action, id, caption, feedback } = await req.json();
  const sb = db();

  if (action === "new") {
    const made = await writeReel(sb);
    await kickRenderer();
    return NextResponse.json(made);
  }

  const { data: reel } = await sb.from("reels").select("*").eq("id", id).single();
  if (!reel) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patch: Record<string, unknown> = {};
  if (typeof caption === "string") patch.caption = caption;

  switch (action) {
    case "approve":
      patch.status = "approved";
      patch.scheduled_at = await nextSlot(sb);
      break;
    case "now":
      patch.status = "approved";
      patch.scheduled_at = new Date().toISOString();
      break;
    case "unschedule":
      patch.status = "review";
      patch.scheduled_at = null;
      break;
    case "reject":
      patch.status = "rejected";
      break;
    case "redo":
      if (reel.source === "upload") {
        return NextResponse.json({ error: "your own edits are redone in video-editor, not here" }, { status: 400 });
      }
      await sb.from("reels").update({ status: "regenerate", feedback: feedback || null }).eq("id", id);
      await writeReel(sb, { ...(reel as Reel), feedback: feedback || null });
      await kickRenderer();
      return NextResponse.json({ ok: true });
    case "caption":
      break;
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  await sb.from("reels").update(patch).eq("id", id);
  return NextResponse.json({ ok: true, ...patch });
}
