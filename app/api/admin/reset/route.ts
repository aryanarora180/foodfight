import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

export async function POST() {
  const session = await getSession();
  if (!session.username || !session.isAdmin) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const { state } = await updateState((state) => {
    state.phase = "submission";
    state.restaurants = [];
    state.votes = {};
    return { ok: true as const };
  });
  return NextResponse.json({ state: toPublicState(state) });
}
