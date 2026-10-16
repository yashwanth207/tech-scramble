import type { GameMode } from "../engine/types.ts";

const KEY = "techverse-exposure-v1";

export interface Exposure {
  ids: string[];
  sequences: Partial<Record<GameMode, string[]>>;
}

const empty: Exposure = { ids: [], sequences: {} };

export function loadExposure(): Exposure {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Exposure;
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids.slice(-400) : [],
      sequences: parsed.sequences ?? {},
    };
  } catch {
    return empty;
  }
}

export function rememberExposure(ids: string[], sequences: Partial<Record<GameMode, string[]>>) {
  const current = loadExposure();
  const merged = [...new Set([...current.ids, ...ids])].slice(-400);
  localStorage.setItem(KEY, JSON.stringify({ ids: merged, sequences: { ...current.sequences, ...sequences } }));
}

export function clearExposure() {
  localStorage.removeItem(KEY);
}
