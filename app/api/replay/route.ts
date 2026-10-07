import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/authGuard";

export async function GET(req: NextRequest) {
  const { record, state } = await getActiveSession();
  if (!record) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const win = state.winnerHistory.find((w) => w.id === id);
  if (!win?.round) {
    return NextResponse.json({ error: "no replay for that round" }, { status: 404 });
  }
  return NextResponse.json({ round: win.round });
}
