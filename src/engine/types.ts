export const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const GAME_MODES = ["term", "realai", "taboo"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export type Progression = "progressive" | Difficulty;

export interface Clue {
  icon: string;
  caption: string;
}

export interface Question {
  question_id: string;
  set_id: string;
  game_mode: GameMode;
  difficulty: Difficulty;
  category: string;
  prompt: string;
  answer: string;
  accepted_answers: string[];
  choice_options?: string[];
  hints: string[];
  explanation: string;
  time_limit: number;
  points: number;
  content_status: "published" | "draft";
  image_asset_ids: string[];
  source_identities: string[];
  asset_hashes: string[];
  clues?: Clue[];
  forbidden_words?: string[];
}

export type AssetKind = "original-svg" | "photograph" | "ai-generated";

export interface Asset {
  asset_id: string;
  question_id: string;
  kind: AssetKind;
  src: string;
  alt: string;
  source_identity: string;
  source_url: string;
  creator: string;
  license: string;
  license_url: string;
  provenance: string;
  attribution: string;
  width: number;
  height: number;
  content_sha256: string;
  label?: "real" | "ai";
}

export interface QuestionSet {
  set_id: string;
  name: string;
  description: string;
  difficulty_min: Difficulty;
  difficulty_max: Difficulty;
  themes: string[];
}

export interface Bank {
  sets: QuestionSet[];
  questions: Question[];
  assets: Asset[];
  generated_at: string;
}

export interface Settings {
  setId: string;
  questionsPerRound: number;
  progression: Progression;
  multipleChoice: boolean;
  hintPenalty: number;
  tabooPenalty: number;
  speedBonusMax: number;
  skipLimit: number;
  tabooSeconds: number;
  turnsPerTeam: number;
}

export interface Team {
  id: string;
  name: string;
  roundScores: Record<GameMode, number>;
}

export interface LogEntry {
  mode: GameMode;
  teamId: string;
  questionId: string;
  outcome: "correct" | "wrong" | "timeout" | "skip" | "forbidden";
  pointsDelta: number;
  basePoints: number;
  speedBonus: number;
  penalty: number;
  difficulty: Difficulty;
  at: number;
}

export type Phase =
  | "round-intro"
  | "question"
  | "feedback"
  | "turn-handoff"
  | "round-summary"
  | "results";

export interface Session {
  id: string;
  settings: Settings;
  teams: Team[];
  phase: Phase;
  status: "playing" | "paused" | "ended";
  roundOrder: GameMode[];
  roundIndex: number;
  activeTeamIndex: number;
  queue: Question[];
  queueIndex: number;
  seenQuestionIds: string[];
  seenAssetIds: string[];
  seenSourceIds: string[];
  hintsRevealed: number;
  resolved: boolean;
  skipsThisRound: Record<string, number>;
  questionStartedAt: number | null;
  pausedAt: number | null;
  pauseAccumMs: number;
  feedback: Feedback | null;
  log: LogEntry[];
  tabooTurnStartedAt: number | null;
  tabooPauseAccumMs: number;
  turnsRemaining: Record<string, number>;
  tabooTeamIndex: number;
  explainerReady: boolean;
  lastForbiddenAt: number;
  notice: string | null;
  rngSeed: number;
  recentQuestionIds: string[];
  previousSequences: Partial<Record<GameMode, string[]>>;
}

export interface Feedback {
  outcome: LogEntry["outcome"];
  pointsDelta: number;
  answer: string;
  explanation: string;
  questionId: string;
  speedBonus: number;
}

export interface TeamDraft {
  id: string;
  name: string;
}

export const DEFAULT_SETTINGS: Settings = {
  setId: "foundations",
  questionsPerRound: 6,
  progression: "progressive",
  multipleChoice: false,
  hintPenalty: 15,
  tabooPenalty: 25,
  speedBonusMax: 50,
  skipLimit: 2,
  tabooSeconds: 60,
  turnsPerTeam: 1,
};

export const EMPTY_SCORES: Record<GameMode, number> = {
  term: 0,
  realai: 0,
  taboo: 0,
};
