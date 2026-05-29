export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Throttle to one fire per animation frame — pairs with rAF loops. */
export function rafThrottle<T extends (...args: never[]) => void>(fn: T): T {
  let scheduled = false;
  let lastArgs: unknown[] = [];
  const wrapped = (...args: unknown[]) => {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fn as any)(...lastArgs);
    });
  };
  return wrapped as unknown as T;
}
