import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  const { name, url } = parsed.data;

  const { state, result } = await updateState((state) => {
    if (!state.users[username.toLowerCase()]) {
      return { error: "you've been removed from this round" as const };
    }
    if (state.phase !== "submission") {
      return { error: "submissions are closed" as const };
    }
    const idx = state.restaurants.findIndex((r) => r.submittedBy === username);
    if (idx < 0) {
      return { error: "you haven't submitted a pick" as const };
    }
    const normalized = name.trim().toLowerCase();
    const dupe = state.restaurants.some(
      (r, i) => i !== idx && r.name.trim().toLowerCase() === normalized
    );
    if (dupe) {
      return { error: "that place is already on the table — pick another name" as const };
    }
    state.restaurants[idx] = { ...state.restaurants[idx], name, url };
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
