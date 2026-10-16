import { answerKeys } from "./answers.ts";
import { pickIndex, shuffle } from "./rng.ts";
import {
  DIFFICULTIES,
  GAME_MODES,
  type Asset,
  type Bank,
  type Difficulty,
  type GameMode,
  type Progression,
  type Question,
} from "./types.ts";

export interface SelectInput {
  questions: readonly Question[];
  assetsById: ReadonlyMap<string, Asset>;
  setId: string;
  mode: GameMode;
  count: number;
  progression: Progression;
  excludeQuestionIds: readonly string[];
  excludeAssetIds: readonly string[];
  excludeSourceIds: readonly string[];
  recentQuestionIds: readonly string[];
  previousSequence: readonly string[];
  rng: () => number;
}

export interface SelectResult {
  questions: Question[];
  plan: Difficulty[];
  stoppedBecause: "complete" | "exhausted" | "unavailable";
  reusedRecent: boolean;
  sameSequence: boolean;
}

export function difficultiesIn(questions: readonly Question[]): Difficulty[] {
  return DIFFICULTIES.filter((difficulty) => questions.some((question) => question.difficulty === difficulty));
}

export function progressionPlan(
  available: readonly Difficulty[],
  count: number,
  progression: Progression,
): Difficulty[] {
  if (count <= 0) return [];
  const sorted = DIFFICULTIES.filter((difficulty) => available.includes(difficulty));
  if (sorted.length === 0) return [];
  if (progression !== "progressive") {
    if (!sorted.includes(progression)) return [];
    return Array.from({ length: count }, () => progression);
  }
  const base = Math.floor(count / sorted.length);
  let remainder = count % sorted.length;
  const plan: Difficulty[] = [];
  for (const difficulty of sorted) {
    const slots = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    for (let i = 0; i < slots; i += 1) plan.push(difficulty);
  }
  return plan;
}

function contentKey(question: Question): string {
  return `${question.game_mode}:${answerKeys(question.answer)[0] ?? ""}:${answerKeys(question.prompt)[0] ?? ""}`;
}

function isBlocked(
  question: Question,
  assetsById: ReadonlyMap<string, Asset>,
  excludeQuestions: ReadonlySet<string>,
  excludeAssets: ReadonlySet<string>,
  excludeSources: ReadonlySet<string>,
  pickedKeys: ReadonlySet<string>,
): boolean {
  if (question.content_status !== "published") return true;
  if (excludeQuestions.has(question.question_id)) return true;
  if (pickedKeys.has(contentKey(question))) return true;
  for (const assetId of question.image_asset_ids) {
    if (excludeAssets.has(assetId)) return true;
    const asset = assetsById.get(assetId);
    if (!asset) return true;
    if (excludeSources.has(asset.source_identity)) return true;
    if (excludeAssets.has(asset.content_sha256)) return true;
  }
  return false;
}

function adjacentFallback(difficulty: Difficulty, available: readonly Difficulty[]): Difficulty[] {
  const index = DIFFICULTIES.indexOf(difficulty);
  const easier = DIFFICULTIES.slice(0, index).reverse();
  return easier.filter((item) => available.includes(item));
}

