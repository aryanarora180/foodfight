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
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json({ error: "vault entry id required" }, { status: 400 });
  }

  const { state, result } = await updateState((state) => {
    if (!state.restaurantHistory[id]) {
      return { error: "no such vault entry" as const };
    }
    delete state.restaurantHistory[id];
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ state: toPublicState(state) });
}
