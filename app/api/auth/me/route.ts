import { NextResponse } from "next/server";
import { getActiveSession } from "@/lib/authGuard";

export async function GET() {
  const { session, record } = await getActiveSession();
  if (!record) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      username: session.username,
      isAdmin: Boolean(session.isAdmin),
      mustChangePassword: Boolean(session.mustChangePassword),
    },
  });
}
