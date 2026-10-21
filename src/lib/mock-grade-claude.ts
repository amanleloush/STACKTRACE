// The Claude call behind POST /api/v1/mock/grade: request shape, structured
// output schema, zod validation of what comes back, and SDK error mapping.
// Server-only (imports the SDK and zod); the page never loads this file.

import Anthropic from '@anthropic-ai/sdk';
import type {
  BetaMessage,
  MessageCreateParamsNonStreaming,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { z } from 'zod';
import {
  GRADE_MODEL,
  GRADING_INSTRUCTIONS,
  candidateBlock,
  normalizeGrade,
  referenceBlock,
  type Feedback,
  type GradeProblem,
} from './mock-grade';

/** Just the SDK surface we call, so tests can hand in a fake. A real
 *  `new Anthropic(...)` satisfies it. */
export interface GradeClient {
  beta: {
    messages: {
      create(params: MessageCreateParamsNonStreaming): PromiseLike<BetaMessage>;
    };
  };
}

export function makeClient(apiKey: string): GradeClient {
  // One retry (the SDK's default is two) and a 90 s ceiling keep a slow or
  // overloaded API from holding the request open for minutes.
  return new Anthropic({ apiKey, maxRetries: 1, timeout: 90_000 });
}

// JSON schema for `output_config.format`. Kept to the subset structured
// outputs accept (no numeric bounds or array lengths), so zod below does
// the strict checks and normalizeGrade() the clamping.
export const GRADE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rubric_scores', 'strengths', 'gaps', 'strong_answer'],
  properties: {
    rubric_scores: {
      type: 'array',
      description: 'One entry per rubric item, in rubric order.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'score', 'justification'],
        properties: {
          index: { type: 'integer', description: '0-based rubric item index, exactly as numbered in the rubric.' },
          score: { type: 'integer', enum: [0, 1, 2] },
          justification: { type: 'string', description: 'One sentence.' },
        },
      },
    },
    strengths: { type: 'array', items: { type: 'string' }, description: 'Exactly three.' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'The three most important, most important first.' },
    strong_answer: { type: 'string', description: 'One paragraph, plain prose.' },
  },
} as const;

/** Server-side gate on the model's JSON. Loose on numbers (normalizeGrade
 *  clamps them) but strict on shape. */
export const RawGradeSchema = z.object({
  rubric_scores: z
    .array(
      z.object({
        index: z.number().int(),
        score: z.number(),
        justification: z.string(),
      }),
    )
    .max(100),
  strengths: z.array(z.string()).max(20),
  gaps: z.array(z.string()).max(20),
  strong_answer: z.string(),
});

export function buildRequest(
  problem: GradeProblem,
  rubric: readonly string[],
  scratchpad: string,
  usedMinutes: number | null,
): MessageCreateParamsNonStreaming {
  return {
    model: GRADE_MODEL,
    max_tokens: 16_000,
    // Refusal fallbacks: if a safety classifier declines, the API re-runs the
    // request on Anthropic's recommended fallback model inside this call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Thinking is always on for this model; effort is the depth control
    // (its default is medium, set explicitly so a model swap keeps it).
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: GRADE_JSON_SCHEMA },
    },
    // Cache order: static instructions → per-problem reference → the
    // candidate's notes (uncached, always last).
    system: [{ type: 'text', text: GRADING_INSTRUCTIONS, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: referenceBlock(problem, rubric), cache_control: { type: 'ephemeral' } },
          { type: 'text', text: candidateBlock(scratchpad, usedMinutes) },
        ],
      },
    ],
  };
}

export type GradeOutcome =
  | { kind: 'ok'; feedback: Feedback }
  | { kind: 'refused' }
  | { kind: 'malformed' };

/** Turn a response into feedback. Refusals and anything that doesn't pass
 *  the schema are reported, never thrown or passed through. */
export function interpretResponse(msg: BetaMessage, rubric: readonly string[]): GradeOutcome {
  if (msg.stop_reason === 'refusal') return { kind: 'refused' };
  if (msg.stop_reason !== 'end_turn') return { kind: 'malformed' };
  // With fallbacks the content may also hold `fallback` / thinking blocks;
  // the structured answer is the last text block.
  const text = [...msg.content].reverse().find((b) => b.type === 'text');
  if (!text || text.type !== 'text') return { kind: 'malformed' };
  let raw: unknown;
  try {
    raw = JSON.parse(text.text);
  } catch {
    return { kind: 'malformed' };
  }
  const parsed = RawGradeSchema.safeParse(raw);
  if (!parsed.success) return { kind: 'malformed' };
  return { kind: 'ok', feedback: normalizeGrade(parsed.data, rubric) };
}

export async function gradeAttempt(
  client: GradeClient,
  problem: GradeProblem,
  rubric: readonly string[],
  scratchpad: string,
  usedMinutes: number | null,
): Promise<GradeOutcome> {
  const msg = await client.beta.messages.create(buildRequest(problem, rubric, scratchpad, usedMinutes));
  return interpretResponse(msg, rubric);
}

export interface MappedError {
  status: number;
  error: string;
  message: string;
  /** True when no tokens were spent, so the daily counter can be refunded. */
  refundable: boolean;
  /** Safe to log: class name and HTTP status only. */
  log: string;
}

/** SDK error → what the client sees. Most specific class first; note that
 *  APIConnectionError is a subclass of APIError in the TS SDK. */
export function mapError(e: unknown): MappedError {
  const busy = (log: string): MappedError => ({
    status: 503,
    error: 'busy',
    message: 'AI feedback is busy. Try again shortly.',
    refundable: true,
    log,
  });
  if (e instanceof Anthropic.RateLimitError) return busy('RateLimitError 429');
  if (e instanceof Anthropic.InternalServerError) return busy(`InternalServerError ${e.status}`);
  if (e instanceof Anthropic.APIConnectionError) return busy(e.constructor.name);
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return {
      status: 503,
      error: 'unavailable',
      message: 'AI feedback is not available right now.',
      refundable: true,
      log: `${e.constructor.name} ${e.status}`,
    };
  }
  if (e instanceof Anthropic.APIError) {
    // 400/404/413/422 etc.: our request is wrong; retrying won't help.
    return {
      status: 502,
      error: 'upstream_error',
      message: 'AI feedback failed. Please try again later.',
      refundable: true,
      log: `${e.constructor.name} ${e.status ?? ''}`.trim(),
    };
  }
  return {
    status: 500,
    error: 'internal',
    message: 'AI feedback failed. Please try again later.',
    refundable: false,
    log: (e as Error)?.name ?? 'Error',
  };
}
