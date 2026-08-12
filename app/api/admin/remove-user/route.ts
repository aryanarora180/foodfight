import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username || !session.isAdmin) {
    return NextResponse.json({ error: "admins only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : null;
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const { state, result } = await updateState((state) => {
    const key = username.toLowerCase();
    const user = state.users[key];
    if (!user) {
      return { error: "no such user" as const };
    }
    if (user.isAdmin) {
      return { error: "can't remove an admin" as const };
    }
    delete state.users[key];
    state.restaurants = state.restaurants.filter((r) => r.submittedBy !== user.username);
    delete state.votes[user.username];
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ state: toPublicState(state) });
}
