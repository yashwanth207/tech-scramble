"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

interface HostQuestion {
  id: string;
  setId: string;
  roundId: string;
  text: string;
  answer: string;
  marks: number;
  timer: number;
  imageUrl: string;
  options?: string[];
  targetWord?: string;
  tabooWords?: string[];
}

interface HostQuiz {
  sets: QuizSet[];
  rounds: QuizRound[];
  questions: HostQuestion[];
}

interface LeaderboardEntry {
  rank: number;
  teamName: string;
  setId: string;
  setName: string;
  roundScores: Record<string, number>;
  totalScore: number;
  questionsAnswered: number;
  lastActive: string;
}

interface ManualScoreEntry {
  id: string;
  teamName: string;
  roundId: string;
  points: number;
  reason: string;
  awardedAt: string;
}

type HostTab = "controller" | "leaderboard" | "taboo";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300";
const primaryBtn =
  "rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40";
const ghostBtn =
  "rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-neutral-100 transition hover:border-violet-400 hover:text-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-40";
const dangerBtn =
  "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20";
const successBtn =
  "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20";
const eyebrow = "font-mono text-xs uppercase tracking-[0.2em]";

export default function HostPage() {
  const [password, setPassword] = useState("");
  const [quiz, setQuiz] = useState<HostQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<HostTab>("controller");
  const [setId, setSetId] = useState("");
  const [roundId, setRoundId] = useState("");
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);

  // Host Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Leaderboard & Manual Scoring
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [manualAwards, setManualAwards] = useState<ManualScoreEntry[]>([]);
  const [scoreTeam, setScoreTeam] = useState("");
  const [scoreRound, setScoreRound] = useState("r3");
  const [scorePoints, setScorePoints] = useState(15);
  const [scoreReason, setScoreReason] = useState("Correct Taboo Guess");
  const [awarding, setAwarding] = useState(false);
  const [awardFeedback, setAwardFeedback] = useState("");

  // Broadcast state changes to /api/game-state
  async function broadcastState(updates: {
    activeSetId?: string;
    activeRoundId?: string;
    currentQuestionIndex?: number;
    timerRunning?: boolean;
    isAnswerRevealed?: boolean;
  }) {
    if (!password) return;
    try {
      await fetch("/api/game-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": password.trim(),
        },
        body: JSON.stringify(updates),
      });
    } catch {
      // non-blocking
    }
  }

  async function load(e?: FormEvent) {
    e?.preventDefault();
    if (!password.trim()) {
      setError("Enter the admin password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quiz", {
        headers: { "x-admin-key": password.trim() },
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as { data?: HostQuiz | null; error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? `Could not load questions (HTTP ${res.status}).`);
        return;
      }
      const data = body?.data ?? { sets: [], rounds: [], questions: [] };
      setQuiz(data);
      const initialSet = data.sets[0]?.id ?? "";
      const initialRound = data.rounds[0]?.id ?? "";
      setSetId(initialSet);
      setRoundId(initialRound);
      setIndex(0);
      setReveal(false);

      const firstQ = data.questions.find((q) => q.setId === initialSet && q.roundId === initialRound);
      if (firstQ) {
        setTimerSeconds(firstQ.timer);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const questions = useMemo(
    () => (quiz ? quiz.questions.filter((q) => q.setId === setId && q.roundId === roundId) : []),
    [quiz, setId, roundId],
  );
  const current: HostQuestion | undefined = questions[index];
  const roundObj = quiz?.rounds.find((r) => r.id === roundId);
  const roundName = roundObj?.name ?? "";
  const isTabooRound = roundName.trim().toLowerCase().includes("taboo");

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  function go(next: number) {
    const target = Math.min(Math.max(next, 0), Math.max(questions.length - 1, 0));
    setIndex(target);
    setReveal(false);
    setTimerRunning(false);
    const q = questions[target];
    if (q) setTimerSeconds(q.timer);
    broadcastState({
      activeSetId: setId,
      activeRoundId: roundId,
      currentQuestionIndex: target,
      isAnswerRevealed: false,
      timerRunning: false,
    });
  }

  function handleStartTimer() {
    setTimerRunning(true);
    broadcastState({ timerRunning: true });
  }

  function handlePauseTimer() {
    setTimerRunning(false);
    broadcastState({ timerRunning: false });
  }

  function handleResetTimer() {
    setTimerRunning(false);
    if (current) setTimerSeconds(current.timer);
    broadcastState({ timerRunning: false });
  }

  function toggleReveal() {
    const nextReveal = !reveal;
    setReveal(nextReveal);
    broadcastState({ isAnswerRevealed: nextReveal });
  }

  // Periodic leaderboard sync
  useEffect(() => {
    if (!quiz) return;
    let cancelled = false;

    async function syncLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { leaderboard?: LeaderboardEntry[] } | null;
        if (!cancelled && res.ok && data?.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      } catch {
        // ignore
      }
    }

    syncLeaderboard();
    const interval = setInterval(syncLeaderboard, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [quiz]);

  async function handleAwardPoints(e: FormEvent) {
    e.preventDefault();
    if (!scoreTeam.trim()) {
      setAwardFeedback("Please select or enter a team name.");
      return;
    }
    setAwarding(true);
    setAwardFeedback("");
    try {
      const res = await fetch("/api/host/manual-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": password.trim(),
        },
        body: JSON.stringify({
          teamName: scoreTeam.trim(),
          roundId: scoreRound,
          points: scorePoints,
          reason: scoreReason,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; award?: ManualScoreEntry; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Failed to award points.");
      }
      setAwardFeedback(`✓ Successfully awarded ${scorePoints > 0 ? "+" : ""}${scorePoints} pts to "${scoreTeam}"!`);
      if (data.award) {
        setManualAwards((prev) => [data.award!, ...prev]);
      }
    } catch (err: unknown) {
      setAwardFeedback(err instanceof Error ? err.message : "Error awarding points.");
    } finally {
      setAwarding(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100">
      <div
        className="pointer-events-none absolute -top-48 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-mono text-sm font-bold tracking-[0.25em] text-white">
            TECH<span className="text-cyan-300">/</span>SCRAMBLE
          </Link>
          <div className="flex items-center gap-2">
            <span className={`${eyebrow} text-violet-300`}>Host Screen</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {!quiz ? (
          <form onSubmit={load} className="mx-auto max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h1 className="text-2xl font-bold tracking-tight">Host screen unlock</h1>
            <p className="text-sm text-neutral-400">Enter the admin password to load all question sets, scoring tools, and live controls.</p>
            <div>
              <label htmlFor="host-password" className="sr-only">
                Admin password
              </label>
              <input
                id="host-password"
                type="password"
                autoComplete="off"
                className={inputClass}
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-300" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className={primaryBtn} disabled={loading}>
              {loading ? "Unlocking..." : "Unlock host controller"}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex flex-wrap gap-2" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "controller"}
                  onClick={() => setActiveTab("controller")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "controller"
                    ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-neutral-950 font-bold"
                    : "border border-white/10 text-neutral-300 hover:border-violet-400/60"
                    }`}
                >
                  🎮 Question Controller
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "leaderboard"}
                  onClick={() => setActiveTab("leaderboard")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "leaderboard"
                    ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-neutral-950 font-bold"
                    : "border border-white/10 text-neutral-300 hover:border-violet-400/60"
                    }`}
                >
                  🏆 Projector Leaderboard
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "taboo"}
                  onClick={() => setActiveTab("taboo")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "taboo"
                    ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-neutral-950 font-bold"
                    : "border border-white/10 text-neutral-300 hover:border-violet-400/60"
                    }`}
                >
                  ✍️ Manual Scoring (Taboo & Bonus)
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-mono text-xs text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
                <button type="button" className={ghostBtn} onClick={() => load()} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh Questions"}
                </button>
              </div>
            </div>

            {/* TAB 1: QUESTION CONTROLLER */}
            {activeTab === "controller" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="lg:w-64">
                    <label htmlFor="host-set" className={`${eyebrow} mb-1 block text-neutral-400`}>
                      Active Question Set
                    </label>
                    <select
                      id="host-set"
                      className={inputClass}
                      value={setId}
                      onChange={(e) => {
                        const newSetId = e.target.value;
                        setSetId(newSetId);
                        setIndex(0);
                        setReveal(false);
                        const q = quiz.questions.find((item) => item.setId === newSetId && item.roundId === roundId);
                        if (q) setTimerSeconds(q.timer);
                        broadcastState({ activeSetId: newSetId, currentQuestionIndex: 0, isAnswerRevealed: false });
                      }}
                    >
                      {quiz.sets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Rounds">
                    {quiz.rounds.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={r.id === roundId}
                        onClick={() => {
                          setRoundId(r.id);
                          setIndex(0);
                          setReveal(false);
                          const q = quiz.questions.find((item) => item.setId === setId && item.roundId === r.id);
                          if (q) setTimerSeconds(q.timer);
                          broadcastState({ activeRoundId: r.id, currentQuestionIndex: 0, isAnswerRevealed: false });
                        }}
                        className={`rounded-lg border px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${r.id === roundId
                          ? "border-cyan-300 bg-cyan-300/10 text-cyan-200"
                          : "border-white/10 text-neutral-300 hover:border-violet-400/60"
                          }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>

                {!current ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-lg text-neutral-400">
                    No questions in this set and round yet. Add some in the admin dashboard.
                  </p>
                ) : (
                  <section aria-live="polite" className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10 space-y-6">
                    {/* Header info & Timer */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <p className={`${eyebrow} text-cyan-300`}>{roundName}</p>
                        <p className="font-mono text-sm text-neutral-400">
                          Question {index + 1} of {questions.length} · {current.marks} marks · Standard {current.timer}s
                        </p>
                      </div>

                      {/* Timer Widget */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center rounded-xl border px-5 py-2 font-mono text-3xl font-bold tabular-nums ${timerSeconds <= 5 && timerRunning
                            ? "border-red-500/80 bg-red-500/20 text-red-300 animate-pulse"
                            : "border-cyan-300/40 bg-cyan-300/5 text-cyan-300"
                            }`}
                        >
                          {timerSeconds}s
                        </div>
                        <div className="flex gap-1.5">
                          {!timerRunning ? (
                            <button
                              type="button"
                              onClick={handleStartTimer}
                              className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-neutral-950 hover:bg-emerald-400"
                            >
                              ▶ Start
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handlePauseTimer}
                              className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-300"
                            >
                              ⏸ Pause
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleResetTimer}
                            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5"
                          >
                            ↺ Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Question Text */}
                    <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                      {current.text || "(No question text)"}
                    </h1>

                    {/* Tech Taboo Target & Banned Words Highlight */}
                    {isTabooRound && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-red-500/20 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-red-300">
                            TECH TABOO CLUES
                          </span>
                          <span className="text-xs text-neutral-400">Target word to guess:</span>
                          <span className="font-bold text-cyan-300 text-lg">
                            {current.targetWord || current.answer}
                          </span>
                        </div>
                        <div>
                          <p className="font-mono text-xs uppercase tracking-wider text-red-400 mb-1">
                            ⚠️ PROHIBITED / TABOO WORDS (Cannot be spoken):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {current.tabooWords && current.tabooWords.length > 0 ? (
                              current.tabooWords.map((word) => (
                                <span
                                  key={word}
                                  className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1 font-mono text-sm font-bold text-red-200"
                                >
                                  🚫 {word}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-neutral-400">None configured</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Image visual if present */}
                    {current.imageUrl && (
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={current.imageUrl}
                          alt="Question visual"
                          className="mx-auto max-h-[26rem] w-full object-contain"
                        />
                      </div>
                    )}

                    {/* Answer Reveal Area */}
                    <div className="rounded-xl border border-white/10 bg-black/40 p-5">
                      {reveal ? (
                        <div className="space-y-1">
                          <p className={`${eyebrow} text-neutral-400`}>Official Answer</p>
                          <p className="text-2xl font-bold text-cyan-300 sm:text-3xl">
                            {current.answer ? current.answer.split("|").join(" / ") : "(None set)"}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-base text-neutral-500 italic">Answer hidden from projector / audience</p>
                          <span className="text-xs text-neutral-400">Press Reveal Answer to show</span>
                        </div>
                      )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                      <div className="flex gap-2">
                        <button type="button" className={ghostBtn} onClick={() => go(index - 1)} disabled={index === 0}>
                          ← Previous Question
                        </button>
                        <button
                          type="button"
                          className={ghostBtn}
                          onClick={() => go(index + 1)}
                          disabled={index >= questions.length - 1}
                        >
                          Next Question →
                        </button>
                      </div>

                      <button type="button" className={primaryBtn} onClick={toggleReveal}>
                        {reveal ? "Hide Answer" : "👁 Reveal Answer"}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* TAB 2: PROJECTOR LEADERBOARD */}
            {activeTab === "leaderboard" && (
              <div className="space-y-8 rounded-2xl border border-white/10 bg-neutral-900/90 p-6 sm:p-10 shadow-2xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
                  <div>
                    <p className={`${eyebrow} text-cyan-300`}>Projector Screen View</p>
                    <h1 className="text-3xl font-black tracking-tight sm:text-5xl text-white">
                      TECH SCRAMBLE LEADERBOARD
                    </h1>
                  </div>
                  <span className="flex items-center gap-2 font-mono text-sm text-emerald-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE SCORES
                  </span>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="py-16 text-center text-neutral-400">
                    <p className="text-2xl font-bold">Waiting for participants to submit answers...</p>
                    <p className="mt-2 text-sm">Scores will automatically populate here in real-time.</p>
                  </div>
                ) : (
                  <>
                    {/* Top 3 Podium Cards */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      {leaderboard.slice(0, 3).map((team, idx) => {
                        const medalColors = [
                          "border-amber-400 bg-amber-400/10 text-amber-300 shadow-amber-400/20",
                          "border-neutral-300 bg-neutral-300/10 text-neutral-200 shadow-neutral-300/20",
                          "border-amber-600 bg-amber-600/10 text-amber-500 shadow-amber-600/20",
                        ];
                        const medalLabels = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
                        return (
                          <div
                            key={team.teamName}
                            className={`rounded-2xl border p-6 text-center shadow-lg transition-transform hover:-translate-y-1 ${medalColors[idx]}`}
                          >
                            <span className="font-mono text-xs uppercase tracking-widest block font-bold">
                              {medalLabels[idx]}
                            </span>
                            <h2 className="mt-3 text-2xl font-black tracking-tight text-white truncate">
                              {team.teamName}
                            </h2>
                            <p className="font-mono text-xs text-neutral-400 mt-1">{team.setName}</p>
                            <p className="mt-4 font-mono text-5xl font-black text-cyan-300">{team.totalScore}</p>
                            <p className="text-xs text-neutral-400 mt-1">{team.questionsAnswered} questions scored</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* All Teams Ranking Table */}
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.04] text-xs font-mono uppercase text-neutral-400">
                            <th className="py-3 px-4">Rank</th>
                            <th className="py-3 px-4">Team</th>
                            <th className="py-3 px-4">Question Set</th>
                            <th className="py-3 px-4 text-right">R1 (TikTok)</th>
                            <th className="py-3 px-4 text-right">R2 (AI/Real)</th>
                            <th className="py-3 px-4 text-right">R3 (Taboo)</th>
                            <th className="py-3 px-4 text-right">Total Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {leaderboard.map((team) => (
                            <tr key={team.teamName} className="hover:bg-white/[0.02]">
                              <td className="py-3 px-4 font-bold text-cyan-300">#{team.rank}</td>
                              <td className="py-3 px-4 font-sans font-bold text-white">{team.teamName}</td>
                              <td className="py-3 px-4 text-neutral-400">{team.setName}</td>
                              <td className="py-3 px-4 text-right text-neutral-300">{team.roundScores["r1"] ?? 0}</td>
                              <td className="py-3 px-4 text-right text-neutral-300">{team.roundScores["r2"] ?? 0}</td>
                              <td className="py-3 px-4 text-right text-neutral-300">{team.roundScores["r3"] ?? 0}</td>
                              <td className="py-3 px-4 text-right text-xl font-black text-cyan-300">{team.totalScore}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 3: MANUAL SCORING FOR TECH TABOO */}
            {activeTab === "taboo" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={handleAwardPoints} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Award Points (Host Judge)</h2>
                    <p className="text-sm text-neutral-400">
                      Use this to manually score the Tech Taboo round or grant custom bonus / penalty points.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="score-team" className={`${eyebrow} mb-1 block text-neutral-400`}>
                      Team Name
                    </label>
                    <input
                      id="score-team"
                      list="teams-list"
                      className={inputClass}
                      placeholder="Type or select team"
                      value={scoreTeam}
                      onChange={(e) => setScoreTeam(e.target.value)}
                    />
                    <datalist id="teams-list">
                      {leaderboard.map((t) => (
                        <option key={t.teamName} value={t.teamName} />
                      ))}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="score-round" className={`${eyebrow} mb-1 block text-neutral-400`}>
                        Round
                      </label>
                      <select
                        id="score-round"
                        className={inputClass}
                        value={scoreRound}
                        onChange={(e) => setScoreRound(e.target.value)}
                      >
                        {quiz.rounds.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="score-points" className={`${eyebrow} mb-1 block text-neutral-400`}>
                        Points (+ or -)
                      </label>
                      <input
                        id="score-points"
                        type="number"
                        className={inputClass}
                        value={scorePoints}
                        onChange={(e) => setScorePoints(e.target.valueAsNumber || 0)}
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <p className={`${eyebrow} mb-2 block text-neutral-400`}>Quick Presets</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setScorePoints(15);
                          setScoreReason("Correct Taboo Guess (Full Marks)");
                        }}
                        className={successBtn}
                      >
                        +15 Clean Guess
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScorePoints(10);
                          setScoreReason("Late Taboo Guess");
                        }}
                        className={successBtn}
                      >
                        +10 Partial
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScorePoints(-5);
                          setScoreReason("Used Taboo Banned Word");
                        }}
                        className={dangerBtn}
                      >
                        -5 Taboo Violation
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="score-reason" className={`${eyebrow} mb-1 block text-neutral-400`}>
                      Reason / Clue Notes
                    </label>
                    <input
                      id="score-reason"
                      className={inputClass}
                      value={scoreReason}
                      onChange={(e) => setScoreReason(e.target.value)}
                      placeholder="e.g. Guessed Python without using snake/code"
                    />
                  </div>

                  {awardFeedback && (
                    <p className={`text-sm ${awardFeedback.startsWith("✓") ? "text-emerald-300" : "text-red-300"}`} role="alert">
                      {awardFeedback}
                    </p>
                  )}

                  <button type="submit" className={primaryBtn} disabled={awarding}>
                    {awarding ? "Awarding..." : "Submit Score Award"}
                  </button>
                </form>

                {/* Recent Manual Awards Log */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
                  <h2 className="text-xl font-bold tracking-tight">Recent Manual Awards</h2>
                  {manualAwards.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic py-6">
                      No manual scores awarded yet during this session.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {manualAwards.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3 bg-neutral-900/50">
                          <div>
                            <p className="font-bold text-white">{a.teamName}</p>
                            <p className="text-xs text-neutral-400">{a.reason}</p>
                          </div>
                          <span
                            className={`font-mono text-lg font-black ${a.points >= 0 ? "text-emerald-300" : "text-red-300"}`}
                          >
                            {a.points >= 0 ? `+${a.points}` : a.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}