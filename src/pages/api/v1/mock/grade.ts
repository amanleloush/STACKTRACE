import { loadMockProblems } from '~/components/mock/load-problems';
import type { GradeProblem } from '~/lib/mock-grade';
import { makeClient } from '~/lib/mock-grade-claude';
import { gradeRoute } from '~/lib/mock-grade-route';

export const prerender = false;

// AI feedback on a finished /mock/ round (signed-in users, daily cap in KV).
// Contract, limits and error codes: src/lib/mock-grade-route.ts.
//
// Setup: `wrangler secret put ANTHROPIC_API_KEY`; optional `AI_DAILY_LIMIT`
// var (default 5 gradings per user per UTC day). Without the key every
// call returns 503 `not_configured` and /mock/ explains that.

// The reference material is the same build-time data /mock/problems.json
// serves, built once per isolate from the notes collection.
let problemsP: Promise<Record<string, GradeProblem>> | null = null;
function loadProblems(): Promise<Record<string, GradeProblem>> {
  problemsP ??= loadMockProblems()
    .then((list) => Object.fromEntries(list.map((p) => [p.slug, p])))
    .catch((e: unknown) => {
      problemsP = null; // retry on the next request
      throw e;
    });
  return problemsP;
}

export const { GET, POST } = gradeRoute({ loadProblems, makeClient });
