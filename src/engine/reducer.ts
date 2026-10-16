import { answerKeys, answersMatch } from "./answers.ts";
import { hashSeed, mulberry32 } from "./rng.ts";
import { scoreCorrect } from "./scoring.ts";
import { selectRound } from "./select.ts";
import {
  EMPTY_SCORES,
  GAME_MODES,
  type Bank,
  type Feedback,
  type GameMode,
  type LogEntry,
  type Question,
  type Session,
  type Settings,
  type Team,
  type TeamDraft,
} from "./types.ts";

export type Action =
  | { type: "CONTINUE"; now: number }
  | { type: "ANSWER"; value: string; now: number }
  | { type: "HINT"; now: number }
  | { type: "SKIP"; now: number }
  | { type: "FORBIDDEN"; now: number }
  | { type: "TIMEOUT"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "END"; now: number }
  | { type: "READY"; now: number };

const FORBIDDEN_DEBOUNCE_MS = 500;

export function questionElapsedMs(session: Session, now: number): number {
  if (session.questionStartedAt == null) return 0;
  const end = session.status === "paused" && session.pausedAt != null ? session.pausedAt : now;
  return Math.max(0, end - session.questionStartedAt - session.pauseAccumMs);
}

export function turnElapsedMs(session: Session, now: number): number {
  if (session.tabooTurnStartedAt == null) return 0;
  const end = session.status === "paused" && session.pausedAt != null ? session.pausedAt : now;
  return Math.max(0, end - session.tabooTurnStartedAt - session.tabooPauseAccumMs);
}

export function currentQuestion(session: Session): Question | null {
  if (session.phase !== "question" && session.phase !== "feedback") return null;
  return session.queue[session.queueIndex] ?? null;
}

export function currentMode(session: Session): GameMode {
  return session.roundOrder[session.roundIndex] ?? "term";
}

export function activeTeam(session: Session): Team {
  const index = currentMode(session) === "taboo" ? session.tabooTeamIndex : session.activeTeamIndex;
  return session.teams[index] ?? session.teams[0]!;
}

export interface CreateInput {
  bank: Bank;
  settings: Settings;
  teams: TeamDraft[];
  recentQuestionIds: string[];
  previousSequences: Partial<Record<GameMode, string[]>>;
  now: number;
  sessionId?: string;
  rng?: () => number;
}

export function createSession(input: CreateInput): Session {
  const sessionId = input.sessionId ?? `session-${input.now}`;
  const rng = input.rng ?? mulberry32(hashSeed(sessionId));
  const teams: Team[] = input.teams.map((team) => ({
    id: team.id,
    name: team.name.trim(),
    roundScores: { ...EMPTY_SCORES },
  }));
  const base: Session = {
    id: sessionId,
    settings: input.settings,
    teams,
    phase: "round-intro",
    status: "playing",
    roundOrder: [...GAME_MODES],
    roundIndex: 0,
    activeTeamIndex: 0,
    queue: [],
    queueIndex: 0,
    seenQuestionIds: [],
    seenAssetIds: [],
    seenSourceIds: [],
    hintsRevealed: 0,
    resolved: false,
    skipsThisRound: {},
    questionStartedAt: null,
    pausedAt: null,
    pauseAccumMs: 0,
    feedback: null,
    log: [],
    tabooTurnStartedAt: null,
    tabooPauseAccumMs: 0,
    turnsRemaining: Object.fromEntries(teams.map((team) => [team.id, input.settings.turnsPerTeam])),
    tabooTeamIndex: 0,
    explainerReady: false,
    lastForbiddenAt: 0,
    notice: null,
    rngSeed: hashSeed(sessionId),
    recentQuestionIds: input.recentQuestionIds,
    previousSequences: input.previousSequences,
  };
  return beginRound(base, input.bank, 0, rng);
}

export function reduce(session: Session, action: Action, bank: Bank): Session {
  if (action.type === "END") {
    return { ...markSeen(session), phase: "results", status: "ended", pausedAt: null };
  }
  if (session.status === "ended") return session;
  if (action.type === "PAUSE") {
    if (session.status !== "playing") return session;
    return { ...session, status: "paused", pausedAt: action.now };
  }
  if (action.type === "RESUME") {
    if (session.status !== "paused" || session.pausedAt == null) return session;
    const delta = Math.max(0, action.now - session.pausedAt);
    return {
      ...session,
      status: "playing",
      pausedAt: null,
      pauseAccumMs: session.pauseAccumMs + delta,
      tabooPauseAccumMs: session.tabooPauseAccumMs + delta,
    };
  }
  if (session.status === "paused") return session;

  switch (action.type) {
    case "CONTINUE":
      return continueSession(session, action.now, bank);
    case "READY":
      return readyExplainer(session, action.now);
    case "HINT":
      return revealHint(session);
    case "ANSWER":
      return answerQuestion(session, action.value, action.now);
    case "SKIP":
      return skipQuestion(session, action.now);
    case "FORBIDDEN":
      return forbidQuestion(session, action.now);
    case "TIMEOUT":
      return timeout(session, action.now);
    default: {
      const unreachable: never = action;
      void unreachable;
      return session;
    }
  }
}

