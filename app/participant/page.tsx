"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

/* ---------- Types ---------- */

interface QuizSet {
  id: string;
  name: string;
}

interface QuizRound {
  id: string;
  name: string;
}

interface PublicQuestion {
  id: string;
  setId: string;
  roundId: string;
  text: string;
  marks: number;
  timer: number;
  imageUrl: string;
  options?: string[];
  emojiClue?: string;
  targetWord?: string;
  tabooWords?: string[];
  cardReference?: string;
}

interface PublicQuiz {
  sets: QuizSet[];
  rounds: QuizRound[];
  questions: PublicQuestion[];
}

interface LeaderboardEntry {
  rank: number;
  teamName: string;
  setId: string;
  setName: string;
  roundScores: Record<string, number>;
  totalScore: number;
  questionsAnswered: number;
}

const ROUND_BLURBS: Record<string, string> = {
  "ai quick q&a": "Fast-paced AI definitions and core concepts. Submit one-word answers before time runs out.",
  "emoji tech guess": "Inspect the emoji sequence and decode the matching technology term.",
  "tech taboo": "Describe the tech term without uttering any of the prohibited words!",
};

type Screen = "setup" | "rounds" | "quiz" | "results";

interface SavedAnswer {
  answer: string;
  correct: boolean;
  points: number;
  timedOut: boolean;
  unverified?: boolean;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/* ---------- Shared styles ---------- */

const inputClass =
  "w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300";
const primaryBtn =
  "rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40";
const ghostBtn =
  "rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-neutral-100 transition hover:border-violet-400 hover:text-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
const cardClass = "rounded-2xl border border-white/10 bg-white/[0.03]";
const eyebrow = "font-mono text-xs uppercase tracking-[0.2em]";

export default function ParticipantPage() {
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [loadError, setLoadError] = useState<string>("");
  const [loadTick, setLoadTick] = useState<number>(0);
  const [checking, setChecking] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<string>("");
  const checkingRef = useRef<boolean>(false);
  const [screen, setScreen] = useState<Screen>("setup");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [setupError, setSetupError] = useState<string>("");

  const [saved, setSaved] = useState<Record<string, SavedAnswer>>({});
  const [activeRoundId, setActiveRoundId] = useState<string>("");
  const [qIndex, setQIndex] = useState<number>(0);
  const [input, setInput] = useState<string>("");
  const [locked, setLocked] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomImage(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Leaderboard modal state
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState<boolean>(false);

  // Live game synchronization state from host
  const [liveState, setLiveState] = useState<{
    activeSetId: string;
    activeRoundId: string;
    currentQuestionIndex: number;
    timerRunning: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function syncGame() {
      try {
        const res = await fetch("/api/game-state", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          gameState?: {
            activeSetId: string;
            activeRoundId: string;
            currentQuestionIndex: number;
            timerRunning: boolean;
          };
        } | null;
        if (!cancelled && res.ok && data?.gameState) {
          setLiveState(data.gameState);
        }
      } catch {
        // ignore
      }
    }
    syncGame();
    const interval = setInterval(syncGame, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Load sets, rounds and safe questions from API
  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    fetch("/api/quiz", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as (PublicQuiz & { error?: string }) | null;
        if (!res.ok || !data || !Array.isArray(data.sets)) {
          throw new Error(data?.error ?? `Could not load questions (HTTP ${res.status}).`);
        }
        if (!cancelled) setQuiz(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load questions.");
      });
    return () => {
      cancelled = true;
    };
  }, [loadTick]);

  const sets = quiz?.sets ?? [];
  const rounds = quiz?.rounds ?? [];
  const selectedSet = sets.find((s) => s.id === selectedSetId);
  const questions = useMemo(
    () => (quiz && selectedSetId ? quiz.questions.filter((q) => q.setId === selectedSetId) : []),
    [quiz, selectedSetId],
  );

  const roundNameOf = (roundId: string) => rounds.find((r) => r.id === roundId)?.name ?? "";
  const isEmojiRound = (q: PublicQuestion) =>
    roundNameOf(q.roundId).trim().toLowerCase().includes("emoji") || Boolean(q.emojiClue);
  const isTabooRound = (q: PublicQuestion) =>
    roundNameOf(q.roundId).trim().toLowerCase().includes("taboo") || Boolean(q.tabooWords && q.tabooWords.length > 0);
  const blurbFor = (name: string) => ROUND_BLURBS[name.trim().toLowerCase()] ?? "Answer the questions in this round.";
  const countInSet = (setId: string) => quiz?.questions.filter((q) => q.setId === setId).length ?? 0;

  const questionsOf = (roundId: string) => questions.filter((q) => q.roundId === roundId);
  const isRoundComplete = (roundId: string) => {
    const qs = questionsOf(roundId);
    return qs.length > 0 && qs.every((q) => saved[q.id]);
  };
  const roundScore = (roundId: string) =>
    questionsOf(roundId).reduce((sum, q) => sum + (saved[q.id]?.points ?? 0), 0);
  const roundMax = (roundId: string) => questionsOf(roundId).reduce((sum, q) => sum + q.marks, 0);

  const totalScore = questions.reduce((sum, q) => sum + (saved[q.id]?.points ?? 0), 0);
  const totalMax = questions.reduce((sum, q) => sum + q.marks, 0);
  const playableRounds = rounds.filter((r) => questionsOf(r.id).length > 0);
  const allComplete = playableRounds.length > 0 && playableRounds.every((r) => isRoundComplete(r.id));

  const activeRound = rounds.find((r) => r.id === activeRoundId);
  const roundQuestions = questionsOf(activeRoundId);
  const currentQuestion: PublicQuestion | undefined = roundQuestions[qIndex];

  // Timer countdown
  useEffect(() => {
    if (screen !== "quiz" || locked) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [screen, locked, qIndex, activeRoundId]);

  useEffect(() => {
    if (screen === "quiz" && !locked && timeLeft <= 0 && currentQuestion) {
      lockAnswer(true);
    }
  });

  async function fetchLeaderboard() {
    setLoadingLb(true);
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { leaderboard?: LeaderboardEntry[] } | null;
      if (res.ok && data?.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch {
      // ignore
    } finally {
      setLoadingLb(false);
    }
  }

  function openLeaderboard() {
    setShowLeaderboard(true);
    fetchLeaderboard();
  }

  async function lockAnswer(timedOut: boolean) {
    if (!currentQuestion || locked || checkingRef.current) return;
    if (saved[currentQuestion.id]) {
      setLocked(true);
      return;
    }

    const q = currentQuestion;
    const answer = input.trim();
    checkingRef.current = true;
    setChecking(true);
    setCheckError("");

    let correct = false;
    let earnedPoints = 0;
    let unverified = false;

    if (answer !== "") {
      try {
        const res = await fetch("/api/quiz/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: q.id,
            answer,
            teamName: teamName || "Anonymous",
            setId: selectedSetId,
          }),
        });
        const data = (await res.json().catch(() => null)) as { correct?: boolean; points?: number; duplicate?: boolean; error?: string } | null;
        if (!res.ok || typeof data?.correct !== "boolean") {
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        correct = data.correct;
        earnedPoints = typeof data.points === "number" ? data.points : correct ? q.marks : 0;
      } catch {
        if (!timedOut) {
          setCheckError("Could not submit answer. Please try again.");
          checkingRef.current = false;
          setChecking(false);
          return;
        }
        unverified = true;
      }
    }

    setSaved((prev) =>
      prev[q.id]
        ? prev
        : { ...prev, [q.id]: { answer, correct, points: earnedPoints, timedOut, unverified } },
    );
    setLocked(true);
    checkingRef.current = false;
    setChecking(false);
  }

  function openQuestion(qs: PublicQuestion[], index: number) {
    setCheckError("");
    setQIndex(index);
    setInput("");
    setLocked(false);
    setTimeLeft(qs[index].timer);
  }

  function continueFromSetup(e: FormEvent) {
    e.preventDefault();
    if (!selectedSetId) {
      setSetupError("Please choose a question set.");
      return;
    }
    if (!teamName.trim()) {
      setSetupError("Please enter a team name.");
      return;
    }
    setSetupError("");
    setTeamName(teamName.trim());
    setScreen("rounds");
  }

  function startRound(roundId: string) {
    const qs = questionsOf(roundId);
    const firstOpen = qs.findIndex((q) => !saved[q.id]);
    if (firstOpen === -1) return;
    setActiveRoundId(roundId);
    openQuestion(qs, firstOpen);
    setScreen("quiz");
  }

  function nextQuestion() {
    const next = qIndex + 1;
    if (next >= roundQuestions.length) {
      setScreen(allComplete ? "results" : "rounds");
      return;
    }
    openQuestion(roundQuestions, next);
  }

  function startOver() {
    setSaved({});
    setActiveRoundId("");
    setQIndex(0);
    setInput("");
    setLocked(false);
    setSelectedSetId("");
    setTeamName("");
    setSetupError("");
    setScreen("setup");
  }

  /* ----- Screens ----- */

  const loadingScreen = (
    <div className={`${cardClass} p-6`}>
      {loadError ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm text-red-300">
            {loadError}
          </p>
          <button type="button" className={ghostBtn} onClick={() => setLoadTick((t) => t + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <p className="text-sm text-neutral-400" role="status">
          Loading question sets...
        </p>
      )}
    </div>
  );

  const setupScreen = (
    <form onSubmit={continueFromSetup} className="space-y-10">
      <section aria-labelledby="sets-heading">
        <h2 id="sets-heading" className="text-2xl font-bold tracking-tight">
          1. Choose a question set
        </h2>
        {sets.length === 0 && (
          <p className="mt-5 text-sm text-neutral-400">
            No question sets are available yet. The host will load them shortly.
          </p>
        )}
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sets.map((set) => {
            const active = set.id === selectedSetId;
            return (
              <li key={set.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (set.id !== selectedSetId) {
                      setSaved({});
                    }
                    setSelectedSetId(set.id);
                    setSetupError("");
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${active
                    ? "border-cyan-300 bg-cyan-300/10"
                    : "border-white/10 bg-white/[0.03] hover:border-violet-400/60"
                    }`}
                >
                  <span className={`${eyebrow} text-neutral-500`}>Question set</span>
                  <span className="mt-2 block text-xl font-bold tracking-tight">{set.name}</span>
                  <span className="mt-2 block font-mono text-xs text-violet-300">
                    {countInSet(set.id)} questions
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="team-heading">
        <h2 id="team-heading" className="text-2xl font-bold tracking-tight">
          2. Enter your team name
        </h2>
        <p className="mt-2 text-sm text-neutral-400">No registration needed. This name appears on the live projector leaderboard.</p>
        <label htmlFor="team-name" className="sr-only">
          Team name
        </label>
        <input
          id="team-name"
          className={`${inputClass} mt-4 max-w-md`}
          placeholder="e.g. Code Ninjas"
          maxLength={40}
          value={teamName}
          onChange={(e) => {
            setTeamName(e.target.value);
            setSetupError("");
          }}
        />
      </section>

      {setupError && (
        <p role="alert" className="text-sm text-red-300">
          {setupError}
        </p>
      )}
      <button type="submit" className={primaryBtn}>
        Continue to rounds
      </button>
    </form>
  );

  const roundsScreen = (
    <div className="space-y-8">
      <div className={`${cardClass} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <p className={`${eyebrow} text-neutral-500`}>Team</p>
          <p className="text-xl font-bold">{teamName}</p>
        </div>
        <div className="sm:text-right">
          <p className={`${eyebrow} text-neutral-500`}>Question set</p>
          <p className="text-xl font-bold text-cyan-300">
            {selectedSet?.name}
          </p>
        </div>
        <button type="button" onClick={openLeaderboard} className={ghostBtn}>
          🏆 Live Leaderboard
        </button>
      </div>

      {liveState && liveState.activeRoundId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/40 bg-cyan-400/10 p-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <p className="text-xs font-mono uppercase text-cyan-300 font-bold">Host Live Round in Progress</p>
              <p className="text-sm font-semibold text-white">
                Host is on: {roundNameOf(liveState.activeRoundId)} — Question {liveState.currentQuestionIndex + 1}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const qs = questionsOf(liveState.activeRoundId);
              if (qs.length > 0) {
                setActiveRoundId(liveState.activeRoundId);
                const idx = Math.min(liveState.currentQuestionIndex, qs.length - 1);
                openQuestion(qs, idx);
                setScreen("quiz");
              }
            }}
            className={primaryBtn}
          >
            Follow Host Question →
          </button>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-3">
        {rounds.map((round, i) => {
          const complete = isRoundComplete(round.id);
          const answered = questionsOf(round.id).filter((q) => saved[q.id]).length;
          const total = questionsOf(round.id).length;
          return (
            <li key={round.id} className={`${cardClass} flex flex-col p-5`}>
              <div className="flex items-center justify-between">
                <span className={`${eyebrow} text-cyan-300`}>Round {i + 1}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${complete ? "bg-cyan-300/15 text-cyan-300" : "bg-white/5 text-neutral-400"
                    }`}
                >
                  {complete ? "Completed" : answered > 0 ? "In progress" : "Not started"}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight">{round.name}</h3>
              <p className="mt-2 flex-1 text-sm text-neutral-400">{blurbFor(round.name)}</p>
              <p className="mt-4 font-mono text-xs text-neutral-500">
                {answered} of {total} answered · Score: {roundScore(round.id)}/{roundMax(round.id)}
              </p>
              <button
                type="button"
                className={`${complete ? ghostBtn : primaryBtn} mt-4`}
                disabled={complete || total === 0}
                onClick={() => startRound(round.id)}
              >
                {total === 0
                  ? "No questions yet"
                  : complete
                    ? "Round finished"
                    : answered > 0
                      ? "Resume round"
                      : "Start round"}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3">
        <button type="button" className={allComplete ? primaryBtn : ghostBtn} onClick={() => setScreen("results")}>
          View results
        </button>
        <button type="button" className={ghostBtn} onClick={startOver}>
          Change set or team
        </button>
      </div>
    </div>
  );

  const quizScreen = currentQuestion && activeRound && (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`${eyebrow} text-cyan-300`}>{activeRound.name}</p>
          <p className="mt-1 text-sm text-neutral-400">
            Question {qIndex + 1} of {roundQuestions.length} · {currentQuestion.marks} marks
          </p>
        </div>
        <div
          className={`rounded-xl border px-4 py-2 font-mono text-2xl font-bold tabular-nums ${locked
            ? "border-white/10 text-neutral-500"
            : timeLeft <= 5
              ? "border-red-400/50 text-red-300"
              : "border-cyan-300/40 text-cyan-300"
            }`}
          role="timer"
          aria-label="Time left"
        >
          {formatTime(timeLeft)}
        </div>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={roundQuestions.length}
        aria-valuenow={qIndex + (locked ? 1 : 0)}
        aria-label="Round progress"
      >
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
          style={{ width: `${((qIndex + (locked ? 1 : 0)) / roundQuestions.length) * 100}%` }}
        />
      </div>

      <div className={`${cardClass} space-y-6 p-5 sm:p-8`}>
        {/* Round 2 — Emoji Tech Guess */}
        {isEmojiRound(currentQuestion) ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.04] p-6 text-center shadow-lg">
              <span className="rounded-md bg-cyan-400/20 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
                Round 2 — Emoji Tech Guess
              </span>
              <p className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-widest py-3 select-none">
                {currentQuestion.emojiClue || currentQuestion.text}
              </p>
              <p className="mt-2 text-xs text-neutral-400 font-mono">
                Decode the technology term represented by this emoji sequence
              </p>
            </div>
          </div>
        ) : isTabooRound(currentQuestion) ? (
          /* Round 3 — Tech Taboo */
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-2.5">
              <span className="rounded-md bg-red-500/20 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-red-300">
                Round 3 — Tech Taboo Card
              </span>
              {(currentQuestion.cardReference || currentQuestion.imageUrl) && (
                <button
                  type="button"
                  onClick={() => setZoomImage(currentQuestion.cardReference || currentQuestion.imageUrl)}
                  className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-cyan-300 transition"
                >
                  <span>View original card</span>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5m-7 11l-5 5m0 0h4m-4 0v-4m16 4v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </button>
              )}
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-400">Target Tech Word:</span>
              <h3 className="text-3xl font-black text-cyan-300 tracking-tight mt-0.5">
                {currentQuestion.targetWord || currentQuestion.text}
              </h3>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-red-400 font-bold mb-2">
                🚫 Forbidden Words (You cannot say these!):
              </p>
              <div className="flex flex-wrap gap-2">
                {currentQuestion.tabooWords && currentQuestion.tabooWords.length > 0 ? (
                  currentQuestion.tabooWords.map((w) => (
                    <span key={w} className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1 font-mono text-sm font-bold text-red-200">
                      🚫 {w}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500">None configured</span>
                )}
              </div>
            </div>
            {(currentQuestion.cardReference || currentQuestion.imageUrl) && (
              <div
                className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900 cursor-zoom-in"
                onClick={() => setZoomImage(currentQuestion.cardReference || currentQuestion.imageUrl)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentQuestion.cardReference || currentQuestion.imageUrl}
                  alt="Taboo card visual"
                  className="mx-auto max-h-40 w-full object-contain"
                />
              </div>
            )}
          </div>
        ) : (
          /* Round 1 — AI Quick Q&A */
          <div className="space-y-3">
            <span className="inline-block rounded bg-violet-500/20 px-2.5 py-0.5 font-mono text-xs font-semibold text-violet-300">
              Round 1 — AI Quick Q&A
            </span>
            <h2 className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{currentQuestion.text}</h2>
          </div>
        )}

        {/* Visual attachment if present (for non-taboo or custom questions) */}
        {currentQuestion.imageUrl && !isTabooRound(currentQuestion) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium uppercase tracking-wider text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                Visual Attached
              </span>
              <button
                type="button"
                onClick={() => setZoomImage(currentQuestion.imageUrl)}
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400 transition hover:text-cyan-300"
              >
                <span>Tap to expand</span>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5m-7 11l-5 5m0 0h4m-4 0v-4m16 4v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
            </div>
            <div
              className="cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-neutral-900 transition hover:border-cyan-400/40"
              onClick={() => setZoomImage(currentQuestion.imageUrl)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentQuestion.imageUrl}
                alt="Question visual"
                className="mx-auto max-h-80 w-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Answer input */}
        {currentQuestion.options && currentQuestion.options.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Multiple choice options">
            {currentQuestion.options.map((option) => {
              const active = input === option;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={locked || checking}
                  aria-pressed={active}
                  onClick={() => setInput(option)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed ${active
                    ? "border-cyan-300 bg-cyan-300/10 text-cyan-200"
                    : "border-white/10 bg-neutral-900 hover:border-violet-400/60"
                    } ${locked && !active ? "opacity-50" : ""}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <label htmlFor="answer" className="sr-only">
              Your answer
            </label>
            <input
              id="answer"
              className={inputClass}
              placeholder={
                isEmojiRound(currentQuestion)
                  ? "Type the technology term (e.g. Cloud Computing)..."
                  : isTabooRound(currentQuestion)
                    ? "Type the target word to submit..."
                    : "Type your one-word AI answer..."
              }
              autoComplete="off"
              disabled={locked || checking}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !locked && !checking && input.trim()) {
                  e.preventDefault();
                  lockAnswer(false);
                }
              }}
            />
          </div>
        )}

        {locked ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4">
            <div>
              <p className={`text-base font-semibold ${saved[currentQuestion.id]?.correct ? "text-cyan-300" : "text-amber-300"}`} role="status">
                {saved[currentQuestion.id]?.correct
                  ? `✓ Correct! +${saved[currentQuestion.id]?.points} marks awarded`
                  : saved[currentQuestion.id]?.timedOut
                    ? "⏱ Time expired. Submission recorded."
                    : "✗ Answer recorded."}
              </p>
              <p className="text-xs text-neutral-400">Score permanently saved to database.</p>
            </div>
            <button type="button" className={primaryBtn} onClick={nextQuestion}>
              {qIndex + 1 >= roundQuestions.length
                ? allComplete
                  ? "See results"
                  : "Finish round"
                : "Next question"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {checkError && (
              <p className="text-sm text-red-300" role="alert">
                {checkError}
              </p>
            )}
            <button
              type="button"
              className={primaryBtn}
              disabled={!input.trim() || checking}
              onClick={() => lockAnswer(false)}
            >
              {checking ? "Verifying..." : "Submit Answer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const resultsScreen = (
    <div className="space-y-8">
      <div className={`${cardClass} p-6 text-center sm:p-10`}>
        <p className={`${eyebrow} text-neutral-500`}>{teamName}</p>
        <p className="mt-4 bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-7xl font-black tracking-tighter text-transparent sm:text-8xl">
          {totalScore}
        </p>
        <p className="mt-2 text-neutral-400">out of {totalMax} points possible</p>
        <p
          className={`mt-5 inline-block rounded-full px-4 py-1 font-mono text-xs uppercase tracking-widest ${allComplete ? "bg-cyan-300/15 text-cyan-300" : "bg-violet-400/15 text-violet-300"
            }`}
        >
          {allComplete ? "All rounds completed" : "Some questions remaining"}
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {rounds.map((round) => {
          const complete = isRoundComplete(round.id);
          return (
            <li key={round.id} className={`${cardClass} p-5`}>
              <p className="text-lg font-bold tracking-tight">{round.name}</p>
              <p className="mt-3 font-mono text-3xl font-bold text-cyan-300">
                {roundScore(round.id)}
                <span className="text-base text-neutral-500"> / {roundMax(round.id)}</span>
              </p>
              <p className="mt-2 text-xs text-neutral-400">{complete ? "Completed" : "Not finished"}</p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3">
        <button type="button" className={primaryBtn} onClick={openLeaderboard}>
          🏆 View Live Leaderboard
        </button>
        <button type="button" className={ghostBtn} onClick={() => setScreen("rounds")}>
          Back to rounds
        </button>
        <button type="button" className={ghostBtn} onClick={startOver}>
          Start over
        </button>
      </div>
    </div>
  );

  const titles: Record<Screen, string> = {
    setup: "Join the game",
    rounds: "Your rounds",
    quiz: "Quiz in progress",
    results: "Your results",
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100">
      <div
        className="pointer-events-none absolute -top-48 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-60 -right-32 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-mono text-sm font-bold tracking-[0.25em] text-white">
            TECH<span className="text-cyan-300">/</span>SCRAMBLE
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openLeaderboard}
              className="rounded-md border border-white/10 px-3 py-1 text-xs font-mono text-neutral-300 transition hover:border-cyan-300 hover:text-cyan-300"
            >
              Leaderboard
            </button>
            <span className={`${eyebrow} text-violet-300`}>Participant</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="mb-8 text-4xl font-black tracking-tight sm:text-5xl">{titles[screen]}</h1>
        {!quiz && loadingScreen}
        {quiz && screen === "setup" && setupScreen}
        {quiz && screen === "rounds" && roundsScreen}
        {quiz && screen === "quiz" && quizScreen}
        {quiz && screen === "results" && resultsScreen}
      </main>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/15 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Live Leaderboard</h2>
                <p className="text-xs text-neutral-400">Current team standings</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {loadingLb ? (
                <p className="py-8 text-center text-sm text-neutral-400">Refreshing scores...</p>
              ) : leaderboard.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">No teams have submitted answers yet. Be the first!</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.teamName}
                      className={`flex items-center justify-between py-3 px-2 rounded-lg ${entry.teamName.toLowerCase() === teamName.toLowerCase() ? "bg-cyan-300/10 border border-cyan-300/30" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold ${entry.rank === 1
                            ? "bg-amber-400 text-black"
                            : entry.rank === 2
                              ? "bg-neutral-300 text-black"
                              : entry.rank === 3
                                ? "bg-amber-700 text-white"
                                : "bg-white/10 text-neutral-300"
                            }`}
                        >
                          {entry.rank}
                        </span>
                        <div>
                          <p className="font-semibold text-white">
                            {entry.teamName}{" "}
                            {entry.teamName.toLowerCase() === teamName.toLowerCase() && (
                              <span className="text-xs text-cyan-300">(You)</span>
                            )}
                          </p>
                          <p className="font-mono text-xs text-neutral-400">{entry.setName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xl font-bold text-cyan-300">{entry.totalScore}</p>
                        <p className="text-[10px] text-neutral-400">{entry.questionsAnswered} answered</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={fetchLeaderboard}
                disabled={loadingLb}
                className={ghostBtn}
              >
                {loadingLb ? "Refreshing..." : "Refresh Scores"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox zoom modal for participant */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setZoomImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[92vh] max-w-[94vw] overflow-hidden rounded-2xl border border-white/20 bg-neutral-950 p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2 font-mono text-xs text-neutral-400">
              <span className="text-cyan-300 font-semibold uppercase tracking-wider">Visual Clue</span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 font-sans text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Close (Esc)
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImage}
              alt="Enlarged visual"
              className="mx-auto max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}