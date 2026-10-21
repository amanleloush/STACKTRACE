// GET + POST handlers for /api/v1/mock/grade, built by a factory so tests
// can inject the problem list and a fake SDK client. The route file wires
// in the real ones.
//
// GET  → 200 `{ limit, used, remaining }` for the signed-in user.
// POST body `{ slug, scratchpad, usedMinutes? }`
//      → 200 `{ feedback, limit, remaining }`
//
// Errors, in the order they are checked:
//   503 `not_configured`  ANTHROPIC_API_KEY unset (the page hides the button)
//   401 anon · 415 non-JSON · 413 body too large / scratchpad > 8,000 chars
//   400 bad JSON / empty scratchpad · 404 unknown problem slug
//   503 KV unavailable · 429 daily cap reached (`remaining: 0`)
//   503 `busy` on API 429 / 5xx / overloaded / network: "try again shortly"
//   422 `refused` the model declined (after server-side fallback)
//   502 model output failed validation, or another API error
//
// Never logged: the scratchpad, the API key, the user id. Logs carry the
// error class and HTTP status only.

import type { APIRoute } from 'astro';
import { RUBRICS } from '~/components/mock/mock-logic';
import { json } from './api/json';
import { byteLength, getKv } from './kv-doc';
import type { KVNamespace } from './kv';
import {
  checkScratchpad,
  coerceMinutes,
  dailyKey,
  parseCount,
  parseDailyLimit,
  remainingToday,
  type GradeProblem,
} from './mock-grade';
import { gradeAttempt, mapError, type GradeClient } from './mock-grade-claude';

/** Scratchpad (8,000 chars, up to 4 bytes each) plus a little JSON. */
export const MAX_GRADE_BODY_BYTES = 40_000;

/** Counters outlive their day by a margin, then KV drops them. */
const COUNTER_TTL_S = 2 * 24 * 60 * 60;

export interface GradeEnv {
  ANTHROPIC_API_KEY?: string;
  AI_DAILY_LIMIT?: string;
  KV?: KVNamespace;
}

export interface GradeRouteDeps {
  /** Problem reference material by slug: the same build-time data as
   *  /mock/problems.json. Never taken from the client. */
  loadProblems: () => Promise<Record<string, GradeProblem>>;
  makeClient: (apiKey: string) => GradeClient;
  now?: () => number;
}

type Locals = App.Locals;

function envOf(locals: Locals): GradeEnv {
  return (locals.runtime?.env ?? {}) as GradeEnv;
}

function apiKeyOf(locals: Locals): string | null {
  const k = envOf(locals).ANTHROPIC_API_KEY;
  return typeof k === 'string' && k.trim() ? k.trim() : null;
}

const notConfigured = () =>
  json(503, { error: 'not_configured', message: 'AI feedback is not enabled on this site' });

const kvUnavailable = () => {
  const res = json(503, { error: 'unavailable', message: 'AI feedback is temporarily unavailable', retryable: true });
  res.headers.set('Retry-After', '5');
  return res;
};

async function readUsed(kv: KVNamespace, key: string): Promise<number> {
  return parseCount(await kv.get(key));
}

async function writeUsed(kv: KVNamespace, key: string, n: number): Promise<void> {
  await kv.put(key, String(Math.max(0, n)), { expirationTtl: COUNTER_TTL_S });
}

