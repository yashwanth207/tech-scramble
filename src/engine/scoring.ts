export interface ScoreInput {
  points: number;
  hintsUsed: number;
  hintPenalty: number;
  elapsedMs: number;
  timeLimitMs: number;
  speedBonusMax: number;
}

export interface ScoreBreakdown {
  basePoints: number;
  speedBonus: number;
  total: number;
}

export function scoreCorrect(input: ScoreInput): ScoreBreakdown {
  const basePoints = Math.max(0, input.points - input.hintsUsed * input.hintPenalty);
  const limit = Math.max(0, input.timeLimitMs);
  const remaining = limit === 0 ? 0 : Math.max(0, limit - Math.max(0, input.elapsedMs));
  const ratio = limit === 0 ? 0 : remaining / limit;
  const speedBonus = Math.max(0, Math.min(input.speedBonusMax, Math.round(input.speedBonusMax * ratio)));
  return { basePoints, speedBonus, total: basePoints + speedBonus };
}

export function teamTotal(scores: { term: number; realai: number; taboo: number }): number {
  return scores.term + scores.realai + scores.taboo;
}
