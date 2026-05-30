import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import cloudflare from '@astrojs/cloudflare';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

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
      // Brain-detox-style heading permalinks: every h2/h3/h4 gets an id
      // + a clickable ¶ anchor on hover, so readers can deep-link
      // straight to a section.
      rehypePlugins: [
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
    sitemap(),
    pagefind(),
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
