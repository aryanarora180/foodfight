import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getState, updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";
import { generateTempPassword, hashPassword } from "@/lib/password";
import type { UserRecord } from "@/lib/types";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "username must be at least 2 characters")
    .max(24, "username must be under 24 characters")
    .regex(/^[a-zA-Z0-9_ -]+$/, "letters, numbers, spaces, - and _ only"),
  isAdmin: z.boolean().optional(),
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
  const { username, isAdmin } = parsed.data;
  const key = username.toLowerCase();

  const peek = await getState();
  if (peek.users[key]) {
    return NextResponse.json({ error: "that username is already taken" }, { status: 400 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const { state } = await updateState((state) => {
    if (state.users[key]) return { ok: true as const };
    const user: UserRecord = {
      username,
      isAdmin: Boolean(isAdmin),
      createdAt: Date.now(),
      passwordHash,
      mustChangePassword: true,
    };
    state.users[key] = user;
    return { ok: true as const };
  });

  return NextResponse.json({
    username,
    tempPassword,
    state: toPublicState(state),
  });
}
