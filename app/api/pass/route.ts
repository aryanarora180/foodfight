import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

export async function POST() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const username = session.username;

  const { state, result } = await updateState((state) => {
    if (!state.users[username.toLowerCase()]) {
      return { error: "you've been removed from this round" as const };
    }
    if (state.phase !== "submission") {
      return { error: "submissions are closed" as const };
    }
    state.passes[username] = true;
    return { ok: true as const };
  });

  if ("error" in result) {
    if (result.error === "you've been removed from this round") {
      await session.destroy();
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ state: toPublicState(state) });
}
