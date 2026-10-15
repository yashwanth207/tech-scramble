import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/quiz-store";

export async function GET() {
  const leaderboard = await getLeaderboard();
  return NextResponse.json({ leaderboard }, { headers: { "Cache-Control": "no-store" } });
}
