import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  username?: string;
  isAdmin?: boolean;
  mustChangePassword?: boolean;
}

const secret =
  process.env.SESSION_SECRET ||
  "dev-only-insecure-secret-please-set-SESSION_SECRET-env-var-32chars";

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "foodfight_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
