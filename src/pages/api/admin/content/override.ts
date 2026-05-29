import type { APIRoute } from 'astro';
import { getDb } from '~/lib/db';
import { setOverride, clearOverride, type EntityKind } from '~/lib/billing/entitlement';

export const prerender = false;

function bail(status: number, msg: string): Response {
  return new Response(msg, { status });
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Middleware has already 404'd non-admins; this is a defense-in-depth check.
  const user = locals.user;
  if (user?.role !== 'admin') return bail(404, 'Not found');

  const form = await request.formData();
  const kind = String(form.get('kind') ?? '');
  const id = String(form.get('id') ?? '');
  const action = String(form.get('action') ?? '');
  const premiumRaw = String(form.get('premium') ?? '');
  const previewRaw = form.get('previewParagraphs');

  if (kind !== 'note' && kind !== 'anim' && kind !== 'block') {
    return bail(400, `invalid kind: ${kind}`);
  }
  if (!id) return bail(400, 'missing id');

  const env = locals.runtime?.env;
  const db = await getDb({ env });

  let flash: string;
  if (action === 'clear') {
    await clearOverride(db, { kind: kind as EntityKind, id });
    flash = `Reset override for ${kind}:${id}`;
  } else {
    const premium = premiumRaw === '1' || premiumRaw === 'true';
    const previewParagraphs = previewRaw == null || previewRaw === '' ? null : Number(previewRaw);
    if (previewParagraphs != null && !Number.isFinite(previewParagraphs)) {
      return bail(400, 'previewParagraphs must be a number');
    }
    await setOverride(db, { kind: kind as EntityKind, id }, premium, previewParagraphs, user.id);
    flash = `${premium ? 'Gated' : 'Freed'} ${kind}:${id}`;
  }

  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/content/?flash=${encodeURIComponent(flash)}` },
  });
};
