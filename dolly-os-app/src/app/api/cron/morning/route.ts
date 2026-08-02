import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { cronAuthorized } from "@/lib/push";
import { sendMorningPush } from "@/lib/jobs";

export const dynamic = "force-dynamic";

// ?force=1 bypasses the once-a-day guard — for testing with phone in hand.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const force = req.nextUrl.searchParams.get("force") === "1";
  return NextResponse.json(await sendMorningPush(db(), force));
}
