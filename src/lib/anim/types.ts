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

export interface AnimModule {
  /** Stable URL slug + data-anim attribute. Lowercase kebab-case. */
  id: string;
  /** Shown in gallery cards + control bar. */
  title: string;
  /** One-line description — used for SEO, gallery card, screen readers. */
  caption: string;
  /** Used for filtering in /animations/. */
  tags: AnimTag[];
  /** "systems" or "dsa" pillar. */
  pillar: 'systems' | 'dsa';
  /** Default option values shown in the control bar. */
  defaults?: Record<string, number | string | boolean>;
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
