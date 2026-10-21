// Runs after Shiki in the MDX pipeline. Shiki highlights every fenced
// block, including ```mermaid, which would turn the diagram source into
// coloured spans. The client renderer (src/lib/mermaid-render.ts) looks for
// a plain `<pre><code class="language-mermaid">`, so this puts that shape
// back for mermaid blocks and leaves everything else highlighted.

import type { Element, Root } from 'hast';
import { toText } from 'hast-util-to-text';
import { visit } from 'unist-util-visit';

export default function rehypeKeepMermaid() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'pre' || node.properties?.dataLanguage !== 'mermaid') return;
      const source = toText(node, { whitespace: 'pre' });
      node.properties = {};
      node.children = [
        {
          type: 'element',
          tagName: 'code',
          properties: { className: ['language-mermaid'] },
          children: [{ type: 'text', value: source }],
        },
      ];
    });
  };
}
