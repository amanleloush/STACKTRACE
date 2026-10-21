// Pure helpers behind <CodeTabs>: language normalisation, splicing a
// solution into its driver to make a runnable program, and building the
// Compiler Explorer (godbolt.org) link that opens that program with an
// executor pane already showing its output.
//
// No DOM, no Node-only APIs (btoa is global in Node 16+ and browsers), so
// the remark plugin, the component and the tests all share it.

export type TabLang = 'cpp' | 'java' | 'python';

/** Tab order on the page; C++ is first and the default selection. */
export const TAB_LANGS: readonly TabLang[] = ['cpp', 'java', 'python'];
export const DEFAULT_LANG: TabLang = 'cpp';

export const LANG_LABEL: Record<TabLang, string> = {
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
};

/** localStorage key holding the reader's chosen language, site-wide. */
export const LANG_STORAGE_KEY = 'codetabs:v1:lang';

/** Fence info strings an author may use, mapped to a tab. */
const FENCE_ALIASES: Record<string, TabLang> = {
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  java: 'java',
  python: 'python',
  py: 'python',
  python3: 'python',
};

export function normalizeLang(fence: string | null | undefined): TabLang | null {
  if (!fence) return null;
  return FENCE_ALIASES[fence.trim().toLowerCase()] ?? null;
}

export function isTabLang(v: unknown): v is TabLang {
  return typeof v === 'string' && (TAB_LANGS as readonly string[]).includes(v);
}

/**
 * Compiler Explorer settings per tab. Ids verified against
 * https://godbolt.org/api/compilers/{c++,java,python}. Bump them here (one
 * place) when godbolt retires a version.
 */
export const GODBOLT: Record<TabLang, { language: string; compiler: string; options: string }> = {
  cpp: { language: 'c++', compiler: 'g152', options: '-std=c++20 -O2' }, // x86-64 gcc 15.2
  java: { language: 'java', compiler: 'java2102', options: '' }, // jdk 21.0.2 (LTS)
  python: { language: 'python', compiler: 'python313', options: '' }, // CPython 3.13
};

export const GODBOLT_ORIGIN = 'https://godbolt.org';

/** A line that marks where the solution goes inside a driver. */
const MARKER = /^[ \t]*(?:\/\/|#)[ \t]*@solution[ \t]*$/m;

/**
 * The full runnable program: the driver with its `// @solution` (or
 * `# @solution`) marker line replaced by the solution. Without a marker the
 * solution goes first and the driver after it. Without a driver the
 * solution is the program.
 */
export function assembleProgram(solution: string, driver?: string | null): string {
  const sol = solution.replace(/\s+$/, '');
  if (driver == null || driver.trim() === '') return sol + '\n';
  const drv = driver.replace(/\s+$/, '');
  if (MARKER.test(drv)) {
    // Function replacer so `$&`-style sequences in code stay literal.
    return drv.replace(MARKER, () => sol) + '\n';
  }
  return `${sol}\n\n${drv}\n`;
}

export function hasSolutionMarker(driver: string): boolean {
  return MARKER.test(driver);
}

/**
 * Godbolt compiles Java as `example.java`, and javac rejects a *public*
 * top-level class whose name doesn't match the file. Locally the driver is
 * `public class Main` in Main.java, so drop `public` from top-level
 * (column-0) class declarations for godbolt only. Its runner finds the class
 * with `main` by itself.
 */
export function godboltSource(lang: TabLang, program: string): string {
  if (lang !== 'java') return program;
  return program.replace(/^public\s+((?:final\s+|abstract\s+)*)class\s/gm, '$1class ');
}

/**
 * Godbolt's /clientstate/ asks for non-ASCII to be \u-escaped before
 * base64 (its docs suggest /[\u007F-￿]/g). JSON parsing turns the
 * escapes back into the same characters.
 */
function asciiJson(value: unknown): string {
  return JSON.stringify(value).replace(
    /[\u007f-￿]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  );
}

/** base64url without padding; godbolt decodes with Node's lenient base64. */
export function base64UrlAscii(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The ClientState object (lib/clientstate.ts in compiler-explorer). */
export function godboltState(lang: TabLang, program: string) {
  const g = GODBOLT[lang];
  return {
    sessions: [
      {
        id: 1,
        language: g.language,
        source: godboltSource(lang, program),
        compilers: [],
        executors: [
          {
            compiler: { id: g.compiler, libs: [], options: g.options },
            // Show compile errors if the reader edits the code into one.
            compilerOutputVisible: true,
            compilerVisible: false,
            arguments: '',
            argumentsVisible: false,
            stdin: '',
            stdinVisible: false,
            wrap: false,
          },
        ],
      },
    ],
  };
}

/** Deterministic: the same program always gives the same URL. */
export function godboltUrl(lang: TabLang, program: string): string {
  return `${GODBOLT_ORIGIN}/clientstate/${base64UrlAscii(asciiJson(godboltState(lang, program)))}`;
}

/** Inverse of godboltUrl, for tests and debugging. */
export function decodeGodboltUrl(url: string): ReturnType<typeof godboltState> {
  const b64 = url.slice(url.indexOf('/clientstate/') + '/clientstate/'.length);
  const std = b64.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(std + '='.repeat((4 - (std.length % 4)) % 4)));
}

/** What the remark plugin hands <CodeTabs> for each tab. */
export interface TabMeta {
  lang: TabLang;
  label: string;
  runUrl: string;
  hasDriver: boolean;
}

/** Coerce the `tabs` prop (a JSON string written by the remark plugin). */
export function parseTabsProp(raw: unknown): TabMeta[] {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: TabMeta[] = [];
  for (const t of v) {
    if (!t || typeof t !== 'object') continue;
    const o = t as Record<string, unknown>;
    if (!isTabLang(o.lang) || out.some((x) => x.lang === o.lang)) continue;
    const runUrl =
      typeof o.runUrl === 'string' && o.runUrl.startsWith(`${GODBOLT_ORIGIN}/`) ? o.runUrl : '';
    out.push({ lang: o.lang, label: LANG_LABEL[o.lang], runUrl, hasDriver: o.hasDriver === true });
  }
  return out;
}
