export const MATCH_LABELS: Record<number, string> = {
  0: "NOT FOUND",
  1: "NO MATCH",
  2: "CLOSE MATCH",
  3: "FULL MATCH",
} as const;

export type MatchResult = 0 | 1 | 2 | 3;

const normalize = (value: string): string => {
  let normalized = "";
  let lastWasSpace = true;

  for (const char of value) {
    const code = char.charCodeAt(0);
    const lowerCode = code >= 65 && code <= 90 ? code + 32 : code;
    const isLetterOrDigit =
      (lowerCode >= 97 && lowerCode <= 122) || (lowerCode >= 48 && lowerCode <= 57);

    if (isLetterOrDigit) {
      normalized += String.fromCharCode(lowerCode);
      lastWasSpace = false;
    } else if (code === 32 && !lastWasSpace) {
      normalized += " ";
      lastWasSpace = true;
    }
  }

  return normalized.endsWith(" ") ? normalized.slice(0, -1) : normalized;
};

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    [previous, current] = [current, previous];
  }

  return previous[b.length];
}

function closeThreshold(length: number): number {
  if (length >= 24) return 3;
  if (length >= 12) return 2;
  if (length >= 5) return 1;
  return 0;
}

export function predictCheck(candidates: readonly string[], name: string): {
  result: MatchResult;
  matchedAs: string;
} {
  const query = normalize(name);
  if (!query || candidates.length === 0) return { result: 0, matchedAs: "" };

  let closeMatch = "";
  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate);
    const distance = levenshtein(query, normalizedCandidate);

    if (distance === 0) return { result: 3, matchedAs: candidate };
    if (
      !closeMatch &&
      distance <= closeThreshold(Math.max(query.length, normalizedCandidate.length))
    ) {
      closeMatch = candidate;
    }
  }

  return closeMatch
    ? { result: 2, matchedAs: closeMatch }
    : { result: 1, matchedAs: "" };
}

export function verdictExplainer(result: MatchResult, matchedAs: string): string {
  switch (result) {
    case 3:
      return `The name matches the registered identity${matchedAs ? ` “${matchedAs}”` : ""}.`;
    case 2:
      return `The name is close to${matchedAs ? ` “${matchedAs}”` : " a registered identity"}. Check it carefully before paying.`;
    case 1:
      return "This address is registered, but the name does not match any accepted identity.";
    case 0:
      return "No identity is registered for this address, or no name was provided.";
  }
}
