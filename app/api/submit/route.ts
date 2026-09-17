import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";
import type { Restaurant } from "@/lib/types";

const schema = z.object({
  historyId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const username = session.username;
  const { state, result } = await updateState((state) => {
    const record = state.users[username.toLowerCase()];
    if (!record) {
      return { error: "you've been removed from this round" as const };
    }
    if (record.notComing) {
      return { error: "you're marked as not coming this round" as const };
    }
    if (state.phase !== "submission") {
      return { error: "submissions are closed" as const };
    }
    const entry = state.restaurantHistory[parsed.data.historyId];
    if (!entry) {
      return { error: "no such restaurant in the list" as const };
    }
    const existingIdx = state.restaurants.findIndex((r) => r.submittedBy === username);
    const normalized = entry.name.trim().toLowerCase();
    const dupe = state.restaurants.some(
      (r, idx) => idx !== existingIdx && r.name.trim().toLowerCase() === normalized
    );
    if (dupe) {
      return { error: "someone already picked that one this round" as const };
    }
    const restaurant: Restaurant = {
      id: existingIdx >= 0 ? state.restaurants[existingIdx].id : entry.id,
      name: entry.name,
      url: entry.url,
      submittedBy: username,
      submittedAt: Date.now(),
      reactions: existingIdx >= 0 ? state.restaurants[existingIdx].reactions : {},
    };
    if (existingIdx >= 0) {
      state.restaurants[existingIdx] = restaurant;
    } else {
      state.restaurants.push(restaurant);
    }
    delete state.passes[username];

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
