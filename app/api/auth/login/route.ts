import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { isDesignatedAdmin } from "@/lib/admin";
import { toPublicState } from "@/lib/gameLogic";
import type { UserRecord } from "@/lib/types";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "username must be at least 2 characters")
    .max(24, "username must be under 24 characters")
    .regex(/^[a-zA-Z0-9_ -]+$/, "letters, numbers, spaces, - and _ only"),
});

// honor system: no password. anyone can log in as any username — the whole
// point is a small trusted team, not identity verification.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 }
    );
  }
  const { username } = parsed.data;
  const key = username.toLowerCase();

  const { state, result } = await updateState((state) => {
    const existing = state.users[key];
    if (existing) return { user: existing };
    const isAdmin = isDesignatedAdmin(username, state);
    const user: UserRecord = { username, isAdmin, createdAt: Date.now() };
    state.users[key] = user;
    return { user };
  });

  const session = await getSession();
  session.username = result.user.username;
  session.isAdmin = result.user.isAdmin;
  await session.save();

  return NextResponse.json({
    user: { username: result.user.username, isAdmin: result.user.isAdmin },
    state: toPublicState(state),
  });
}
