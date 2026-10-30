import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { cronAuthorized } from "@/lib/push";
import { notifyReady, Reel } from "@/lib/reels";

export const dynamic = "force-dynamic";

// Called by the GitHub renderer when a video lands: push + email her.
export async function POST(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  const sb = db();
  const { data: reel } = await sb.from("reels").select("*").eq("id", id).single();
  if (!reel) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(await notifyReady(sb, reel as Reel));
}
