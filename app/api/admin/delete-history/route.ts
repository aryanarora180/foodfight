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
  const key = username.toLowerCase();

  const { state, result } = await updateState((state) => {
    if (!state.restaurantHistory[key]) {
      return { error: "no such vault entry" as const };
    }
    delete state.restaurantHistory[key];
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ state: toPublicState(state) });
}
