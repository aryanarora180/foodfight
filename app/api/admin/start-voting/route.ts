import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState, MIN_RESTAURANTS_TO_VOTE } from "@/lib/gameLogic";

export async function POST() {
  const session = await getSession();
  if (!session.username || !session.isAdmin) {
    return NextResponse.json({ error: "admins only" }, { status: 403 });
  }
  const { state, result } = await updateState((state) => {
    if (state.phase !== "submission") {
      return { error: "already past submission phase" as const };
    }
    if (state.restaurants.length < MIN_RESTAURANTS_TO_VOTE) {
      return {
        error: `need at least ${MIN_RESTAURANTS_TO_VOTE} restaurants before we can break ground` as const,
      };
    }
    state.phase = "voting";
    state.votes = {};
    return { ok: true as const };
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ state: toPublicState(state) });
}
