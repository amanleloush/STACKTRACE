// Client helper for the prerendered /dsa/companies/problems.json lookup.
// One fetch per page, shared by every caller.

export interface ProblemLookup {
  companies: Record<string, string>;
  /** slug → [title, 'E' | 'M' | 'H', companySlugs[]] */
  problems: Record<string, [string, string, string[]]>;
}

const DIFF: Record<string, string> = { E: 'Easy', M: 'Medium', H: 'Hard' };
export function difficultyName(code: string): string {
  return DIFF[code] ?? code;
}

let cached: Promise<ProblemLookup | null> | null = null;

export function loadProblemLookup(): Promise<ProblemLookup | null> {
  cached ??= fetch('/dsa/companies/problems.json')
    .then((r) => (r.ok ? (r.json() as Promise<ProblemLookup>) : null))
    .catch(() => null);
  return cached;
}
