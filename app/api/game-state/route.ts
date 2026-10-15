import { NextResponse } from "next/server";
import { checkAdmin, getLiveGameState, updateLiveGameState } from "@/lib/quiz-store";

export async function GET() {
  const gameState = await getLiveGameState();
  return NextResponse.json({ gameState }, { headers: { "Cache-Control": "no-store" } });
}

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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid updates format." }, { status: 400 });
  }

  const updated = await updateLiveGameState(body);
  return NextResponse.json({ ok: true, gameState: updated });
}
