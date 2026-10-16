import { answerTokens, answersMatch, normalizeAnswer, textLeaksAnswer } from "./answers.ts";
import { difficultiesIn } from "./select.ts";
import {
  DIFFICULTIES,
  GAME_MODES,
  type Asset,
  type Bank,
  type Question,
  type QuestionSet,
} from "./types.ts";

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  question_id?: string;
}

function gap(difficulties: readonly string[]): boolean {
  const indexes = difficulties.map((difficulty) => DIFFICULTIES.indexOf(difficulty as (typeof DIFFICULTIES)[number]));
  for (let i = 1; i < indexes.length; i += 1) {
    if (indexes[i] !== indexes[i - 1]! + 1) return true;
  }
  return false;
}

function push(
  issues: ValidationIssue[],
  level: ValidationIssue["level"],
  code: string,
  message: string,
  question?: Question,
) {
  issues.push({ level, code, message, question_id: question?.question_id });
}

export function validateBank(bank: Bank): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (bank.sets.length < 5) {
    push(issues, "error", "sets", `Expected at least 5 question sets, found ${bank.sets.length}.`);
  }

  const setIds = new Set<string>();
  for (const set of bank.sets) {
    if (setIds.has(set.set_id)) push(issues, "error", "duplicate-set", `Duplicate set id ${set.set_id}.`);
    setIds.add(set.set_id);
    if (!set.name.trim() || !set.description.trim()) {
      push(issues, "error", "set-copy", `Set ${set.set_id} needs a name and description.`);
    }
  }

  const questionIds = new Set<string>();
  const prompts = new Set<string>();
  const termAnswers = new Set<string>();
  const assetIds = new Set<string>();
  const sourceIds = new Set<string>();
  const hashes = new Set<string>();
  const assetsById = new Map<string, Asset>();

  for (const asset of bank.assets) {
    if (assetIds.has(asset.asset_id)) {
      push(issues, "error", "duplicate-asset", `Duplicate asset id ${asset.asset_id}.`);
    }
    assetIds.add(asset.asset_id);
    assetsById.set(asset.asset_id, asset);
    if (sourceIds.has(asset.source_identity)) {
      push(issues, "error", "duplicate-source", `Duplicate image source ${asset.source_identity}.`);
    }
    sourceIds.add(asset.source_identity);
    if (!asset.content_sha256 || asset.content_sha256.length < 32) {
      push(issues, "error", "asset-hash", `Asset ${asset.asset_id} is missing a content hash.`);
    } else if (hashes.has(asset.content_sha256)) {
      push(issues, "error", "duplicate-bytes", `Asset ${asset.asset_id} repeats another file's bytes.`);
    }
    hashes.add(asset.content_sha256);
    if (!asset.src || !asset.alt.trim() || !asset.attribution.trim() || !asset.provenance.trim()) {
      push(issues, "error", "asset-meta", `Asset ${asset.asset_id} is missing source metadata.`);
    }
    if (asset.kind === "photograph") {
      if (asset.label !== "real") push(issues, "error", "photo-label", `Photograph ${asset.asset_id} must be labeled real.`);
      if (!asset.source_url.startsWith("https://commons.wikimedia.org/")) {
        push(issues, "error", "photo-source", `Photograph ${asset.asset_id} needs a Wikimedia Commons source URL.`);
      }
      if (!asset.creator.trim() || !asset.license.trim()) {
        push(issues, "error", "photo-provenance", `Photograph ${asset.asset_id} needs a creator and license.`);
      }
    }
    if (asset.kind === "ai-generated") {
      if (asset.label !== "ai") push(issues, "error", "ai-label", `Generated asset ${asset.asset_id} must be labeled ai.`);
      if (!/xAI Imagine/i.test(asset.provenance) || !/\d{4}-\d{2}-\d{2}/.test(asset.provenance)) {
        push(issues, "error", "ai-provenance", `Generated asset ${asset.asset_id} needs an xAI Imagine date in its provenance.`);
      }
    }
    if (asset.kind === "original-svg") {
      if (!asset.src.endsWith(".svg")) push(issues, "error", "svg-src", `Puzzle ${asset.asset_id} must point at an svg file.`);
    }
  }

  for (const question of bank.questions) {
    if (questionIds.has(question.question_id)) {
      push(issues, "error", "duplicate-question", `Duplicate question id ${question.question_id}.`, question);
    }
    questionIds.add(question.question_id);
    if (!setIds.has(question.set_id)) {
      push(issues, "error", "orphan-question", `Question is assigned to an unknown set.`, question);
    }
    if (!question.prompt.trim() || !question.explanation.trim()) {
      push(issues, "error", "copy", `Question needs a prompt and explanation.`, question);
    }
    if (question.time_limit <= 0 || question.points <= 0) {
      push(issues, "error", "rules", `Question needs a positive time limit and point value.`, question);
    }
    if (!DIFFICULTIES.includes(question.difficulty)) {
      push(issues, "error", "difficulty", `Unknown difficulty.`, question);
    }
    if (!answersMatch(question.answer, question.accepted_answers)) {
      push(issues, "error", "accepted", `Canonical answer is not in the accepted list.`, question);
    }
    const identity =
      question.game_mode === "realai"
        ? question.source_identities.join("|") || question.question_id
        : `${normalizeAnswer(question.prompt)}:${normalizeAnswer(question.answer)}`;
    const promptKey = `${question.game_mode}:${identity}`;
    if (prompts.has(promptKey)) {
      push(issues, "error", "duplicate-content", `Prompt and answer repeat another question.`, question);
    }
    prompts.add(promptKey);

    if (question.game_mode === "term" || question.game_mode === "taboo") {
      const key = `${question.game_mode}:${normalizeAnswer(question.answer).replace(/ /g, "")}`;
      if (termAnswers.has(key)) {
        push(issues, "error", "duplicate-answer", `Answer repeats inside ${question.game_mode}.`, question);
      }
      termAnswers.add(key);
    }

    for (const hint of question.hints) {
      if (textLeaksAnswer(hint, question.answer)) {
        push(issues, "error", "hint-leak", `A hint contains the answer.`, question);
      }
    }
    if (question.game_mode !== "realai" && textLeaksAnswer(question.prompt, question.answer)) {
      push(issues, "error", "prompt-leak", `The prompt contains the answer.`, question);
    }
    if (question.image_asset_ids.length > 0 && question.source_identities.length !== question.image_asset_ids.length) {
      push(issues, "error", "source-link", `Source identities must match image assets.`, question);
    }

    if (question.choice_options) {
      if (question.choice_options.length !== 4) {
        push(issues, "error", "choices", `Multiple choice needs exactly 4 options.`, question);
      }
      const unique = new Set(question.choice_options.map((option) => normalizeAnswer(option)));
      if (unique.size !== question.choice_options.length) {
        push(issues, "error", "choices", `Choice options repeat.`, question);
      }
      if (!question.choice_options.some((option) => answersMatch(option, [question.answer]))) {
        push(issues, "error", "choices", `Choices do not include the answer.`, question);
      }
      for (const option of question.choice_options) {
        if (!answersMatch(option, [question.answer]) && answersMatch(option, question.accepted_answers)) {
          push(issues, "error", "choices", `A distractor is also an accepted answer.`, question);
        }
      }
    }

    for (const assetId of question.image_asset_ids) {
      const asset = assetsById.get(assetId);
      if (!asset) {
        push(issues, "error", "missing-asset", `Missing asset ${assetId}.`, question);
        continue;
      }
      if (asset.question_id !== question.question_id) {
        push(issues, "error", "asset-link", `Asset ${assetId} points at a different question.`, question);
      }
    }

    if (question.game_mode === "term") validateTerm(question, assetsById, issues);
    if (question.game_mode === "realai") validateRealAi(question, assetsById, issues);
    if (question.game_mode === "taboo") validateTaboo(question, issues);
  }

  for (const set of bank.sets) validateSetShape(set, bank, issues);
  return issues;
}

