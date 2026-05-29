// Read animation color tokens from CSS custom properties on :root.
// This is how SVG fills become dark/light aware — instead of hardcoding hex.

const FALLBACK: Record<string, string> = {
  '--anim-node-default': '#94a3b8',
  '--anim-node-leader': '#10b981',
  '--anim-node-candidate': '#f59e0b',
  '--anim-node-follower': '#6366f1',
  '--anim-node-down': '#94a3b8',
  '--anim-edge-up': '#10b981',
  '--anim-edge-down': '#ef4444',
  '--anim-edge-idle': '#cbd5e1',
  '--anim-highlight': '#f59e0b',
  '--anim-success': '#10b981',
  '--anim-danger': '#ef4444',
  '--anim-pivot': '#ec4899',
  '--anim-compare': '#6366f1',
  '--anim-sorted': '#10b981',
  '--anim-text': '#0f172a',
  '--anim-text-muted': '#64748b',
  '--anim-bar-bg': '#e2e8f0',
};

export type ThemeToken = keyof typeof FALLBACK | string;

export function token(name: ThemeToken): string {
  if (typeof window === 'undefined') return FALLBACK[name] ?? '#888';
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || FALLBACK[name] || '#888';
}

/**
 * Subscribe to theme changes (data-theme attribute on <html>) so
 * an animation can re-paint its colors when the user toggles.
 */
export function onThemeChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const obs = new MutationObserver(() => cb());
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}
