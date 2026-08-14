import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getState, updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";
import { hashPassword, verifyPassword } from "@/lib/password";

const schema = z.object({
  currentPassword: z.string().min(1, "enter your current password"),
  newPassword: z.string().min(6, "new password must be at least 6 characters").max(200),
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

  const key = session.username.toLowerCase();
  const { currentPassword, newPassword } = parsed.data;

  const peek = await getState();
  const record = peek.users[key];
  if (!record) {
    await session.destroy();
    return NextResponse.json({ error: "your account was removed" }, { status: 401 });
  }
  if (!record.passwordHash || !(await verifyPassword(currentPassword, record.passwordHash))) {
    return NextResponse.json({ error: "current password is wrong" }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  const { state } = await updateState((state) => {
    const record = state.users[key];
    if (record) {
      record.passwordHash = newHash;
      record.mustChangePassword = false;
    }
    return { ok: true as const };
  });

  session.mustChangePassword = false;
  await session.save();

  return NextResponse.json({
    user: { username: session.username, isAdmin: Boolean(session.isAdmin), mustChangePassword: false },
    state: toPublicState(state),
  });
}
