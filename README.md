# sysviz-next (working title)

Interactive system-design and DSA visualizations + companion notes. Built with Astro + MDX + TypeScript.

> **Naming:** the slug `sysviz-next` is a placeholder. Final name TBD. To rename everywhere, set `SITE_SLUG` in `.env` and update `package.json` `name`.

## Stack

- **Astro 5** + **MDX** — static-first, MDX lets us embed `<Anim id="raft"/>` directly in markdown
- **TypeScript strict** — animation contract checked at compile time
- **CSS Modules + CSS variables** — preserves the Aurora theme from the previous repo
- **Pagefind** — build-time search index, scales past lunr
- **Self-hosted Mermaid** — no third-party CDN
- **Cloudflare Pages** — deploy target

## Architecture

Two pillars:

- **`/notes/`** — long-form markdown (74 topics, ported from Brain-Detox-Arc)
- **`/animations/`** — filterable gallery of interactive demos, each deep-linkable at `/animations/<id>`

Animation contract: every file under `src/anims/<id>/index.ts` exports a default `AnimModule`. The registry auto-discovers via `import.meta.glob`. Adding animation #61 = one new file, zero edits elsewhere.

See `src/lib/anim/types.ts` for the contract and `src/anims/raft/index.ts` / `src/anims/quicksort/index.ts` for canonical templates (systems + DSA).

## Develop

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # outputs dist/ + pagefind index
npm run typecheck
```

## Adding a new animation

1. Create `src/anims/<id>/index.ts` exporting an `AnimModule`.
2. Embed in any `.mdx` note with `<Anim id="<id>"/>`, or visit `/animations/<id>` directly.
3. Done. Gallery picks it up automatically.

See `src/anims/quicksort/index.ts` for the DSA template and `src/anims/raft/index.ts` for the systems template.
