import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { mcqs } from '~/lib/content-extract';
import type { McqRecord } from '~/lib/mistakes';

// Every quiz question on the site, keyed by its MCQ id, for the mistakes
// notebook (/review/mistakes/) to re-ask saved questions without
// re-rendering whole notes. Built once at build time from the notes'
// raw MDX.
export const prerender = true;

export const GET: APIRoute = async () => {
  const notes = (await getCollection('notes', (e) => !e.data.draft)).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const out: Record<string, McqRecord> = {};
  for (const note of notes) {
    for (const m of mcqs(note.id, note.body ?? '')) {
      out[m.id] = {
        q: m.q,
        options: m.options,
        answer: m.answer,
        explanationHtml: m.explanationHtml,
        noteSlug: note.id,
        noteTitle: note.data.title,
        phase: note.data.phase,
      };
    }
  }
  return new Response(JSON.stringify(out), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
