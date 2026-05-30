# StackTrace

> Interactive system design and DSA visualizations + companion interview notes.
> Built with Astro + MDX + TypeScript, deployed on Cloudflare Pages.

**Tagline:** From *reading about algorithms* to *watching them run.*

Every concept ships with an interactive, step-through visualization. {N} animations spanning DSA and system design, paired with {N} interview-grade notes.

## Stack

- **Astro 5** + **MDX** — static-first, MDX lets us embed `<Anim id="raft"/>` directly in markdown.
- **TypeScript strict** — animation contract checked at compile time.
- **CSS variables + Aurora theme** — dark + light, carried over from the original notes project.
- **Pagefind** — build-time search index, scales past lunr.
- **Self-hosted Mermaid** — no third-party CDN.
- **Cloudflare Pages** + **D1 + KV** — Workers-rendered routes for `/learn/*`, `/admin/*`, `/api/*`; everything else is prerendered HTML.

## Architecture

Two content pillars:

- **`/notes/`** — long-form markdown (74 systems-design topics ported from the original Brain Detox Arc archive, plus 16 interview-playbook pages).
- **`/dsa/`** — pattern-grouped DSA pages (87 algorithms across 16 patterns) each with an embedded interactive visualization.
- **`/animations/`** — filterable gallery of every interactive demo, each deep-linkable at `/animations/<id>`.

**Animation contract:** every file under `src/anims/<id>/index.ts` exports a default `AnimModule`. The registry auto-discovers via `import.meta.glob`, so adding animation #61 = one new file, zero edits elsewhere. See `src/lib/anim/types.ts` for the contract; `src/anims/raft/index.ts` and `src/anims/quicksort/index.ts` are canonical templates (systems + DSA).

## Develop

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # outputs dist/ + pagefind index
npm run preview      # serve dist/ locally
npm run typecheck
npm test
```

## Deploy (Cloudflare Pages)

The repo is wired to Cloudflare Pages via the `@astrojs/cloudflare` adapter. Push to `main` and Pages auto-builds. Build settings:

- **Build command:** `npm run build`
- **Build output:** `dist`
- **Root directory:** `/`

To deploy manually without committing:

```bash
npm run build
npx wrangler pages deploy dist --project-name=<your-pages-project>
```

## Adding a new animation

1. Create `src/anims/<id>/index.ts` exporting an `AnimModule`.
2. Create `src/anims/<id>/meta.ts` exporting the visible metadata (title, category, premium flag).
3. Embed in any `.mdx` page with `<Anim id="<id>"/>`, or visit `/animations/<id>` directly.
4. The gallery picks it up automatically on next build.

See `src/anims/quicksort/` for the DSA template and `src/anims/raft/` for the distributed-systems template.

## The archive

The original **Brain Detox Arc** MkDocs site — the predecessor of this project — is preserved in `doc/` (markdown sources + built `site/`). Its git history is available at `doc/.git-legacy/` if you ever need to spelunk the old commits.
