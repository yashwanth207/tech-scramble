export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function answerKeys(value: string): string[] {
  const spaced = normalizeAnswer(value);
  if (!spaced) return [];
  const compact = spaced.replace(/ /g, "");
  return compact === spaced ? [spaced] : [spaced, compact];
}

export function answersMatch(input: string, accepted: readonly string[]): boolean {
  const keys = new Set(answerKeys(input));
  if (keys.size === 0) return false;
  return accepted.some((candidate) => answerKeys(candidate).some((key) => keys.has(key)));
}

export function answerTokens(value: string): string[] {
  return normalizeAnswer(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

export function textLeaksAnswer(text: string, answer: string): boolean {
  const haystack = normalizeAnswer(text);
  if (!haystack) return false;
  const full = normalizeAnswer(answer);
  if (full.length >= 3 && haystack.includes(full)) return true;
  const compactHay = haystack.replace(/ /g, "");
  const compactFull = full.replace(/ /g, "");
  if (compactFull.length >= 3 && compactHay.includes(compactFull)) return true;
  return answerTokens(answer).some((token) => {
    if (token.length < 3) return false;
    const pattern = new RegExp(`(?:^| )${token}(?: |$)`);
    return pattern.test(haystack);
  });
}
