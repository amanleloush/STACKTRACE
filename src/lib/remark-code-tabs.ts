// Remark plugin for <CodeTabs> (authoring format documented at the top of
// src/components/CodeTabs.astro).
//
// It turns the fenced blocks inside each <CodeTabs> into named slots the
// component lays out as tabs:
//   slot "<lang>"       the solution, as an ordinary fenced block
//   slot "<lang>-full"  solution spliced into its driver (only with a driver)
// Both stay mdast `code` nodes, so Shiki highlights them like any other
// block. The raw text is used here, at build time, to precompute each tab's
// godbolt.org link, which is passed down in the `tabs` prop. Authoring
// mistakes (unknown language, duplicates, stray prose) fail the build with
// the file name, rather than rendering a half-broken widget.

import type { Root, Code, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import {
  LANG_LABEL,
  TAB_LANGS,
  assembleProgram,
  godboltUrl,
  normalizeLang,
  type TabLang,
  type TabMeta,
} from './code-tabs.ts';

export const COMPONENT_NAME = 'CodeTabs';

interface Parts {
  solution?: string;
  driver?: string;
}

/** Meta words on a fence: ```cpp driver → ['driver']. */
function metaWords(meta: string | null | undefined): string[] {
  return (meta ?? '').split(/\s+/).filter(Boolean);
}

export class CodeTabsError extends Error {}

/**
 * Group a <CodeTabs> element's fenced blocks by language. Exported for tests.
 * Throws CodeTabsError on anything an author should fix.
 */
export function collectParts(children: readonly RootContent[]): Map<TabLang, Parts> {
  const parts = new Map<TabLang, Parts>();
  for (const child of children) {
    if (child.type !== 'code') {
      throw new CodeTabsError(
        `<${COMPONENT_NAME}> may only contain fenced code blocks (found ${child.type})`,
      );
    }
    const lang = normalizeLang(child.lang);
    if (!lang) {
      throw new CodeTabsError(
        `<${COMPONENT_NAME}>: unsupported language "${child.lang ?? ''}" (use cpp, java or python)`,
      );
    }
    const words = metaWords(child.meta);
    const unknown = words.filter((w) => w !== 'driver');
    if (unknown.length) {
      throw new CodeTabsError(`<${COMPONENT_NAME}>: unknown fence meta "${unknown.join(' ')}"`);
    }
    const role: keyof Parts = words.includes('driver') ? 'driver' : 'solution';
    const p = parts.get(lang) ?? {};
    if (p[role] !== undefined) {
      throw new CodeTabsError(`<${COMPONENT_NAME}>: two ${role} blocks for ${lang}`);
    }
    p[role] = child.value;
    parts.set(lang, p);
  }
  for (const [lang, p] of parts) {
    if (p.solution === undefined) {
      throw new CodeTabsError(`<${COMPONENT_NAME}>: ${lang} has a driver but no solution block`);
    }
  }
  if (parts.size === 0) throw new CodeTabsError(`<${COMPONENT_NAME}> is empty`);
  return parts;
}

const attr = (name: string, value: string): MdxJsxAttribute => ({
  type: 'mdxJsxAttribute',
  name,
  value,
});

const slotDiv = (slot: string, code: Code): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'div',
  attributes: [attr('slot', slot)],
  children: [code],
});

/** Rewrite one <CodeTabs> element in place. `uid` must be unique per page. */
export function transformCodeTabs(node: MdxJsxFlowElement, uid: string): TabMeta[] {
  const parts = collectParts(node.children as RootContent[]);
  const tabs: TabMeta[] = [];
  const children: MdxJsxFlowElement[] = [];
  for (const lang of TAB_LANGS) {
    const p = parts.get(lang);
    if (!p || p.solution === undefined) continue;
    const program = assembleProgram(p.solution, p.driver);
    const hasDriver = p.driver !== undefined;
    tabs.push({ lang, label: LANG_LABEL[lang], runUrl: godboltUrl(lang, program), hasDriver });
    children.push(slotDiv(lang, { type: 'code', lang, meta: null, value: p.solution }));
    if (hasDriver) {
      children.push(
        slotDiv(`${lang}-full`, { type: 'code', lang, meta: null, value: program.replace(/\n$/, '') }),
      );
    }
  }
  node.children = children;
  node.attributes = [
    ...node.attributes.filter(
      (a) => !(a.type === 'mdxJsxAttribute' && (a.name === 'tabs' || a.name === 'uid')),
    ),
    attr('tabs', JSON.stringify(tabs)),
    attr('uid', uid),
  ];
  return tabs;
}

type AnyNode = { type: string; name?: string | null; children?: AnyNode[] };

function walk(node: AnyNode, fn: (n: AnyNode) => void): void {
  fn(node);
  if (Array.isArray(node.children)) for (const c of node.children) walk(c, fn);
}

/** The unified plugin. */
export default function remarkCodeTabs() {
  return (tree: Root, file?: { path?: string }) => {
    let n = 0;
    walk(tree as AnyNode, (node) => {
      if (node.type !== 'mdxJsxFlowElement' || node.name !== COMPONENT_NAME) return;
      n += 1;
      try {
        transformCodeTabs(node as unknown as MdxJsxFlowElement, `ct-${n}`);
      } catch (e) {
        const where = file?.path ? `${file.path}: ` : '';
        throw new CodeTabsError(where + (e instanceof Error ? e.message : String(e)));
      }
    });
  };
}
