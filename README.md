# twinkle-web

Static website for **SWIFT 5** and **Twinkle**, built with [Next.js](https://nextjs.org/)
(static export) and [Fumadocs](https://fumadocs.dev/). Deployed to GitHub Pages at
`https://modelscope.github.io/twinkle-web/` — no backend services.

## Layout

- `app/`, `components/`, `lib/` — site code (bilingual `en`/`zh`, versioned docs routes).
- `content/blog|webui|services/` — hand-written site content (MDX, `.zh.mdx` for Chinese).
- `content/docs/`, `content/news.json`, `content/site-data.json`, `content/perf.json`,
  `public/images/` — **generated**, do not edit or commit.
- `scripts/prepare-content.py` — content pipeline: pulls docs from the locked source
  repositories listed in `content-sources.json` (swift `docs/v5`, twinkle docs,
  regression perf results) into `content/`.
- `migration-map.json` — old Hugo URLs rendered as static redirect pages.

## Local development

```bash
npm install
# source repos are resolved from sibling checkouts by default;
# ALLOW_DIRTY_SOURCES=1 skips the clean-tree / locked-commit checks.
ALLOW_DIRTY_SOURCES=1 python3 scripts/prepare-content.py
npm run dev
```

## Build (static export)

```bash
python3 scripts/prepare-content.py
SITE_BASE_PATH=/twinkle-web npm run build   # outputs ./out
```

`SITE_BASE_PATH` must match the GitHub Pages project path. Omit it for serving at a
domain root. `out/` is fully static and can be served by any file server.

## Deployment

`.github/workflows/deploy.yml` builds on pushes to `main` (or manual dispatch) and
publishes `out/` via GitHub Pages. Source repositories are checked out at the commits
pinned in `content-sources.json`; the private regression repo needs the
`CONTENT_REPO_TOKEN` secret.
