import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildOneLinerCards } from '~/lib/review-cards';

// One-liner flash cards for the daily review queue (/review/): one per note
// and per DSA page, in course order. Built once at build time from the raw
// MDX (see src/lib/review-cards.ts).
export const prerender = true;

export const GET: APIRoute = async () => {
  const [notes, dsa] = await Promise.all([
    getCollection('notes', (e) => !e.data.draft),
    getCollection('dsa', (e) => !e.data.draft),
  ]);
  return new Response(JSON.stringify(buildOneLinerCards(notes, dsa)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