export function selectRound(input: SelectInput): SelectResult {
  const pool = input.questions.filter(
    (question) => question.set_id === input.setId && question.game_mode === input.mode,
  );
  const available = difficultiesIn(pool);
  const plan = progressionPlan(available, input.count, input.progression);
  if (plan.length === 0) {
    return { questions: [], plan, stoppedBecause: "unavailable", reusedRecent: false, sameSequence: false };
  }

  const excludeQuestions = new Set(input.excludeQuestionIds);
  const excludeAssets = new Set(input.excludeAssetIds);
  const excludeSources = new Set(input.excludeSourceIds);
  const recent = new Set(input.recentQuestionIds);
  const picked: Question[] = [];
  const pickedIds = new Set<string>();
  const pickedKeys = new Set<string>();
  const pickedAssets = new Set<string>();
  const pickedSources = new Set<string>();
  let reusedRecent = false;

  const blocked = (question: Question) =>
    pickedIds.has(question.question_id) ||
    isBlocked(question, input.assetsById, excludeQuestions, new Set([...excludeAssets, ...pickedAssets]), new Set([...excludeSources, ...pickedSources]), pickedKeys);

  for (const difficulty of plan) {
    const order = [difficulty, ...adjacentFallback(difficulty, available)];
    let chosen: Question | undefined;
    for (const candidateDifficulty of order) {
      const matching = pool.filter(
        (question) => question.difficulty === candidateDifficulty && !blocked(question),
      );
      const preferred = matching.filter((question) => !recent.has(question.question_id));
      const drawFrom = preferred.length > 0 ? preferred : matching;
      if (drawFrom.length === 0) continue;
      chosen = drawFrom[pickIndex(input.rng, drawFrom.length)];
      if (chosen && recent.has(chosen.question_id)) reusedRecent = true;
      break;
    }
    if (!chosen) {
      return finish(picked, plan, "exhausted", reusedRecent, input.previousSequence, input.rng);
    }
    picked.push(chosen);
    pickedIds.add(chosen.question_id);
    pickedKeys.add(contentKey(chosen));
    for (const assetId of chosen.image_asset_ids) {
      pickedAssets.add(assetId);
      const asset = input.assetsById.get(assetId);
      if (asset) {
        pickedSources.add(asset.source_identity);
        pickedAssets.add(asset.content_sha256);
      }
    }
  }

  return finish(picked, plan, "complete", reusedRecent, input.previousSequence, input.rng);
}

function sameSequence(left: readonly Question[], right: readonly string[]): boolean {
  if (left.length === 0 || left.length !== right.length) return false;
  return left.every((question, index) => question.question_id === right[index]);
}

function finish(
  picked: Question[],
  plan: Difficulty[],
  stoppedBecause: SelectResult["stoppedBecause"],
  reusedRecent: boolean,
  previousSequence: readonly string[],
  rng: () => number,
): SelectResult {
  let questions = picked;
  let same = sameSequence(questions, previousSequence);
  if (same && questions.length > 1) {
    const reshuffled = shuffle(questions, rng);
    if (!sameSequence(reshuffled, previousSequence)) {
      questions = reshuffled;
      same = false;
    }
  }
  return {
    questions,
    plan,
    stoppedBecause: questions.length === plan.length ? stoppedBecause : "exhausted",
    reusedRecent,
    sameSequence: same,
  };
}

export interface ModeAvailability {
  count: number;
  difficulties: Difficulty[];
  problem?: string;
}

export function availabilityForSet(
  bank: Bank,
  setId: string,
  progression: Progression,
): Record<GameMode, ModeAvailability> {
  const result = {} as Record<GameMode, ModeAvailability>;
  for (const mode of GAME_MODES) {
    const questions = bank.questions.filter(
      (question) =>
        question.set_id === setId && question.game_mode === mode && question.content_status === "published",
    );
    const difficulties = difficultiesIn(questions);
    if (questions.length === 0) {
      result[mode] = { count: 0, difficulties, problem: "This set has no published questions for this round." };
      continue;
    }
    if (progression !== "progressive" && !difficulties.includes(progression)) {
      result[mode] = {
        count: 0,
        difficulties,
        problem: `This set has no ${progression} questions for this round.`,
      };
      continue;
    }
    const count =
      progression === "progressive"
        ? questions.length
        : questions.filter((question) => question.difficulty === progression).length;
    result[mode] = { count, difficulties };
  }
  return result;
}

export function maxQuestionsPerRound(availability: Record<GameMode, ModeAvailability>): number {
  return Math.min(...GAME_MODES.map((mode) => availability[mode].count));
}
