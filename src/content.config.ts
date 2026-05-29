import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import path from 'node:path';
import {
  baseNoteSchema,
  dsaSchema,
  roadmapNodeSchema,
} from './content/schemas';

// Slugs are globally unique across phases — flatten the id so the route
// param is just the file basename, matching the plan §4 URL shape
// /learn/notes/<slug>.
const flatId = (opts: { entry: string }): string =>
  path.basename(opts.entry, path.extname(opts.entry));

const notes = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/notes',
    generateId: flatId,
  }),
  schema: baseNoteSchema,
});

const dsa = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/dsa',
    generateId: flatId,
  }),
  schema: dsaSchema,
});

const roadmapNodes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/roadmap-nodes' }),
  schema: roadmapNodeSchema,
});

export const collections = {
  notes,
  dsa,
  'roadmap-nodes': roadmapNodes,
};
