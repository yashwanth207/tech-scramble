import { NextResponse } from "next/server";
import { checkAdmin, getBackendStatus, loadQuiz, saveQuiz } from "@/lib/quiz-store";

export async function GET(request: Request) {
  const auth = checkAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const result = await loadQuiz();
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  const backend = getBackendStatus();

  return NextResponse.json(
    {
      data: result.value,
      backend: {
        activeProvider: backend.activeProvider,
        isSupabaseConfigured: backend.isSupabaseConfigured,
        isFirebaseConfigured: backend.isFirebaseConfigured,
        hasSupabaseUrl: Boolean(backend.supabaseUrl),
        hasSupabaseKey: Boolean(backend.supabaseKey),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  const auth = checkAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const result = await saveQuiz(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true, data: result.value });
}
