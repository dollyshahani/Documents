import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { cronAuthorized, sendToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Just a nudge. No deep link.
  const result = await sendToAll(db(), {
    title: "Phone out of the room.",
    body: "This is where tomorrow morning is won.",
  });
  return NextResponse.json(result);
}