export function gradeRoute(deps: GradeRouteDeps): { GET: APIRoute; POST: APIRoute } {
  const now = deps.now ?? Date.now;

  const GET: APIRoute = async ({ locals }) => {
    if (!apiKeyOf(locals)) return notConfigured();
    const user = locals.user;
    if (!user) return json(401, { error: 'unauthenticated', message: 'Sign in required' });
    const kv = getKv(locals);
    if (!kv) return kvUnavailable();
    const limit = parseDailyLimit(envOf(locals).AI_DAILY_LIMIT);
    try {
      const used = await readUsed(kv, dailyKey(user.id, now()));
      return json(200, { limit, used: Math.min(used, limit), remaining: remainingToday(used, limit) });
    } catch (e) {
      console.error('[mock/grade] get:', (e as Error)?.name ?? 'Error');
      return kvUnavailable();
    }
  };

  const POST: APIRoute = async ({ locals, request }) => {
    const apiKey = apiKeyOf(locals);
    if (!apiKey) return notConfigured();
    const user = locals.user;
    if (!user) return json(401, { error: 'unauthenticated', message: 'Sign in required' });

    // JSON-only (forces a CORS preflight, which keeps this cookie-auth POST
    // CSRF-safe), size-checked before parsing.
    const ctype = request.headers.get('Content-Type') ?? '';
    if (!ctype.toLowerCase().startsWith('application/json')) {
      return json(415, { error: 'unsupported_media_type', message: 'Content-Type must be application/json' });
    }
    if (Number(request.headers.get('Content-Length') ?? '0') > MAX_GRADE_BODY_BYTES) {
      return json(413, { error: 'too_large', message: 'Request body too large' });
    }
    const raw = await request.text();
    if (byteLength(raw) > MAX_GRADE_BODY_BYTES) {
      return json(413, { error: 'too_large', message: 'Request body too large' });
    }
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('shape');
      body = parsed as Record<string, unknown>;
    } catch {
      return json(400, { error: 'invalid_json', message: 'Body must be a JSON object' });
    }

    const pad = checkScratchpad(body.scratchpad);
    if (!pad.ok) return json(pad.status, { error: pad.error, message: pad.message });

    const slug = typeof body.slug === 'string' ? body.slug : '';
    const problems = await deps.loadProblems();
    const problem = Object.prototype.hasOwnProperty.call(problems, slug) ? problems[slug] : undefined;
    if (!problem) return json(404, { error: 'unknown_problem', message: 'Unknown mock problem' });
    const rubric = RUBRICS[problem.mode];

    const kv = getKv(locals);
    if (!kv) return kvUnavailable();
    const limit = parseDailyLimit(envOf(locals).AI_DAILY_LIMIT);
    const key = dailyKey(user.id, now());

    // Best-effort cap: read, check, then count this grading BEFORE calling
    // the API so a burst of parallel requests is mostly stopped. KV has no
    // atomic increment, so concurrent requests can still slip past by one
    // or two (see mock-grade.ts).
    let used: number;
    try {
      used = await readUsed(kv, key);
      if (used >= limit) {
        return json(429, {
          error: 'daily_limit',
          message: `You've used all ${limit} AI gradings for today. They reset at 00:00 UTC.`,
          limit,
          remaining: 0,
        });
      }
      await writeUsed(kv, key, used + 1);
    } catch (e) {
      console.error('[mock/grade] counter:', (e as Error)?.name ?? 'Error');
      return kvUnavailable();
    }
    const remaining = remainingToday(used + 1, limit);

    try {
      const outcome = await gradeAttempt(
        deps.makeClient(apiKey),
        problem,
        rubric,
        pad.text,
        coerceMinutes(body.usedMinutes),
      );
      if (outcome.kind === 'refused') {
        return json(422, {
          error: 'refused',
          message: 'The AI declined to grade this attempt. Your self-score still stands.',
          limit,
          remaining,
        });
      }
      if (outcome.kind === 'malformed') {
        console.error('[mock/grade] model output failed validation');
        return json(502, {
          error: 'bad_output',
          message: 'The AI feedback came back malformed. Please try again.',
          limit,
          remaining,
        });
      }
      return json(200, { feedback: outcome.feedback, limit, remaining });
    } catch (e) {
      const m = mapError(e);
      console.error('[mock/grade] api:', m.log);
      let left = remaining;
      if (m.refundable) {
        // Nothing was billed: give the grading back (best effort, and
        // subject to the same race as above).
        try {
          await writeUsed(kv, key, used);
          left = remainingToday(used, limit);
        } catch {
          /* keep the conservative count */
        }
      }
      const res = json(m.status, { error: m.error, message: m.message, limit, remaining: left });
      if (m.status === 503) res.headers.set('Retry-After', '10');
      return res;
    }
  };

  return { GET, POST };
}
