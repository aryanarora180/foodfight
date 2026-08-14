import { NextResponse } from "next/server";
import { getActiveSession } from "@/lib/authGuard";
import { toPublicState } from "@/lib/gameLogic";

export async function GET() {
  const { record, state } = await getActiveSession();
  if (!record) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  return NextResponse.json({ state: toPublicState(state) });
}
