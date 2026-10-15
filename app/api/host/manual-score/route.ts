import { NextResponse } from "next/server";
import { awardManualScore, checkAdmin } from "@/lib/quiz-store";

export async function POST(request: Request) {
  const auth = checkAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as {
    teamName?: string;
    roundId?: string;
    points?: number;
    reason?: string;
  };

  const teamName = typeof payload.teamName === "string" ? payload.teamName.trim() : "";
  const roundId = typeof payload.roundId === "string" ? payload.roundId : "r3";
  const points = typeof payload.points === "number" && Number.isFinite(payload.points) ? payload.points : 0;
  const reason = typeof payload.reason === "string" ? payload.reason.slice(0, 200) : "Manual score adjustment";

  if (!teamName) {
    return NextResponse.json({ error: "teamName is required." }, { status: 400 });
  }

  const entry = await awardManualScore({ teamName, roundId, points, reason });
  return NextResponse.json({ ok: true, award: entry });
}