function validateTerm(question: Question, assetsById: ReadonlyMap<string, Asset>, issues: ValidationIssue[]) {
  if (!question.clues || question.clues.length < 2) {
    push(issues, "error", "clues", `Term puzzles need at least two visual clues.`, question);
  }
  for (const clue of question.clues ?? []) {
    if (!clue.icon.trim() || !clue.caption.trim()) {
      push(issues, "error", "clues", `A clue is missing an icon or caption.`, question);
    }
    if (textLeaksAnswer(clue.caption, question.answer)) {
      push(issues, "error", "clue-leak", `A clue caption contains the answer.`, question);
    }
  }
  if (question.hints.length < 2) push(issues, "error", "hints", `Term questions need at least two hints.`, question);
  if (question.image_asset_ids.length !== 1) {
    push(issues, "error", "term-asset", `Term questions need one puzzle asset.`, question);
  }
  const asset = assetsById.get(question.image_asset_ids[0] ?? "");
  if (asset && asset.kind !== "original-svg") {
    push(issues, "error", "term-asset", `Term puzzles must use an original SVG.`, question);
  }
}

function validateRealAi(question: Question, assetsById: ReadonlyMap<string, Asset>, issues: ValidationIssue[]) {
  if (question.image_asset_ids.length !== 1) {
    push(issues, "error", "realai-asset", `Real or AI questions need exactly one image.`, question);
    return;
  }
  const asset = assetsById.get(question.image_asset_ids[0] ?? "");
  if (!asset) return;
  const expected = normalizeAnswer(question.answer);
  if (expected !== "real" && expected !== "ai") {
    push(issues, "error", "realai-answer", `Answer must be real or ai.`, question);
  }
  if (asset.label && expected !== asset.label) {
    push(issues, "error", "realai-mismatch", `Answer does not match the asset label.`, question);
  }
  if (asset.kind !== "photograph" && asset.kind !== "ai-generated") {
    push(issues, "error", "realai-kind", `Real or AI images must be a photograph or a generated file.`, question);
  }
  if (!question.explanation.includes(asset.creator) && !question.explanation.includes("xAI Imagine")) {
    push(issues, "error", "realai-explanation", `Explanation must cite the image record.`, question);
  }
}

