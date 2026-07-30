import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { cronAuthorized, sendToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sendToAll(db(), {
    title: "3 lines.",
    body: "What shipped, one signal, tomorrow's one thing.",
    url: "/log",
  });
  return NextResponse.json(result);
}
