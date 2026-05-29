import type { Db } from '~/lib/db';
import type { SessionUser } from '~/lib/auth/session';

export type Tier = 'free' | 'pro';
export type EntityKind = 'note' | 'anim' | 'block';

export interface Entity {
  kind: EntityKind;
  /** For notes/anims: slug or anim id. For blocks: `<noteSlug>:<key>`. */
  id: string;
  /** Default gate state from frontmatter / AnimMeta. */
  defaultPremium: boolean;
  /** Default preview slice length (paragraph count). */
  defaultPreviewParagraphs?: number;
}

export interface AccessResult {
  allowed: boolean;
  reason:
    | 'admin'             // user.role === 'admin', sees everything
    | 'free-and-not-gated' // anyone can read
    | 'paid-tier'         // user has tier='pro'
    | 'paywalled'         // free user, gated note/anim → paywall
    | 'block-paywalled';  // free user, gated <Premium> block → swap block only
  /** How much of the body should the preview slicer render. */
  previewParagraphs: number;
}

interface OverrideRow {
  premium: number;
  preview_paragraphs: number | null;
}

interface OverrideListRow extends OverrideRow {
  entity_kind: string;
  entity_id: string;
  updated_at: number;
}

export interface OverrideRecord {
  entityKind: EntityKind;
  entityId: string;
  premium: boolean;
  previewParagraphs: number | null;
  updatedAt: number;
}

export async function getEntitlement(db: Db, userId: string | null): Promise<Tier> {
  if (!userId) return 'free';
  const row = await db.first<{
    tier: string;
    status: string;
    current_period_end: number | null;
  }>(
    'SELECT tier, status, current_period_end FROM subscriptions WHERE user_id = ?',
    [userId],
  );
  if (!row || row.tier !== 'pro') return 'free';
  // cancelled_at_period_end keeps access until current_period_end elapses
  // (plan §14d). After that, the user's tier is effectively free even
  // though the row still says 'pro' — webhook would normally flip it
  // when subscription.completed fires, but we handle the lapse defensively.
  if (row.status === 'cancelled_at_period_end' && row.current_period_end != null) {
    if (row.current_period_end < Math.floor(Date.now() / 1000)) return 'free';
  }
  return 'pro';
}

async function getOverride(db: Db, kind: EntityKind, id: string): Promise<OverrideRow | null> {
  return db.first<OverrideRow>(
    'SELECT premium, preview_paragraphs FROM entitlement_overrides WHERE entity_kind = ? AND entity_id = ?',
    [kind, id],
  );
}

export async function isGated(db: Db, entity: Entity): Promise<boolean> {
  const override = await getOverride(db, entity.kind, entity.id);
  return override ? override.premium === 1 : entity.defaultPremium;
}

export async function getPreviewLength(db: Db, entity: Entity): Promise<number> {
  const override = await getOverride(db, entity.kind, entity.id);
  if (override?.preview_paragraphs != null) return override.preview_paragraphs;
  return entity.defaultPreviewParagraphs ?? 4;
}

/**
 * Single authoritative entry point used by SSR routes and the runtime
 * <Premium> component. Returns both the allow/deny verdict and the
 * preview length so callers don't need a second round-trip.
 */
export async function canAccess(
  db: Db,
  entity: Entity,
  user: SessionUser | null,
): Promise<AccessResult> {
  // Single query for the override — re-use the row to compute both
  // gate state and preview length.
  const override = await getOverride(db, entity.kind, entity.id);
  const gated = override ? override.premium === 1 : entity.defaultPremium;
  const previewParagraphs =
    override?.preview_paragraphs ?? entity.defaultPreviewParagraphs ?? 4;

  if (user?.role === 'admin') {
    return { allowed: true, reason: 'admin', previewParagraphs };
  }
  if (!gated) {
    return { allowed: true, reason: 'free-and-not-gated', previewParagraphs };
  }
  const tier = await getEntitlement(db, user?.id ?? null);
  if (tier === 'pro') {
    return { allowed: true, reason: 'paid-tier', previewParagraphs };
  }
  return {
    allowed: false,
    reason: entity.kind === 'block' ? 'block-paywalled' : 'paywalled',
    previewParagraphs,
  };
}

/* ------------------------------------------------------------------ */
/* Admin-panel mutations.                                             */
/* ------------------------------------------------------------------ */

export async function setOverride(
  db: Db,
  entity: Pick<Entity, 'kind' | 'id'>,
  premium: boolean,
  previewParagraphs: number | null,
  updatedBy: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.run(
    `INSERT INTO entitlement_overrides
       (entity_kind, entity_id, premium, preview_paragraphs, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (entity_kind, entity_id) DO UPDATE SET
       premium = excluded.premium,
       preview_paragraphs = excluded.preview_paragraphs,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
    [entity.kind, entity.id, premium ? 1 : 0, previewParagraphs, now, updatedBy],
  );
}

export async function clearOverride(
  db: Db,
  entity: Pick<Entity, 'kind' | 'id'>,
): Promise<void> {
  await db.run(
    'DELETE FROM entitlement_overrides WHERE entity_kind = ? AND entity_id = ?',
    [entity.kind, entity.id],
  );
}

export async function listOverrides(db: Db): Promise<OverrideRecord[]> {
  const rows = await db.query<OverrideListRow>(
    'SELECT entity_kind, entity_id, premium, preview_paragraphs, updated_at FROM entitlement_overrides',
  );
  return rows.map((r) => ({
    entityKind: r.entity_kind as EntityKind,
    entityId: r.entity_id,
    premium: r.premium === 1,
    previewParagraphs: r.preview_paragraphs,
    updatedAt: r.updated_at,
  }));
}