function assetIndex(bank: Bank) {
  return new Map(bank.assets.map((asset) => [asset.asset_id, asset]));
}

function beginRound(session: Session, bank: Bank, roundIndex: number, rng: () => number): Session {
  const mode = session.roundOrder[roundIndex] ?? "term";
  const selected = selectRound({
    questions: bank.questions,
    assetsById: assetIndex(bank),
    setId: session.settings.setId,
    mode,
    count: session.settings.questionsPerRound,
    progression: session.settings.progression,
    excludeQuestionIds: session.seenQuestionIds,
    excludeAssetIds: [...session.seenAssetIds, ...session.queue.flatMap((question) => question.asset_hashes)],
    excludeSourceIds: session.seenSourceIds,
    recentQuestionIds: session.recentQuestionIds,
    previousSequence: session.previousSequences[mode] ?? [],
    rng,
  });
  const notices: string[] = [];
  if (selected.stoppedBecause === "exhausted") {
    notices.push(`This round has ${selected.questions.length} fresh questions, fewer than requested.`);
  }
  if (selected.stoppedBecause === "unavailable") {
    notices.push("This round has no eligible questions for the selected difficulty.");
  }
  if (selected.reusedRecent) {
    notices.push("Some questions were seen in an earlier game because unseen ones ran out.");
  }
  if (selected.sameSequence && selected.questions.length > 0) {
    notices.push("This is the only remaining sequence for this round.");
  }
  const empty = selected.questions.length === 0;
  return {
    ...session,
    roundIndex,
    phase: empty ? "round-summary" : "round-intro",
    queue: selected.questions,
    queueIndex: 0,
    hintsRevealed: 0,
    resolved: false,
    feedback: null,
    questionStartedAt: null,
    pauseAccumMs: 0,
    skipsThisRound: {},
    activeTeamIndex: 0,
    tabooTeamIndex: 0,
    explainerReady: false,
    tabooTurnStartedAt: null,
    tabooPauseAccumMs: 0,
    turnsRemaining: Object.fromEntries(session.teams.map((team) => [team.id, session.settings.turnsPerTeam])),
    notice: notices.length > 0 ? notices.join(" ") : null,
    rngSeed: (session.rngSeed + roundIndex + 1) >>> 0,
  };
}

function continueSession(session: Session, now: number, bank: Bank): Session {
  if (session.phase === "round-intro") {
    return presentQuestion({ ...session, queueIndex: 0 }, now);
  }
  if (session.phase === "feedback") {
    return advanceAfterCard(session, now);
  }
  if (session.phase === "turn-handoff") {
    return {
      ...session,
      phase: "question",
      explainerReady: false,
      tabooTurnStartedAt: null,
      tabooPauseAccumMs: 0,
      feedback: null,
      resolved: false,
    };
  }
  if (session.phase === "round-summary") {
    const next = session.roundIndex + 1;
    if (next >= session.roundOrder.length) {
      return { ...session, phase: "results", status: "ended" };
    }
    const rng = mulberry32((session.rngSeed + next * 17) >>> 0);
    return beginRound(session, bank, next, rng);
  }
  return session;
}

function presentQuestion(session: Session, now: number): Session {
  const question = session.queue[session.queueIndex];
  if (!question) return { ...session, phase: "round-summary" };
  const mode = currentMode(session);
  const turnLive = mode === "taboo" && session.explainerReady && session.tabooTurnStartedAt != null;
  return {
    ...markSeen({ ...session, phase: "question" }),
    hintsRevealed: 0,
    resolved: false,
    feedback: mode === "taboo" ? session.feedback : null,
    questionStartedAt: mode === "taboo" ? null : now,
    pauseAccumMs: turnLive ? session.pauseAccumMs : 0,
    explainerReady: turnLive,
  };
}

function markSeen(session: Session): Session {
  const question = session.queue[session.queueIndex];
  if (!question || session.seenQuestionIds.includes(question.question_id)) return session;
  return {
    ...session,
    seenQuestionIds: [...session.seenQuestionIds, question.question_id],
    seenAssetIds: [...new Set([...session.seenAssetIds, ...question.image_asset_ids, ...question.asset_hashes])],
    seenSourceIds: [...new Set([...session.seenSourceIds, ...question.source_identities])],
  };
}

