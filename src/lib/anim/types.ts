export type AnimTag =
  | 'distsys'
  | 'consensus'
  | 'db'
  | 'caching'
  | 'messaging'
  | 'networking'
  | 'sharding'
  | 'rate-limit'
  | 'sorting'
  | 'searching'
  | 'tree'
  | 'graph'
  | 'hashing'
  | 'dp'
  | 'string'
  | 'greedy'
  | 'linked-list'
  | 'stack-queue';

/**
 * Lightweight metadata for an animation. Lives in `src/anims/<id>/meta.ts`
 * and is eagerly bundled into the registry so the gallery / landing page
 * can list, filter, and link to anims without paying the cost of every
 * animation's mount code.
 */
export interface AnimMeta {
  /** Stable URL slug + data-anim attribute. MUST equal the parent directory name. */
  id: string;
  /** Shown in gallery cards + control bar. */
  title: string;
  /** One-line description — used for SEO, gallery card, screen readers. */
  caption: string;
  /** Used for filtering in /animations/. */
  tags: AnimTag[];
  /** Curriculum pillar. */
  pillar: 'systems' | 'dsa';
  /** Roadmap phase slug (e.g. '05-distributed-systems'). Optional — drives sort order in listings. */
  phase?: string;
  /** Sort position inside a phase. Lower first. */
  order?: number;
  /** Default premium gate. Authoritative state lives in D1 `entitlement_overrides`. */
  premium?: boolean;
  /** Default option values shown in the control bar. */
  defaults?: Record<string, number | string | boolean>;
}

/**
 * The full animation module: metadata + the mount function.
 * Lives in `src/anims/<id>/index.ts` and is **lazy-loaded** — only fetched
 * when the runtime actually needs to mount this anim on a host element.
 */
export interface AnimModule extends AnimMeta {
  /**
   * Mount the animation. Receives the host element (already styled .anim).
   * Must return a handle so the runtime can pause/resume/destroy.
   */
  mount(host: HTMLElement, opts?: Record<string, unknown>): AnimHandle;
}

export interface AnimHandle {
  /** Called when the host scrolls off-screen. Stop any rAF/timer here. */
  pause(): void;
  /** Called when the host scrolls back into view. */
  resume(): void;
  /** Reset the animation to its initial state. */
  reset(): void;
  /** Full teardown: remove listeners, clear timers, empty the host. */
  destroy(): void;
}
