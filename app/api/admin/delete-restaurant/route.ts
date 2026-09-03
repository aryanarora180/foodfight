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
    return NextResponse.json({ error: "restaurant id required" }, { status: 400 });
  }

  const { state, result } = await updateState((state) => {
    if (state.phase !== "submission") {
      return { error: "can only remove picks during submissions" as const };
    }
    const idx = state.restaurants.findIndex((r) => r.id === id);
    if (idx < 0) {
      return { error: "no such restaurant" as const };
    }
    state.restaurants.splice(idx, 1);
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ state: toPublicState(state) });
}
