import { timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildDefaultQuiz,
  INITIAL_ROUNDS,
  INITIAL_SETS,
  LeaderboardEntry,
  LiveGameState,
  ManualScoreAward,
  StoredQuestion,
  StoredQuiz,
  StoredRound,
  StoredSet,
  TeamSubmission,
} from "./quiz-data";

export * from "./quiz-data";

export type StoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

const MAX_SETS = 50;
const MAX_ROUNDS = 20;
const MAX_QUESTIONS = 2000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/* ---------- Environment & Provider Detection ---------- */

export function getBackendStatus() {
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? "";
  const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const firebaseStorageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const adminKey = process.env.ADMIN_UPLOAD_KEY || "Bommali";

  const isFirebaseConfigured = Boolean(firebaseProjectId);
  const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

  let activeProvider: "firebase" | "supabase" | "local" = "local";
  if (isFirebaseConfigured && (firebasePrivateKey || process.env.FIREBASE_DATABASE_URL)) {
    activeProvider = "firebase";
  } else if (isSupabaseConfigured) {
    activeProvider = "supabase";
  }

  return {
    activeProvider,
    isFirebaseConfigured,
    isSupabaseConfigured,
    firebaseProjectId,
    firebaseClientEmail,
    firebaseStorageBucket,
    supabaseUrl,
    supabaseKey,
    adminKey,
  };
}

/** Admin protection: shared password sent in the x-admin-key header */
export function checkAdmin(request: Request): { ok: true } | { ok: false; status: number; message: string } {
  const { adminKey } = getBackendStatus();
  const provided = request.headers.get("x-admin-key") ?? "";
  if (!provided) {
    return { ok: false, status: 401, message: "Admin password header (x-admin-key) is required." };
  }
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(adminKey);
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return { ok: false, status: 401, message: "Invalid admin password." };
  }
  return { ok: true };
}

/* ---------- In-memory & Local Disk Fallback Engine ---------- */

const DATA_DIR = path.join(process.cwd(), "data");
const QUIZ_FILE = path.join(DATA_DIR, "quiz-state.json");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");
const MANUAL_SCORES_FILE = path.join(DATA_DIR, "manual-scores.json");
const GAME_STATE_FILE = path.join(DATA_DIR, "game-state.json");

