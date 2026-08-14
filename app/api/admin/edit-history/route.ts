import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

const schema = z.object({
  username: z.string().min(1),
  name: z.string().trim().min(1, "restaurant name is required").max(80),
  url: z.string().trim().url("must be a valid URL (include https://)").max(500),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username || !session.isAdmin) {
    return NextResponse.json({ error: "admins only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 }
    );
  }

  const { username, name, url } = parsed.data;
  const key = username.toLowerCase();

  const { state, result } = await updateState((state) => {
    const existing = state.restaurantHistory[key];
    if (!existing) {
      return { error: "no such vault entry" as const };
    }
    const normalized = name.trim().toLowerCase();
    const dupe = Object.entries(state.restaurantHistory).some(
      ([k, h]) => k !== key && h.name.trim().toLowerCase() === normalized
    );
    if (dupe) {
      return { error: "that place is already in the vault" as const };
    }
    state.restaurantHistory[key] = { ...existing, name, url, updatedAt: Date.now() };
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ state: toPublicState(state) });
}
