// Prerendered /mock/problems.json: brief, 60-second answer and TL;DR HTML
// for every mock-round problem. The /mock/ page fetches it when a round
// starts, so the page itself only carries the picker list.

import type { APIRoute } from 'astro';
import { loadMockProblems } from '~/components/mock/load-problems';

export const prerender = true;

export const GET: APIRoute = async () => {
  const problems = await loadMockProblems();
  const bySlug = Object.fromEntries(problems.map((p) => [p.slug, p]));
  return new Response(JSON.stringify(bySlug), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
