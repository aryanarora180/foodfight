import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { updateState } from "@/lib/store";
import { toPublicState, MIN_RESTAURANTS_TO_VOTE } from "@/lib/gameLogic";

const schema = z.object({
  votingType: z.enum(["simple", "points", "ranked"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username || !session.isAdmin) {
    return NextResponse.json({ error: "admins only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "pick a voting format" }, { status: 400 });
  }
  const { state, result } = await updateState((state) => {
    if (state.phase !== "submission") {
      return { error: "already past submission phase" as const };
    }
    if (state.restaurants.length < MIN_RESTAURANTS_TO_VOTE) {
      return {
        error: `need at least ${MIN_RESTAURANTS_TO_VOTE} restaurants before voting can start` as const,
      };
    }
    state.phase = "voting";
    state.votes = {};
    state.votingType = parsed.data.votingType;
    return { ok: true as const };
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ state: toPublicState(state) });
}
