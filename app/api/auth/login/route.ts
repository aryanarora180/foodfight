import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { hashPassword, verifyPassword } from "@/lib/password";
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
  password: z.string().min(4, "password must be at least 4 characters").max(200),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 }
    );
  }
  const { username, password } = parsed.data;
  const key = username.toLowerCase();

  const { state, result } = await updateState((state) => {
    const existing = state.users[key];
    if (existing) {
      const ok = verifyPassword(password, existing.salt, existing.passwordHash);
      if (!ok) return { error: "wrong password" as const };
      return { user: existing };
    }
    const { hash, salt } = hashPassword(password);
    const isAdmin = isDesignatedAdmin(username, state);
    const user: UserRecord = {
      username,
      passwordHash: hash,
      salt,
      isAdmin,
      createdAt: Date.now(),
    };
    state.users[key] = user;
    return { user };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const session = await getSession();
  session.username = result.user.username;
  session.isAdmin = result.user.isAdmin;
  await session.save();

  return NextResponse.json({
    user: { username: result.user.username, isAdmin: result.user.isAdmin },
    state: toPublicState(state),
  });
}