function revealHint(session: Session): Session {
  const question = currentQuestion(session);
  if (!question || session.phase !== "question" || session.resolved) return session;
  if (currentMode(session) !== "term") return session;
  if (session.hintsRevealed >= question.hints.length) return session;
  return { ...session, hintsRevealed: session.hintsRevealed + 1 };
}

function answerQuestion(session: Session, value: string, now: number): Session {
  const question = currentQuestion(session);
  if (!question || session.phase !== "question" || session.resolved) return session;
  const mode = currentMode(session);
  if (mode === "taboo") return scoreTaboo(session, question, "correct", now);
  if (answerKeys(value).length === 0) return session;
  if (questionElapsedMs(session, now) >= question.time_limit * 1000) return timeout(session, now);
  const correct = answersMatch(value, question.accepted_answers);
  if (!correct) return settle(session, question, "wrong", now, { basePoints: 0, speedBonus: 0, penalty: 0 });
  const scored = scoreCorrect({
    points: question.points,
    hintsUsed: session.hintsRevealed,
    hintPenalty: session.settings.hintPenalty,
    elapsedMs: questionElapsedMs(session, now),
    timeLimitMs: question.time_limit * 1000,
    speedBonusMax: session.settings.speedBonusMax,
  });
  return settle(session, question, "correct", now, {
    basePoints: scored.basePoints,
    speedBonus: scored.speedBonus,
    penalty: 0,
  });
}

function skipQuestion(session: Session, now: number): Session {
  const question = currentQuestion(session);
  if (!question || session.phase !== "question" || session.resolved) return session;
  const team = activeTeam(session);
  const used = session.skipsThisRound[team.id] ?? 0;
  if (used >= session.settings.skipLimit) return session;
  const mode = currentMode(session);
  const next: Session = {
    ...session,
    skipsThisRound: { ...session.skipsThisRound, [team.id]: used + 1 },
  };
  if (mode === "taboo") {
    if (!session.explainerReady) return session;
    return scoreTaboo(next, question, "skip", now);
  }
  return settle(next, question, "skip", now, { basePoints: 0, speedBonus: 0, penalty: 0 });
}

function forbidQuestion(session: Session, now: number): Session {
  const question = currentQuestion(session);
  if (!question || session.phase !== "question" || currentMode(session) !== "taboo") return session;
  if (!session.explainerReady) return session;
  if (now - session.lastForbiddenAt < FORBIDDEN_DEBOUNCE_MS) return session;
  const penalized = { ...session, lastForbiddenAt: now };
  return scoreTaboo(penalized, question, "forbidden", now);
}

function timeout(session: Session, now: number): Session {
  if (session.phase !== "question" || session.resolved) return session;
  const mode = currentMode(session);
  if (mode === "taboo") {
    if (!session.explainerReady || session.tabooTurnStartedAt == null) return session;
    if (turnElapsedMs(session, now) < session.settings.tabooSeconds * 1000) return session;
    return endTabooTurn(session, now);
  }
  const question = currentQuestion(session);
  if (!question) return session;
  if (questionElapsedMs(session, now) < question.time_limit * 1000) return session;
  return settle(session, question, "timeout", now, { basePoints: 0, speedBonus: 0, penalty: 0 });
}

function settle(
  session: Session,
  question: Question,
  outcome: LogEntry["outcome"],
  now: number,
  points: { basePoints: number; speedBonus: number; penalty: number },
): Session {
  const delta = points.basePoints + points.speedBonus + points.penalty;
  const team = activeTeam(session);
  const feedback: Feedback = {
    outcome,
    pointsDelta: delta,
    answer: question.answer,
    explanation: question.explanation,
    questionId: question.question_id,
    speedBonus: points.speedBonus,
  };
  return {
    ...addScore(session, team.id, currentMode(session), delta),
    resolved: true,
    phase: "feedback",
    feedback,
    log: [
      ...session.log,
      {
        mode: currentMode(session),
        teamId: team.id,
        questionId: question.question_id,
        outcome,
        pointsDelta: delta,
        basePoints: points.basePoints,
        speedBonus: points.speedBonus,
        penalty: points.penalty,
        difficulty: question.difficulty,
        at: now,
      },
    ],
  };
}

