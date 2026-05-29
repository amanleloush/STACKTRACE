// Pure Zod schemas extracted from src/content.config.ts so they can be
// imported by tests (and any other non-Astro consumer) without going
// through the `astro:content` virtual module.
import { z } from 'zod';

export const phaseSlug = z.string().regex(
  /^[0-9]{2}-[a-z0-9-]+$/,
  'phase must look like "05-distributed-systems"',
);

export const animTag = z.enum([
  'distsys',
  'consensus',
  'db',
  'caching',
  'messaging',
  'networking',
  'sharding',
  'rate-limit',
  'sorting',
  'searching',
  'tree',
  'graph',
  'hashing',
  'dp',
  'string',
  'greedy',
  'linked-list',
  'stack-queue',
]);

export const baseNoteSchema = z.object({
  title: z.string().min(1),
  phase: phaseSlug,
  order: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
  premium: z.boolean().default(false),
  previewParagraphs: z.number().int().positive().default(4),
  estimatedMinutes: z.number().int().positive().optional(),
  prerequisites: z.array(z.string()).default([]),
  summary: z.string().optional(),
  draft: z.boolean().default(false),
});

export const dsaSchema = baseNoteSchema.extend({
  complexity: z
    .object({
      time: z.string(),
      space: z.string(),
    })
    .optional(),
  commonPitfalls: z.array(z.string()).default([]),
  relatedAnims: z.array(z.string()).default([]),
  tags: z.array(animTag).default([]),
});

export const roadmapNodeSchema = z.object({
  pillar: z.enum(['systems', 'dsa']),
  target: z.string().min(1),
  label: z.string().min(1),
  phase: phaseSlug,
  order: z.number().int().nonnegative(),
  requires: z.array(z.string()).default([]),
  summary: z.string().optional(),
  premium: z.boolean().default(false),
});
