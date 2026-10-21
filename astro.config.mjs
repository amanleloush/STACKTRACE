import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkCodeTabs from './src/lib/remark-code-tabs.ts';
import remarkRunOnline from './src/lib/remark-run-online.ts';
import rehypeKeepMermaid from './src/lib/rehype-keep-mermaid.ts';

const SITE_SLUG = process.env.SITE_SLUG ?? 'stacktrace';
const SITE_URL = process.env.SITE_URL ?? 'https://example.com';

// Astro 5 dropped `output: 'hybrid'`. The equivalent is `output: 'static'`
// (default) + an adapter — routes prerender unless they explicitly opt
// out with `export const prerender = false`. Phase 3+ routes (/learn/*,
// /admin/*, /api/*) will set that flag to become Worker-rendered.
export default defineConfig({
  site: SITE_URL,
  base: '/',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [
    mdx({
      // <CodeTabs> on DSA pages: groups the fenced blocks inside it into
      // C++ / Java / Python tabs and precomputes each godbolt.org run link.
      // remarkRunOnline: a godbolt.org "Run this program" link under each
      // ```java run fence (the full programs on LLD notes).
      remarkPlugins: [remarkCodeTabs, remarkRunOnline],
      // Note and DSA pages are server-rendered, so every MDX page ships in
      // the Worker bundle. Without this, each highlighted code token becomes
      // a JSX call, which tripled the bundle and slowed Worker startup.
      // optimize collapses static subtrees into plain HTML strings.
      optimize: true,
      // Highlight code at build time with both themes; global.css picks
      // the one matching the site's data-theme. @astrojs/mdx 4.0 only
      // turns Shiki on for the string form, so it is set explicitly here.
      syntaxHighlight: 'shiki',
      shikiConfig: {
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      },
      // Brain-detox-style heading permalinks: every h2/h3/h4 gets an id
      // + a clickable ¶ anchor on hover, so readers can deep-link
      // straight to a section.
      rehypePlugins: [
        rehypeKeepMermaid,
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            properties: {
              className: ['note__heading-anchor'],
              ariaLabel: 'Link to this section',
            },
            content: {
              type: 'element',
              tagName: 'span',
              properties: { className: ['note__heading-anchor-glyph'], ariaHidden: 'true' },
              children: [{ type: 'text', value: '¶' }],
            },
          },
        ],
      ],
    }),
    sitemap({
      // The offline fallback page is for the service worker, not search.
      filter: (page) => !new URL(page).pathname.startsWith('/offline'),
    }),
    // Search: no astro-pagefind integration. scripts/build-search-index.ts
    // builds dist/pagefind after `astro build` (see package.json), because
    // the Worker-rendered /learn/* pages need records the integration
    // can't add, and running both indexed every page twice.
  ],
  build: {
    format: 'directory',
  },
  vite: {
    define: {
      __SITE_SLUG__: JSON.stringify(SITE_SLUG),
    },
  },
});
