# lowenberg.com

Personal site for Colin Lowenberg. A single static page: no build step, no framework, no trackers.

## Structure

```
index.html        page content and metadata
css/styles.css    design tokens (dark-first, light counterpart) and layout
js/main.js        theme toggle, SF clock, reveal, count-up, filters, hero canvas
assets/           portrait, favicon, Open Graph image
scripts/check.js  Playwright smoke test (screenshots, overflow, console, JSON-LD)
scripts/og.py     regenerates assets/og.png
HANDOFF.md        state of the project, conventions, and open items
```

## Run locally

Any static server works:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Point any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages, Replit) at the repository root. There is nothing to build.

## Editing content

- **Roles, numbers, timeline, projects, talks, events** live directly in `index.html`, each in a clearly labeled section.
- **Project filters** use the `data-tags` attribute on each `.project` item; the chips in `.filters` match on those tags.
- **Ledger numbers** animate from `data-count` and `data-suffix`; the text inside is the resting value shown before JavaScript runs.
- **Colors and type** are tokens at the top of `css/styles.css`. Light theme values sit in the `prefers-color-scheme: light` block and the `[data-theme="light"]` block; keep them identical.

Fonts load from Google Fonts (Newsreader, Geist, Geist Mono) with system fallbacks.
