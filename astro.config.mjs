import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';

const SITE_SLUG = process.env.SITE_SLUG ?? 'sysviz-next';
const SITE_URL = process.env.SITE_URL ?? 'https://example.com';

export default defineConfig({
  site: SITE_URL,
  base: '/',
  integrations: [mdx(), sitemap(), pagefind()],
  build: {
    format: 'directory',
  },
  vite: {
    define: {
      __SITE_SLUG__: JSON.stringify(SITE_SLUG),
    },
  },
});
