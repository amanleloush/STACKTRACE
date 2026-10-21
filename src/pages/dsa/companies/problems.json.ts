import type { APIRoute } from 'astro';
import { COMPANY_NAMES, PROBLEMS } from '~/lib/company-data';

/**
 * GET /dsa/companies/problems.json — prerendered, compact lookup used by the
 * client on /dsa/companies/ (per-company solved counts) and /dsa/my-notes/
 * (titles + companies for saved problems). Only fetched when the visitor has
 * local progress, and cached like any static asset.
 *
 * Shape: { companies: { [slug]: name },
 *          problems: { [slug]: [title, 'E' | 'M' | 'H', companySlugs[]] } }
 */
export const GET: APIRoute = () => {
  const problems: Record<string, [string, string, string[]]> = {};
  for (const [slug, p] of Object.entries(PROBLEMS)) {
    problems[slug] = [p.title, p.difficulty[0]!, p.companies];
  }
  return new Response(JSON.stringify({ companies: COMPANY_NAMES, problems }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
