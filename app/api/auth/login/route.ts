import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getState, updateState } from "@/lib/store";
import { isDesignatedAdmin } from "@/lib/admin";
import { toPublicState } from "@/lib/gameLogic";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { UserRecord } from "@/lib/types";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "username must be at least 2 characters")
    .max(24, "username must be under 24 characters")
    .regex(/^[a-zA-Z0-9_ -]+$/, "letters, numbers, spaces, - and _ only"),
  password: z.string().max(200).optional(),
});

// accounts are admin-created now — the only self-serve exception is the
// very first admin, who has to be able to bootstrap the app somehow.
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

  const peek = await getState();
  const existing = peek.users[key];

  if (existing) {
    if (!existing.passwordHash) {
      // pre-existing account from before passwords were required. admins can
      // self-serve one password set (mirrors the bootstrap flow below) since
      // otherwise a legacy admin with no password could never log in to use
      // the reset-password tool on themselves. non-admin legacy accounts
      // still need an admin to reset them via the roster.
      if (!existing.isAdmin) {
        return NextResponse.json(
          { error: "this account has no password set — ask your admin to reset it" },
          { status: 401 }
        );
      }
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: "choose a password (6+ characters) for your existing admin account", reason: "set_password" },
          { status: 401 }
        );
      }
      const passwordHash = await hashPassword(password);
      const { state } = await updateState((state) => {
        const record = state.users[key];
        if (record) {
          record.passwordHash = passwordHash;
          record.mustChangePassword = false;
        }
        return { ok: true as const };
      });

      const session = await getSession();
      session.username = existing.username;
      session.isAdmin = existing.isAdmin;
      session.mustChangePassword = false;
      await session.save();

      return NextResponse.json({
        user: { username: existing.username, isAdmin: existing.isAdmin, mustChangePassword: false },
        state: toPublicState(state),
      });
    }
    if (!password) {
      return NextResponse.json({ error: "enter your password" }, { status: 401 });
    }
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "wrong password" }, { status: 401 });
    }

    const session = await getSession();
    session.username = existing.username;
    session.isAdmin = existing.isAdmin;
    session.mustChangePassword = Boolean(existing.mustChangePassword);
    await session.save();

    return NextResponse.json({
      user: {
        username: existing.username,
        isAdmin: existing.isAdmin,
        mustChangePassword: Boolean(existing.mustChangePassword),
      },
      state: toPublicState(peek),
    });
  }

  if (!isDesignatedAdmin(username, peek)) {
    return NextResponse.json(
      { error: "no such account — ask your admin to set one up for you" },
      { status: 404 }
    );
  }

  // bootstrap: the designated first admin gets to choose their own password
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "choose a password (6+ characters) to create your admin account" },
      { status: 401 }
    );
  }
  const passwordHash = await hashPassword(password);
  const { state, result } = await updateState((state) => {
    const record = state.users[key];
    if (record) return { user: record };
    const user: UserRecord = {
      username,
      isAdmin: true,
      createdAt: Date.now(),
      passwordHash,
      mustChangePassword: false,
    };
    state.users[key] = user;
    return { user };
  });

  const session = await getSession();
  session.username = result.user.username;
  session.isAdmin = result.user.isAdmin;
  session.mustChangePassword = Boolean(result.user.mustChangePassword);
  await session.save();

  return NextResponse.json({
    user: {
      username: result.user.username,
      isAdmin: result.user.isAdmin,
      mustChangePassword: Boolean(result.user.mustChangePassword),
    },
    state: toPublicState(state),
  });
}
