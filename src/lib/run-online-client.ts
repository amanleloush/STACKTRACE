// Click handler for the LLD "Run this program in an online compiler" button
// (inserted by src/lib/remark-run-online.ts). Reads the program from the code
// block just above the button and opens it in Compiler Explorer.
//
// Short programs open straight from a /clientstate/ URL. Long ones would get
// 414 URI Too Long from godbolt.org, so they go through its public
// /api/shortener first (CORS-enabled), which returns a godbolt.org/z/... link.
// The code is sent to godbolt.org only when the reader clicks.

import { GODBOLT_ORIGIN, godboltState, godboltUrl } from './code-tabs';

/** Longest /clientstate/ URL we open directly; godbolt accepts ~6 KB URLs
 *  (the longest DSA link, 5.9 KB, loads) and rejects 13 KB ones. */
export const MAX_DIRECT_URL = 6000;

export type RunTarget = { kind: 'url'; url: string } | { kind: 'shorten'; body: string };

/** Pure: how to open this program. */
export function runTarget(program: string): RunTarget {
  const url = godboltUrl('java', program);
  if (url.length <= MAX_DIRECT_URL) return { kind: 'url', url };
  return { kind: 'shorten', body: JSON.stringify(godboltState('java', program)) };
}

/** Pure: accept only a godbolt.org short link from the shortener reply. */
export function shortUrlFrom(reply: unknown): string | null {
  const url = (reply as { url?: unknown } | null)?.url;
  return typeof url === 'string' && url.startsWith(`${GODBOLT_ORIGIN}/z/`) ? url : null;
}

function programFor(button: HTMLElement): string | null {
  const para = button.closest('.run-online');
  let el = para?.previousElementSibling ?? null;
  // Skip anything between the program and the button (none today).
  while (el && el.tagName !== 'PRE' && !el.querySelector('pre')) el = el.previousElementSibling;
  const pre = el?.tagName === 'PRE' ? el : el?.querySelector('pre');
  return pre?.textContent ?? null;
}

async function open(button: HTMLButtonElement): Promise<void> {
  const program = programFor(button);
  if (!program) return;
  const target = runTarget(program);
  if (target.kind === 'url') {
    window.open(target.url, '_blank', 'noopener');
    return;
  }
  // Open the tab now, inside the click, so popup blockers allow it; point it
  // at the short link once the shortener answers.
  const tab = window.open('about:blank', '_blank');
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Opening Compiler Explorer…';
  try {
    const res = await fetch(`${GODBOLT_ORIGIN}/api/shortener`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: target.body,
    });
    const url = res.ok ? shortUrlFrom(await res.json()) : null;
    if (!url) throw new Error('no short link');
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch {
    tab?.close();
    try {
      await navigator.clipboard.writeText(program);
      button.textContent = 'Couldn’t reach Compiler Explorer. Code copied; paste it at godbolt.org';
    } catch {
      button.textContent = 'Couldn’t reach Compiler Explorer. Copy the code above into godbolt.org';
    }
    setTimeout(() => {
      button.textContent = label;
    }, 6000);
    return;
  } finally {
    button.disabled = false;
  }
  button.textContent = label;
}

export function initRunOnline(): void {
  document.addEventListener('click', (e) => {
    const button = (e.target as Element | null)?.closest?.('[data-run-online]');
    if (button instanceof HTMLButtonElement) void open(button);
  });
}