function validateTaboo(question: Question, issues: ValidationIssue[]) {
  const forbidden = question.forbidden_words ?? [];
  if (forbidden.length < 4) push(issues, "error", "forbidden", `Taboo cards need at least four forbidden words.`, question);
  const answerKey = normalizeAnswer(question.answer).replace(/ /g, "");
  for (const word of forbidden) {
    const key = normalizeAnswer(word).replace(/ /g, "");
    if (!key) push(issues, "error", "forbidden", `Empty forbidden word.`, question);
    if (key === answerKey) push(issues, "error", "forbidden", `Forbidden list includes the answer.`, question);
    if (answerTokens(question.answer).some((token) => token === normalizeAnswer(word))) {
      push(issues, "error", "forbidden", `Forbidden list includes an answer word.`, question);
    }
  }
}

function validateSetShape(set: QuestionSet, bank: Bank, issues: ValidationIssue[]) {
  for (const mode of GAME_MODES) {
    const questions = bank.questions.filter(
      (question) => question.set_id === set.set_id && question.game_mode === mode && question.content_status === "published",
    );
    if (questions.length < 6) {
      push(issues, "error", "thin-set", `${set.set_id} / ${mode} has ${questions.length} published questions; minimum is 6.`);
    }
    const difficulties = difficultiesIn(questions);
    if (gap(difficulties)) {
      push(issues, "error", "difficulty-gap", `${set.set_id} / ${mode} skips a difficulty level.`);
    }
    const declared = DIFFICULTIES.slice(DIFFICULTIES.indexOf(set.difficulty_min), DIFFICULTIES.indexOf(set.difficulty_max) + 1);
    for (const difficulty of declared) {
      if (!difficulties.includes(difficulty)) {
        push(issues, "warning", "set-range", `${set.set_id} / ${mode} is missing declared difficulty ${difficulty}.`);
      }
    }
  }
  const present = difficultiesIn(bank.questions.filter((question) => question.set_id === set.set_id));
  if (present[0] !== set.difficulty_min || present[present.length - 1] !== set.difficulty_max) {
    push(issues, "error", "set-range", `${set.set_id} difficulty range does not match its questions.`);
  }
}

export function errorCount(issues: readonly ValidationIssue[]): number {
  return issues.filter((issue) => issue.level === "error").length;
}
