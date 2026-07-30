import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = db();
  const { data } = await sb
    .from("goals")
    .select("*")
    .order("sort_order", { ascending: true });
  return NextResponse.json(data ?? []);
}

// Bulk update from the drag board: [{id, status, sort_order}]
export async function PATCH(req: NextRequest) {
  const updates: { id: string; status?: string; sort_order?: number }[] =
    await req.json();
  const sb = db();
  for (const u of updates) {
    const { id, ...fields } = u;
    await sb.from("goals").update(fields).eq("id", id);
  }
  return NextResponse.json({ ok: true });
}
