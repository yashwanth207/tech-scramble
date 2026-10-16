import { describe, expect, it } from "vitest";
import { answersMatch, textLeaksAnswer } from "./answers.ts";
import { createSession, currentQuestion, questionElapsedMs, reduce, rematchSession, turnElapsedMs } from "./reducer.ts";
import { progressionPlan, selectRound } from "./select.ts";
import { scoreCorrect, teamTotal } from "./scoring.ts";
import { DEFAULT_SETTINGS, type Asset, type Bank, type Question, type Settings } from "./types.ts";

function question(overrides: Partial<Question> & Pick<Question, "question_id" | "answer" | "game_mode">): Question {
  return {
    set_id: "demo",
    difficulty: "easy",
    category: "test",
    prompt: `Clue for ${overrides.question_id}`,
    accepted_answers: [overrides.answer],
    hints: ["First nudge", "Second nudge"],
    explanation: "Because the clues add up.",
    time_limit: 30,
    points: 100,
    content_status: "published",
    image_asset_ids: [],
    source_identities: [],
    asset_hashes: [],
    ...overrides,
  };
}

function asset(id: string, questionId: string, source: string, hash: string): Asset {
  return {
    asset_id: id,
    question_id: questionId,
    kind: "original-svg",
    src: `/assets/puzzles/${id}.svg`,
    alt: "Clue board",
    source_identity: source,
    source_url: "https://example.test/original",
    creator: "TechVerse",
    license: "CC0-1.0",
    license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    provenance: "Original illustration",
    attribution: "TechVerse",
    width: 960,
    height: 360,
    content_sha256: hash,
  };
}

function bankFor(questions: Question[], assets: Asset[] = []): Bank {
  return {
    sets: [
      {
        set_id: "demo",
        name: "Demo",
        description: "Test set",
        difficulty_min: "easy",
        difficulty_max: "medium",
        themes: ["test"],
      },
    ],
    questions,
    assets,
    generated_at: "2026-10-16",
  };
}

const settings: Settings = { ...DEFAULT_SETTINGS, setId: "demo", questionsPerRound: 2, turnsPerTeam: 1 };

describe("answers and scoring", () => {
  it("accepts aliases, spacing, and punctuation", () => {
    expect(answersMatch("Wi-Fi", ["wifi"])).toBe(true);
    expect(answersMatch("two factor authentication", ["2FA", "two-factor authentication"])).toBe(true);
    expect(answersMatch("mouse", ["keyboard"])).toBe(false);
    expect(answersMatch("   ", ["keyboard"])).toBe(false);
  });

  it("detects answer leaks without flagging short unrelated words", () => {
    expect(textLeaksAnswer("This is a keyboard", "Keyboard")).toBe(true);
    expect(textLeaksAnswer("Rows of switches you press", "Keyboard")).toBe(false);
  });

  it("applies the hint penalty and caps the speed bonus", () => {
    const fast = scoreCorrect({
      points: 100,
      hintsUsed: 0,
      hintPenalty: 15,
      elapsedMs: 0,
      timeLimitMs: 30_000,
      speedBonusMax: 50,
    });
    expect(fast).toEqual({ basePoints: 100, speedBonus: 50, total: 150 });
    const hinted = scoreCorrect({
      points: 100,
      hintsUsed: 3,
      hintPenalty: 40,
      elapsedMs: 15_000,
      timeLimitMs: 30_000,
      speedBonusMax: 50,
    });
    expect(hinted.basePoints).toBe(0);
    expect(hinted.speedBonus).toBe(25);
    expect(hinted.total).toBe(25);
  });
});

