// Astro-side loader: non-draft notes from the collection -> mock problems.
// Kept apart from mock-problems.ts so that module stays importable in tests
// without the `astro:content` virtual module.

import { getCollection } from 'astro:content';
import { buildProblems, modeFor, type MockProblem } from './mock-problems';

export async function loadMockProblems(): Promise<MockProblem[]> {
  const notes = await getCollection(
    'notes',
    (n) => !n.data.draft && modeFor({ phase: n.data.phase, slug: n.id }) !== null,
  );
  return buildProblems(
    notes.map((n) => ({
      slug: n.id,
      title: n.data.title,
      phase: n.data.phase,
      order: n.data.order,
      premium: n.data.premium,
      body: n.body ?? '',
    })),
  );
}
