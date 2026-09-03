import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";
import { REACTION_EMOJI } from "@/lib/types";

const schema = z.object({
  restaurantId: z.string().min(1),
  emoji: z.enum(REACTION_EMOJI),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const username = session.username;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid reaction" }, { status: 400 });
  }
  const { restaurantId, emoji } = parsed.data;

  const { state, result } = await updateState((state) => {
    if (!state.users[username.toLowerCase()]) {
      return { error: "you've been removed from this round" as const };
    }
    const restaurant = state.restaurants.find((r) => r.id === restaurantId);
    if (!restaurant) {
      return { error: "no such restaurant" as const };
    }
    restaurant.reactions ??= {};
    restaurant.reactions[emoji] = (restaurant.reactions[emoji] ?? 0) + 1;
    return { ok: true as const };
  });

  if ("error" in result) {
    if (result.error === "you've been removed from this round") {
      await session.destroy();
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ state: toPublicState(state) });
}