describe("selection", () => {
  const questions = [
    question({ question_id: "e1", answer: "Keyboard", game_mode: "term", image_asset_ids: ["a1"], source_identities: ["s1"], asset_hashes: ["h1"] }),
    question({ question_id: "e2", answer: "Mouse", game_mode: "term", image_asset_ids: ["a2"], source_identities: ["s2"], asset_hashes: ["h2"] }),
    question({ question_id: "m1", answer: "Router", game_mode: "term", difficulty: "medium", image_asset_ids: ["a3"], source_identities: ["s3"], asset_hashes: ["h3"] }),
    question({ question_id: "m2", answer: "Browser", game_mode: "term", difficulty: "medium", image_asset_ids: ["a4"], source_identities: ["s1"], asset_hashes: ["h4"] }),
    question({ question_id: "x1", answer: "Expert Only", game_mode: "term", difficulty: "expert", image_asset_ids: ["a5"], source_identities: ["s5"], asset_hashes: ["h5"] }),
  ];
  const assets = [
    asset("a1", "e1", "s1", "h1"),
    asset("a2", "e2", "s2", "h2"),
    asset("a3", "m1", "s3", "h3"),
    asset("a4", "m2", "s1", "h4"),
    asset("a5", "x1", "s5", "h5"),
  ];
  const assetsById = new Map(assets.map((item) => [item.asset_id, item]));

  it("walks easy toward harder without jumping to expert", () => {
    expect(progressionPlan(["easy", "medium"], 4, "progressive")).toEqual(["easy", "easy", "medium", "medium"]);
    const selected = selectRound({
      questions: questions.filter((item) => item.difficulty !== "expert"),
      assetsById,
      setId: "demo",
      mode: "term",
      count: 3,
      progression: "progressive",
      excludeQuestionIds: [],
      excludeAssetIds: [],
      excludeSourceIds: [],
      recentQuestionIds: [],
      previousSequence: [],
      rng: () => 0,
    });
    expect(selected.questions.map((item) => item.difficulty)).toEqual(["easy", "easy", "medium"]);
    expect(selected.questions.some((item) => item.difficulty === "expert")).toBe(false);
  });

  it("does not repeat a question or a source image", () => {
    const selected = selectRound({
      questions: questions.filter((item) => item.question_id !== "x1"),
      assetsById,
      setId: "demo",
      mode: "term",
      count: 4,
      progression: "progressive",
      excludeQuestionIds: ["e1"],
      excludeAssetIds: [],
      excludeSourceIds: [],
      recentQuestionIds: [],
      previousSequence: [],
      rng: () => 0,
    });
    const ids = selected.questions.map((item) => item.question_id);
    expect(ids).not.toContain("e1");
    expect(ids).not.toContain("m2");
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("session", () => {
  const term = [
    question({
      question_id: "t1",
      answer: "Keyboard",
      accepted_answers: ["Keyboard", "keys"],
      game_mode: "term",
      image_asset_ids: ["p1"],
      source_identities: ["src-1"],
      asset_hashes: ["hash-1"],
      choice_options: ["Keyboard", "Mouse", "Printer", "Speaker"],
    }),
    question({
      question_id: "t2",
      answer: "Mouse",
      game_mode: "term",
      image_asset_ids: ["p2"],
      source_identities: ["src-2"],
      asset_hashes: ["hash-2"],
    }),
  ];
  const realai = [
    question({
      question_id: "r1",
      answer: "real",
      accepted_answers: ["real"],
      game_mode: "realai",
      prompt: "How was this picture made?",
      image_asset_ids: ["photo-1"],
      source_identities: ["commons-1"],
      asset_hashes: ["hash-p"],
      time_limit: 20,
    }),
  ];
  const taboo = [
    question({
      question_id: "b1",
      answer: "Laptop",
      game_mode: "taboo",
      forbidden_words: ["computer", "portable", "screen", "notebook"],
      time_limit: 60,
    }),
    question({
      question_id: "b2",
      answer: "Printer",
      game_mode: "taboo",
      forbidden_words: ["paper", "ink", "document", "office"],
      time_limit: 60,
    }),
  ];
  const assets = [asset("p1", "t1", "src-1", "hash-1"), asset("p2", "t2", "src-2", "hash-2"), asset("photo-1", "r1", "commons-1", "hash-p")];
  const bank = bankFor([...term, ...realai, ...taboo], assets);

  function start(extra?: Partial<Settings>) {
    return createSession({
      bank,
      settings: { ...settings, questionsPerRound: 1, ...extra },
      teams: [
        { id: "a", name: "Cyan" },
        { id: "b", name: "Violet" },
      ],
      recentQuestionIds: [],
      previousSequences: {},
      now: 1_000,
      sessionId: "s1",
      rng: () => 0,
    });
  }

  it("scores a correct answer once, then ignores a second submit", () => {
    let session = reduce(start(), { type: "CONTINUE", now: 1_000 }, bank);
    session = reduce(session, { type: "ANSWER", value: "key board", now: 1_500 }, bank);
    const once = teamTotal(session.teams[0]!.roundScores);
    expect(once).toBeGreaterThan(100);
    expect(session.phase).toBe("feedback");
    session = reduce(session, { type: "ANSWER", value: "Keyboard", now: 1_600 }, bank);
    expect(teamTotal(session.teams[0]!.roundScores)).toBe(once);
    expect(session.log).toHaveLength(1);
  });

  it("charges for hints and freezes the clock while paused", () => {
    let session = reduce(start(), { type: "CONTINUE", now: 1_000 }, bank);
    session = reduce(session, { type: "HINT", now: 1_200 }, bank);
    session = reduce(session, { type: "PAUSE", now: 2_000 }, bank);
    expect(questionElapsedMs(session, 9_000)).toBe(1_000);
    session = reduce(session, { type: "RESUME", now: 5_000 }, bank);
    expect(questionElapsedMs(session, 5_500)).toBe(1_500);
    session = reduce(session, { type: "ANSWER", value: "Keyboard", now: 5_500 }, bank);
    expect(session.log[0]?.basePoints).toBe(85);
    expect(session.feedback?.answer).toBe("Keyboard");
  });

  it("blocks extra skips and empty submissions", () => {
    let session = createSession({
      bank,
      settings: { ...settings, questionsPerRound: 2, skipLimit: 1 },
      teams: [{ id: "a", name: "Solo" }],
      recentQuestionIds: [],
      previousSequences: {},
      now: 1_000,
      sessionId: "skip",
      rng: () => 0,
    });
    session = reduce(session, { type: "CONTINUE", now: 1_000 }, bank);
    session = reduce(session, { type: "ANSWER", value: "   ", now: 1_200 }, bank);
    expect(session.phase).toBe("question");
    session = reduce(session, { type: "SKIP", now: 1_300 }, bank);
    expect(session.phase).toBe("feedback");
    session = reduce(session, { type: "CONTINUE", now: 1_400 }, bank);
    session = reduce(session, { type: "SKIP", now: 1_500 }, bank);
    expect(currentQuestion(session)?.question_id).toBe("t2");
    expect(session.phase).toBe("question");
  });

  it("plays all three rounds and rotates taboo turns without double penalties", () => {
    let session = start({ questionsPerRound: 2, tabooSeconds: 30 });
    session = reduce(session, { type: "CONTINUE", now: 1_000 }, bank);
    session = reduce(session, { type: "ANSWER", value: "Keyboard", now: 2_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 3_000 }, bank);
    expect(session.teams[1]?.id).toBe("b");
    session = reduce(session, { type: "ANSWER", value: "nope", now: 4_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 5_000 }, bank);
    expect(session.phase).toBe("round-summary");
    session = reduce(session, { type: "CONTINUE", now: 6_000 }, bank);
    expect(session.phase).toBe("round-intro");
    session = reduce(session, { type: "CONTINUE", now: 7_000 }, bank);
    session = reduce(session, { type: "ANSWER", value: "real", now: 8_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 9_000 }, bank);
    expect(session.phase).toBe("round-summary");
    session = reduce(session, { type: "CONTINUE", now: 10_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 11_000 }, bank);
    session = reduce(session, { type: "READY", now: 12_000 }, bank);
    session = reduce(session, { type: "FORBIDDEN", now: 13_000 }, bank);
    session = reduce(session, { type: "FORBIDDEN", now: 13_200 }, bank);
    const penalties = session.log.filter((entry) => entry.outcome === "forbidden");
    expect(penalties).toHaveLength(1);
    expect(penalties[0]?.pointsDelta).toBe(-25);
    session = reduce(session, { type: "ANSWER", value: "", now: 14_000 }, bank);
    expect(session.phase).toBe("round-summary");
    session = reduce(session, { type: "CONTINUE", now: 15_000 }, bank);
    expect(session.phase).toBe("results");
    expect(session.seenQuestionIds.length).toBeGreaterThanOrEqual(4);
  });

  it("ends a taboo turn on the clock and hands the device to the next team", () => {
    let session = start({ questionsPerRound: 2, tabooSeconds: 10, turnsPerTeam: 1 });
    session = reduce(session, { type: "CONTINUE", now: 1_000 }, bank);
    session = reduce(session, { type: "ANSWER", value: "Keyboard", now: 2_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 3_000 }, bank);
    session = reduce(session, { type: "ANSWER", value: "nope", now: 4_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 5_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 6_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 7_000 }, bank);
    session = reduce(session, { type: "ANSWER", value: "real", now: 8_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 9_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 10_000 }, bank);
    session = reduce(session, { type: "CONTINUE", now: 11_000 }, bank);
    session = reduce(session, { type: "READY", now: 12_000 }, bank);
    expect(turnElapsedMs(session, 22_500)).toBe(10_500);
    session = reduce(session, { type: "TIMEOUT", now: 22_500 }, bank);
    expect(session.phase).toBe("turn-handoff");
    expect(session.tabooTeamIndex).toBe(1);
    session = reduce(session, { type: "TIMEOUT", now: 22_600 }, bank);
    expect(session.log.filter((entry) => entry.outcome === "timeout")).toHaveLength(1);
  });

  it("draws a different rematch when unseen questions remain", () => {
    const rich = bankFor(
      ["Alpha", "Bravo", "Charlie", "Delta"].map((answer, index) =>
        question({
          question_id: `q${index}`,
          answer,
          game_mode: "term",
          image_asset_ids: [`asset-${index}`],
          source_identities: [`source-${index}`],
          asset_hashes: [`hash-${index}`],
        }),
      ),
      [0, 1, 2, 3].map((index) => asset(`asset-${index}`, `q${index}`, `source-${index}`, `hash-${index}`)),
    );
    const first = createSession({
      bank: rich,
      settings: { ...settings, questionsPerRound: 2 },
      teams: [{ id: "a", name: "Solo" }],
      recentQuestionIds: [],
      previousSequences: {},
      now: 50,
      sessionId: "first",
      rng: () => 0,
    });
    const played = {
      ...reduce(first, { type: "CONTINUE", now: 100 }, rich),
    };
    const seen = played.seenQuestionIds;
    const again = rematchSession(played, rich, 500, seen, { term: seen }, () => 0);
    expect(again.queue.map((item) => item.question_id)).not.toEqual(seen);
    expect(again.queue.every((item) => !seen.includes(item.question_id))).toBe(true);
  });
});
