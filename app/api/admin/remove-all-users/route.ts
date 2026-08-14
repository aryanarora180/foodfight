import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

export async function POST() {
  const session = await getSession();
  if (!session.username || !session.isAdmin) {
    return NextResponse.json({ error: "admins only" }, { status: 403 });
  }

  const { state } = await updateState((state) => {
    for (const [key, user] of Object.entries(state.users)) {
      if (user.isAdmin) continue;
      delete state.users[key];
      state.restaurants = state.restaurants.filter((r) => r.submittedBy !== user.username);
      delete state.votes[user.username];
      delete state.passes[user.username];
    }
    return { ok: true as const };
  });

  return NextResponse.json({ state: toPublicState(state) });
}
