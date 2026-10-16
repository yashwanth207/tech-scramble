import { createClient } from "@supabase/supabase-js";
import { errorCount, validateBank } from "../engine/validate.ts";
import type { Asset, Bank, Question, QuestionSet } from "../engine/types.ts";

interface RemoteSet extends QuestionSet {
  sort_order?: number;
}

export async function loadRemoteBank(): Promise<{ bank: Bank | null; note: string | null }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return { bank: null, note: null };
  try {
    const client = createClient(url, key);
    const [setsRes, questionsRes, assetsRes] = await Promise.all([
      client.from("question_sets").select("*").order("sort_order"),
      client.from("questions").select("*"),
      client.from("assets").select("*"),
    ]);
    const failure = setsRes.error ?? questionsRes.error ?? assetsRes.error;
    if (failure) {
      return { bank: null, note: `Supabase did not return the question tables (${failure.message}). Using the copy shipped with this app.` };
    }
    const sets = ((setsRes.data ?? []) as RemoteSet[])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((row) => {
        const set: QuestionSet = {
          set_id: row.set_id,
          name: row.name,
          description: row.description,
          difficulty_min: row.difficulty_min,
          difficulty_max: row.difficulty_max,
          themes: row.themes ?? [],
        };
        return set;
      });
    const questions = ((questionsRes.data ?? []) as Question[]).map(cleanQuestion);
    const assets = ((assetsRes.data ?? []) as Asset[]).map(cleanAsset);
    if (sets.length === 0 || questions.length === 0) {
      return { bank: null, note: "Supabase is connected, but the question tables are empty. Using the copy shipped with this app." };
    }
    const bank: Bank = { sets, questions, assets, generated_at: new Date().toISOString() };
    if (errorCount(validateBank(bank)) > 0) {
      return { bank: null, note: "The Supabase question tables failed validation, so this session is using the shipped question bank." };
    }
    return { bank, note: "Loaded the question sets, questions, and images from Supabase." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { bank: null, note: `Could not reach Supabase (${message}). Using the copy shipped with this app.` };
  }
}

function cleanQuestion(question: Question): Question {
  return {
    ...question,
    accepted_answers: question.accepted_answers ?? [],
    hints: question.hints ?? [],
    image_asset_ids: question.image_asset_ids ?? [],
    source_identities: question.source_identities ?? [],
    asset_hashes: question.asset_hashes ?? [],
    choice_options: question.choice_options ?? undefined,
    clues: question.clues ?? undefined,
    forbidden_words: question.forbidden_words ?? undefined,
  };
}

function cleanAsset(asset: Asset): Asset {
  return {
    ...asset,
    license_url: asset.license_url ?? "",
    label: asset.label ?? undefined,
  };
}
