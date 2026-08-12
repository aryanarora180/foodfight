import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";
import type { Restaurant } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1, "restaurant name is required").max(80),
  url: z.string().trim().url("must be a valid URL (include https://)").max(500),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 }
    );
  }

  const username = session.username;
  const { state, result } = await updateState((state) => {
    if (state.phase !== "submission") {
      return { error: "submissions are closed" as const };
    }
    const existingIdx = state.restaurants.findIndex((r) => r.submittedBy === username);
    const restaurant: Restaurant = {
      id: existingIdx >= 0 ? state.restaurants[existingIdx].id : nanoid(8),
      name: parsed.data.name,
      url: parsed.data.url,
      submittedBy: username,
      submittedAt: Date.now(),
    };
    if (existingIdx >= 0) {
      state.restaurants[existingIdx] = restaurant;
    } else {
      state.restaurants.push(restaurant);
    }
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ state: toPublicState(state) });
}
