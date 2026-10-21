// Remark plugin: a "Run this program in an online compiler" button under
// every complete program on LLD notes.
//
// A fence written ```java run gets, immediately after it, a plain
// <p class="run-online"> holding a button. LLD programs are long: their
// godbolt /clientstate/ URLs (13-31 KB) are refused with 414 URI Too Long,
// so the page carries no URL. On click, src/lib/run-online-client.ts reads
// the code block above, asks godbolt's /api/shortener for a short link and
// opens it. The marker words (`run`, and `output`
// / `nondeterministic` on demo-output fences, which scripts/verify-lld.ts
// reads from the source) are then removed from the node's meta, so Shiki and
// the rendered page are unaffected.

import type { Root } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { metaWords, NONDETERMINISTIC_META, OUTPUT_META, RUN_META } from './lld-verify.ts';

export const RUN_ONLINE_CLASS = 'run-online';
export const RUN_ONLINE_TEXT = 'Run this program in an online compiler ↗';
export const RUN_ONLINE_NOTE = ' (opens Compiler Explorer; the code is sent to godbolt.org)';

const MARKERS = new Set([RUN_META, OUTPUT_META, NONDETERMINISTIC_META]);

const attr = (name: string, value: string): MdxJsxAttribute => ({
  type: 'mdxJsxAttribute',
  name,
  value,
});

/** The <p class="run-online"><button …>…</button> (…)</p> node. The
 *  program itself is read from the code block above at click time. */
export function runOnlineParagraph(): MdxJsxFlowElement {
  const link: MdxJsxTextElement = {
    type: 'mdxJsxTextElement',
    name: 'button',
    attributes: [attr('type', 'button'), attr('class', 'run-online__btn'), attr('data-run-online', 'java')],
    children: [{ type: 'text', value: RUN_ONLINE_TEXT }],
  };
  return {
    type: 'mdxJsxFlowElement',
    name: 'p',
    attributes: [attr('class', RUN_ONLINE_CLASS)],
    // Phrasing content inside a flow element: the MDX compiler passes JSX
    // nodes through and turns the text node into a hast text node.
    children: [link, { type: 'text', value: RUN_ONLINE_NOTE }] as unknown as MdxJsxFlowElement['children'],
  };
}

type AnyNode = { type: string; lang?: string | null; meta?: string | null; value?: string; children?: AnyNode[] };

function stripMarkers(node: AnyNode): void {
  const words = metaWords(node.meta);
  if (!words.some((w) => MARKERS.has(w))) return;
  const rest = words.filter((w) => !MARKERS.has(w));
  node.meta = rest.length ? rest.join(' ') : null;
}

function walk(parent: AnyNode): void {
  const kids = parent.children;
  if (!Array.isArray(kids)) return;
  for (let i = 0; i < kids.length; i++) {
    const node = kids[i];
    if (node.type === 'code') {
      const isProgram = node.lang === 'java' && metaWords(node.meta).includes(RUN_META);
      stripMarkers(node);
      if (isProgram) {
        kids.splice(i + 1, 0, runOnlineParagraph() as unknown as AnyNode);
        i++; // skip the paragraph just inserted
      }
    } else {
      walk(node);
    }
  }
}

/** The unified plugin. */
export default function remarkRunOnline() {
  return (tree: Root) => {
    walk(tree as unknown as AnyNode);
  };
}
