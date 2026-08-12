import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

const schema = z.object({
  order: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid vote" }, { status: 400 });
  }

  const username = session.username;
  const { state, result } = await updateState((state) => {
    if (state.phase !== "voting") {
      return { error: "voting is not open" as const };
    }
    const restaurantIds = new Set(state.restaurants.map((r) => r.id));
    const order = parsed.data.order;
    const orderSet = new Set(order);
    const valid =
      order.length === state.restaurants.length &&
      orderSet.size === order.length &&
      order.every((id) => restaurantIds.has(id));
    if (!valid) {
      return { error: "ranking must include every restaurant exactly once" as const };
    }
    state.votes[username] = { username, order, votedAt: Date.now() };
    const everyoneVoted = Object.values(state.users).every((u) => Boolean(state.votes[u.username]));
    if (everyoneVoted) {
      state.phase = "results";
    }
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ state: toPublicState(state) });
}
