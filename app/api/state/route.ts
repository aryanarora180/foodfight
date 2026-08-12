import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

export async function GET() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const state = await getState();
  return NextResponse.json({ state: toPublicState(state) });
}
