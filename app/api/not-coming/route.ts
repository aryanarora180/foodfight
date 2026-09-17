import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

const schema = z.object({
  value: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }
  const username = session.username;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const { state, result } = await updateState((state) => {
    const record = state.users[username.toLowerCase()];
    if (!record) {
      return { error: "you've been removed from this round" as const };
    }
    if (parsed.data.value) record.notComing = true;
    else delete record.notComing;
    return { ok: true as const };
  });

  if ("error" in result) {
    if (result.error === "you've been removed from this round") {
      await session.destroy();
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ state: toPublicState(state) });
}
