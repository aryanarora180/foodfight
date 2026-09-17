import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

const schema = z.object({
  username: z.string().min(1),
  value: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username || !session.isAdmin) {
    return NextResponse.json({ error: "admins only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const key = parsed.data.username.toLowerCase();

  const { state, result } = await updateState((state) => {
    const record = state.users[key];
    if (!record) {
      return { error: "no such user" as const };
    }
    if (state.phase === "results") {
      return { error: "this round is already over" as const };
    }
    if (parsed.data.value) record.notComing = true;
    else delete record.notComing;
    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ state: toPublicState(state) });
}