function scoreTaboo(
  session: Session,
  question: Question,
  outcome: "correct" | "skip" | "forbidden",
  now: number,
): Session {
  if (!session.explainerReady || session.tabooTurnStartedAt == null) return session;
  if (turnElapsedMs(session, now) >= session.settings.tabooSeconds * 1000) return endTabooTurn(session, now);
  const team = activeTeam(session);
  const penalty = outcome === "forbidden" ? -Math.abs(session.settings.tabooPenalty) : 0;
  const basePoints = outcome === "correct" ? question.points : 0;
  const delta = basePoints + penalty;
  const feedback: Feedback = {
    outcome,
    pointsDelta: delta,
    answer: question.answer,
    explanation: question.explanation,
    questionId: question.question_id,
    speedBonus: 0,
  };
  const scored: Session = {
    ...addScore(session, team.id, "taboo", delta),
    feedback,
    log: [
      ...session.log,
      {
        mode: "taboo",
        teamId: team.id,
        questionId: question.question_id,
        outcome,
        pointsDelta: delta,
        basePoints,
        speedBonus: 0,
        penalty,
        difficulty: question.difficulty,
        at: now,
      },
    ],
  };
  return advanceTabooCard(scored, now);
}

function advanceTabooCard(session: Session, now: number): Session {
  const nextIndex = session.queueIndex + 1;
  if (nextIndex >= session.queue.length) {
    return { ...session, queueIndex: nextIndex, phase: "round-summary", resolved: true, explainerReady: false };
  }
  return presentQuestion({ ...session, queueIndex: nextIndex, tabooTurnStartedAt: session.tabooTurnStartedAt }, now);
}

function advanceAfterCard(session: Session, now: number): Session {
  const nextIndex = session.queueIndex + 1;
  if (nextIndex >= session.queue.length) {
    return { ...session, queueIndex: nextIndex, phase: "round-summary", feedback: session.feedback };
  }
  const stepped = { ...session, queueIndex: nextIndex, activeTeamIndex: (session.activeTeamIndex + 1) % session.teams.length };
  return presentQuestion(stepped, now);
}

function readyExplainer(session: Session, now: number): Session {
  if (session.phase !== "question" || currentMode(session) !== "taboo") return session;
  if (session.explainerReady) return session;
  const team = activeTeam(session);
  if ((session.turnsRemaining[team.id] ?? 0) <= 0) return session;
  return {
    ...markSeen(session),
    explainerReady: true,
    tabooTurnStartedAt: now,
    tabooPauseAccumMs: 0,
    resolved: false,
  };
}

function endTabooTurn(session: Session, now: number): Session {
  const question = session.queue[session.queueIndex];
  const team = activeTeam(session);
  const turnsRemaining = {
    ...session.turnsRemaining,
    [team.id]: Math.max(0, (session.turnsRemaining[team.id] ?? 0) - 1),
  };
  let log = session.log;
  if (question && session.explainerReady && !session.log.some((entry) => entry.questionId === question.question_id && entry.outcome === "timeout")) {
    log = [
      ...session.log,
      {
        mode: "taboo" as const,
        teamId: team.id,
        questionId: question.question_id,
        outcome: "timeout" as const,
        pointsDelta: 0,
        basePoints: 0,
        speedBonus: 0,
        penalty: 0,
        difficulty: question.difficulty,
        at: now,
      },
    ];
  }
  const burned: Session = question
    ? { ...markSeen({ ...session, log }), queueIndex: session.queueIndex + 1 }
    : { ...session, log };
  const withTurns = { ...burned, turnsRemaining, explainerReady: false, tabooTurnStartedAt: null, resolved: true };
  if (withTurns.queueIndex >= withTurns.queue.length) {
    return { ...withTurns, phase: "round-summary" };
  }
  const nextTeam = nextTeamIndex(withTurns);
  if (nextTeam == null) return { ...withTurns, phase: "round-summary" };
  return { ...withTurns, phase: "turn-handoff", tabooTeamIndex: nextTeam, feedback: null };
}

function nextTeamIndex(session: Session): number | null {
  for (let step = 1; step <= session.teams.length; step += 1) {
    const index = (session.tabooTeamIndex + step) % session.teams.length;
    const team = session.teams[index];
    if (team && (session.turnsRemaining[team.id] ?? 0) > 0) return index;
  }
  return null;
}

function addScore(session: Session, teamId: string, mode: GameMode, delta: number): Session {
  return {
    ...session,
    teams: session.teams.map((team) =>
      team.id === teamId ? { ...team, roundScores: { ...team.roundScores, [mode]: team.roundScores[mode] + delta } } : team,
    ),
  };
}

export function rematchSession(
  previous: Session,
  bank: Bank,
  now: number,
  recentQuestionIds: string[],
  previousSequences: Partial<Record<GameMode, string[]>>,
  rng?: () => number,
): Session {
  return createSession({
    bank,
    settings: previous.settings,
    teams: previous.teams.map((team) => ({ id: team.id, name: team.name })),
    recentQuestionIds,
    previousSequences,
    now,
    sessionId: `session-${now}`,
    rng,
  });
}
