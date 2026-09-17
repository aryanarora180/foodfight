import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

const schema = z.object({
  name: z.string().trim().min(1, "restaurant name is required").max(80),
  url: z.string().trim().url("must be a valid URL (include https://)").max(500),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 }
    );
  }

  const { state, result } = await updateState((state) => {
    if (!state.users[username.toLowerCase()]) {
      return { error: "you've been removed from this round" as const };
    }
    const normalized = parsed.data.name.trim().toLowerCase();
    const dupe = Object.values(state.restaurantHistory).some(
      (h) => h.name.trim().toLowerCase() === normalized
    );
    if (dupe) {
      return { error: "that place is already in the vault" as const };
    }
    const id = nanoid(8);
    state.restaurantHistory[id] = {
      id,
      username,
      name: parsed.data.name,
      url: parsed.data.url,
      updatedAt: Date.now(),
    };
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
