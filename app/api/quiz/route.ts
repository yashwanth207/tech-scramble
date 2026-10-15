import { NextResponse } from "next/server";
import { loadQuiz } from "@/lib/quiz-store";

// Public (no auth): returns sets, rounds, and questions for participants.
// Answers and taboo words are stripped to prevent participant inspection in browser.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId");

  const result = await loadQuiz();
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  const quiz = result.value;
  let questions = quiz.questions;
  if (setId) {
    questions = questions.filter((q) => q.setId === setId);
  }

  return NextResponse.json(
    {
      sets: quiz.sets,
      rounds: quiz.rounds,
      questions: questions.map((q) => ({
        id: q.id,
        setId: q.setId,
        roundId: q.roundId,
        text: q.text,
        marks: q.marks,
        timer: q.timer,
        imageUrl: q.imageUrl,
        options: q.options,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}