let memoryQuiz: StoredQuiz | null = null;
let memorySubmissions: TeamSubmission[] = [];
let memoryManualScores: ManualScoreAward[] = [];
let memoryGameState: LiveGameState = {
  activeSetId: "s1",
  activeRoundId: "r1",
  currentQuestionIndex: 0,
  timerRunning: false,
  isAnswerRevealed: false,
  updatedAt: new Date().toISOString(),
};

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Disk write may fail in read-only environment
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as T;
    }
  } catch {
    // ignore read error
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/* ---------- Validation & Sanitization ---------- */

function cleanString(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function cleanNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function sanitizeQuiz(input: unknown): StoredQuiz | null {
  if (!isObject(input) || !Array.isArray(input.sets) || !Array.isArray(input.rounds) || !Array.isArray(input.questions)) {
    return null;
  }

  const sets: StoredSet[] = [];
  const setIds = new Set<string>();
  for (const raw of input.sets.slice(0, MAX_SETS)) {
    if (!isObject(raw) || typeof raw.id !== "string" || !ID_PATTERN.test(raw.id) || setIds.has(raw.id)) continue;
    setIds.add(raw.id);
    sets.push({ id: raw.id, name: cleanString(raw.name, 80).trim() || "Untitled set" });
  }

  const rounds: StoredRound[] = [];
  const roundIds = new Set<string>();
  for (const raw of input.rounds.slice(0, MAX_ROUNDS)) {
    if (!isObject(raw) || typeof raw.id !== "string" || !ID_PATTERN.test(raw.id) || roundIds.has(raw.id)) continue;
    roundIds.add(raw.id);
    rounds.push({ id: raw.id, name: cleanString(raw.name, 80).trim() || "Untitled round" });
  }

  const questions: StoredQuestion[] = [];
  const questionIds = new Set<string>();
  for (const raw of input.questions.slice(0, MAX_QUESTIONS)) {
    if (!isObject(raw) || typeof raw.id !== "string" || !ID_PATTERN.test(raw.id) || questionIds.has(raw.id)) continue;
    if (typeof raw.setId !== "string" || !setIds.has(raw.setId)) continue;
    if (typeof raw.roundId !== "string" || !roundIds.has(raw.roundId)) continue;
    questionIds.add(raw.id);

    const options = Array.isArray(raw.options)
      ? raw.options.map((o) => cleanString(o, 100)).filter(Boolean)
      : undefined;

    const tabooWords = Array.isArray(raw.tabooWords)
      ? raw.tabooWords.map((t) => cleanString(t, 50)).filter(Boolean)
      : undefined;

    questions.push({
      id: raw.id,
      setId: raw.setId,
      roundId: raw.roundId,
      text: cleanString(raw.text, 2000),
      answer: cleanString(raw.answer, 500),
      marks: cleanNumber(raw.marks, 0, 1000, 10),
      timer: cleanNumber(raw.timer, 5, 3600, 30),
      imageUrl: cleanString(raw.imageUrl, 2000),
      options: options && options.length > 0 ? options : undefined,
      targetWord: cleanString(raw.targetWord, 200) || undefined,
      tabooWords: tabooWords && tabooWords.length > 0 ? tabooWords : undefined,
      emojiClue: cleanString(raw.emojiClue, 200) || undefined,
      cardReference: cleanString(raw.cardReference, 500) || undefined,
      flaggedForReview: Boolean(raw.flaggedForReview) || undefined,
      reviewNotes: cleanString(raw.reviewNotes, 500) || undefined,
    });
  }

  const unassignedQuestions: StoredQuestion[] = [];
  if (Array.isArray(input.unassignedQuestions)) {
    for (const raw of input.unassignedQuestions.slice(0, MAX_QUESTIONS)) {
      if (!isObject(raw) || typeof raw.id !== "string" || !ID_PATTERN.test(raw.id)) continue;
      const options = Array.isArray(raw.options)
        ? raw.options.map((o) => cleanString(o, 100)).filter(Boolean)
        : undefined;
      const tabooWords = Array.isArray(raw.tabooWords)
        ? raw.tabooWords.map((t) => cleanString(t, 50)).filter(Boolean)
        : undefined;

      unassignedQuestions.push({
        id: raw.id,
        setId: "unassigned",
        roundId: cleanString(raw.roundId, 64) || "r1",
        text: cleanString(raw.text, 2000),
        answer: cleanString(raw.answer, 500),
        marks: cleanNumber(raw.marks, 0, 1000, 10),
        timer: cleanNumber(raw.timer, 5, 3600, 30),
        imageUrl: cleanString(raw.imageUrl, 2000),
        options: options && options.length > 0 ? options : undefined,
        targetWord: cleanString(raw.targetWord, 200) || undefined,
        tabooWords: tabooWords && tabooWords.length > 0 ? tabooWords : undefined,
        emojiClue: cleanString(raw.emojiClue, 200) || undefined,
        cardReference: cleanString(raw.cardReference, 500) || undefined,
        flaggedForReview: Boolean(raw.flaggedForReview) || undefined,
        reviewNotes: cleanString(raw.reviewNotes, 500) || undefined,
      });
    }
  }

  return { sets, rounds, questions, unassignedQuestions };
}

/* ---------- Supabase REST Integration (When Supabase is provided) ---------- */

async function loadQuizFromSupabase(): Promise<StoredQuiz | null> {
  const { supabaseUrl, supabaseKey } = getBackendStatus();
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/quiz_state?id=eq.1&select=data`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => null)) as { data?: unknown }[] | null;
    if (!rows || rows.length === 0) return null;
    return sanitizeQuiz(rows[0].data);
  } catch {
    return null;
  }
}

async function saveQuizToSupabase(clean: StoredQuiz): Promise<boolean> {
  const { supabaseUrl, supabaseKey } = getBackendStatus();
  if (!supabaseUrl || !supabaseKey) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/quiz_state?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: 1, data: clean, updated_at: new Date().toISOString() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ---------- Public Quiz Store Operations ---------- */

export async function loadQuiz(): Promise<StoreResult<StoredQuiz>> {
  const supabaseQuiz = await loadQuizFromSupabase();
  if (supabaseQuiz) {
    memoryQuiz = supabaseQuiz;
    return { ok: true, value: supabaseQuiz };
  }

  if (!memoryQuiz) {
    const diskQuiz = readJsonFile<StoredQuiz | null>(QUIZ_FILE, null);
    if (diskQuiz) {
      const sanitized = sanitizeQuiz(diskQuiz);
      if (sanitized) memoryQuiz = sanitized;
    }
  }

  if (!memoryQuiz) {
    memoryQuiz = buildDefaultQuiz();
    writeJsonFile(QUIZ_FILE, memoryQuiz);
  }

  return { ok: true, value: memoryQuiz };
}

export async function saveQuiz(input: unknown): Promise<StoreResult<StoredQuiz>> {
  const clean = sanitizeQuiz(input);
  if (!clean) {
    return { ok: false, status: 400, message: "Invalid quiz structure or missing required fields." };
  }

  memoryQuiz = clean;
  writeJsonFile(QUIZ_FILE, clean);
  await saveQuizToSupabase(clean);

  return { ok: true, value: clean };
}

/* ---------- Submissions & Leaderboard Operations ---------- */

export async function loadSubmissions(): Promise<TeamSubmission[]> {
  if (memorySubmissions.length === 0) {
    memorySubmissions = readJsonFile<TeamSubmission[]>(SUBMISSIONS_FILE, []);
  }
  return memorySubmissions;
}

export async function recordSubmission(submission: Omit<TeamSubmission, "id" | "submittedAt">): Promise<{ duplicate: boolean; submission: TeamSubmission }> {
  const existing = await loadSubmissions();

  const duplicate = existing.find(
    (s) =>
      s.teamName.toLowerCase().trim() === submission.teamName.toLowerCase().trim() &&
      s.questionId === submission.questionId,
  );

  if (duplicate) {
    return { duplicate: true, submission: duplicate };
  }

  const newEntry: TeamSubmission = {
    ...submission,
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    submittedAt: new Date().toISOString(),
  };

  memorySubmissions.push(newEntry);
  writeJsonFile(SUBMISSIONS_FILE, memorySubmissions);

  return { duplicate: false, submission: newEntry };
}

export async function loadManualScores(): Promise<ManualScoreAward[]> {
  if (memoryManualScores.length === 0) {
    memoryManualScores = readJsonFile<ManualScoreAward[]>(MANUAL_SCORES_FILE, []);
  }
  return memoryManualScores;
}

export async function awardManualScore(award: Omit<ManualScoreAward, "id" | "awardedAt">): Promise<ManualScoreAward> {
  await loadManualScores();
  const entry: ManualScoreAward = {
    ...award,
    id: `man-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    awardedAt: new Date().toISOString(),
  };
  memoryManualScores.push(entry);
  writeJsonFile(MANUAL_SCORES_FILE, memoryManualScores);
  return entry;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const submissions = await loadSubmissions();
  const manualScores = await loadManualScores();
  const quizRes = await loadQuiz();
  const quiz = quizRes.ok ? quizRes.value : buildDefaultQuiz();

  const teamsMap = new Map<string, {
    teamName: string;
    setId: string;
    roundScores: Record<string, number>;
    totalScore: number;
    questionsAnswered: number;
    lastActive: string;
  }>();

  for (const s of submissions) {
    const key = s.teamName.toLowerCase().trim();
    if (!teamsMap.has(key)) {
      teamsMap.set(key, {
        teamName: s.teamName.trim(),
        setId: s.setId,
        roundScores: {},
        totalScore: 0,
        questionsAnswered: 0,
        lastActive: s.submittedAt,
      });
    }
    const entry = teamsMap.get(key)!;
    entry.roundScores[s.roundId] = (entry.roundScores[s.roundId] ?? 0) + s.points;
    entry.totalScore += s.points;
    entry.questionsAnswered += 1;
    if (new Date(s.submittedAt) > new Date(entry.lastActive)) {
      entry.lastActive = s.submittedAt;
    }
  }

  for (const m of manualScores) {
    const key = m.teamName.toLowerCase().trim();
    if (!teamsMap.has(key)) {
      teamsMap.set(key, {
        teamName: m.teamName.trim(),
        setId: "s1",
        roundScores: {},
        totalScore: 0,
        questionsAnswered: 0,
        lastActive: m.awardedAt,
      });
    }
    const entry = teamsMap.get(key)!;
    entry.roundScores[m.roundId] = (entry.roundScores[m.roundId] ?? 0) + m.points;
    entry.totalScore += m.points;
  }

  const sorted = Array.from(teamsMap.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
  });

  return sorted.map((item, index) => {
    const setName = quiz.sets.find((s) => s.id === item.setId)?.name ?? item.setId;
    return {
      rank: index + 1,
      teamName: item.teamName,
      setId: item.setId,
      setName,
      roundScores: item.roundScores,
      totalScore: item.totalScore,
      questionsAnswered: item.questionsAnswered,
      lastActive: item.lastActive,
    };
  });
}

/* ---------- Live Game State (Host Synchronization) ---------- */

export async function getLiveGameState(): Promise<LiveGameState> {
  const disk = readJsonFile<LiveGameState | null>(GAME_STATE_FILE, null);
  if (disk) memoryGameState = disk;
  return memoryGameState;
}

export async function updateLiveGameState(updates: Partial<LiveGameState>): Promise<LiveGameState> {
  memoryGameState = {
    ...memoryGameState,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeJsonFile(GAME_STATE_FILE, memoryGameState);
  return memoryGameState;
}
