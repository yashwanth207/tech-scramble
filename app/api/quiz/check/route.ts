import { NextResponse } from "next/server";
import { loadQuiz, recordSubmission } from "@/lib/quiz-store";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const payload = body as {
    questionId?: string;
    answer?: string;
    teamName?: string;
    setId?: string;
  };

  const questionId = typeof payload.questionId === "string" ? payload.questionId : "";
  const answer = typeof payload.answer === "string" ? payload.answer.slice(0, 300) : "";
  const teamName = typeof payload.teamName === "string" ? payload.teamName.slice(0, 80).trim() : "Anonymous";
  const setId = typeof payload.setId === "string" ? payload.setId : "";

  if (!questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }

  const result = await loadQuiz();
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  const quiz = result.value;
  const question = quiz.questions.find((q) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const given = normalize(answer);
  const accepted = question.answer
    .split("|")
    .map((a) => normalize(a))
    .filter((a) => a !== "");

  const correct = given !== "" && accepted.includes(given);
  const points = correct ? question.marks : 0;

  // Record submission and prevent duplicate scoring
  const submissionRes = await recordSubmission({
    teamName,
    setId: setId || question.setId,
    roundId: question.roundId,
    questionId: question.id,
    answer,
    correct,
    points,
  });

  return NextResponse.json(
    {
      correct,
      points: submissionRes.duplicate ? 0 : points,
      duplicate: submissionRes.duplicate,
      marks: question.marks,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
