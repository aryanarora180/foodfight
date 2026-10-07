import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";
import { MAX_DODGE_TRIES, MIN_DODGE_TRIES } from "@/lib/rodeoGoat";

// Either flag the place on/off, set how many dodges it takes, or both.
const schema = z
  .object({
    id: z.string().min(1),
    value: z.boolean().optional(),
    tries: z
      .number()
      .int("tries must be a whole number")
      .min(MIN_DODGE_TRIES, `tries must be at least ${MIN_DODGE_TRIES}`)
      .max(MAX_DODGE_TRIES, `tries can't be more than ${MAX_DODGE_TRIES}`)
      .optional(),
  })
  .refine((v) => v.value !== undefined || v.tries !== undefined, {
    message: "nothing to change",
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

  const { id, value, tries } = parsed.data;

  const { state, result } = await updateState((state) => {
    const existing = state.restaurantHistory[id];
    if (!existing) {
      return { error: "no such vault entry" as const };
    }
    state.restaurantHistory[id] = {
      ...existing,
      ...(value !== undefined && { dodgy: value }),
      ...(tries !== undefined && { dodgeTries: tries }),
    };
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ state: toPublicState(state, session.username ?? "") });
}
