import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getState, updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";
import { generateTempPassword, hashPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username || !session.isAdmin) {
    return NextResponse.json({ error: "admins only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : null;
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }
  const key = username.toLowerCase();

  const peek = await getState();
  if (!peek.users[key]) {
    return NextResponse.json({ error: "no such user" }, { status: 400 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const { state } = await updateState((state) => {
    const record = state.users[key];
    if (record) {
      record.passwordHash = passwordHash;
      record.mustChangePassword = true;
    }
    return { ok: true as const };
  });

  return NextResponse.json({
    username: peek.users[key].username,
    tempPassword,
    state: toPublicState(state),
  });
}
