import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState } from "@/lib/gameLogic";

// No body means "pass" (the original behavior). `{ value: false }` undoes it,
// putting the user back to undecided.
const schema = z.object({ value: z.boolean().optional() }).nullable();

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
  const passing = parsed.data?.value ?? true;

  const { state, result } = await updateState((state) => {
    if (!state.users[username.toLowerCase()]) {
      return { error: "you've been removed from this round" as const };
    }
    if (state.phase !== "submission") {
      return { error: "submissions are closed" as const };
    }
    if (passing) state.passes[username] = true;
    else delete state.passes[username];
    return { ok: true as const };
  });

  if ("error" in result) {
    if (result.error === "you've been removed from this round") {
      await session.destroy();
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ state: toPublicState(state) });
}
