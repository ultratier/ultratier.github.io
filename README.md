# Ultratier

The ultrafast tier list by a decision model. **Live: https://ultratier.github.io/**

Paste a list, pick what matters, and one call to [TypeSafe Jev](https://docs.typesafe.ai) ranks it
into S / A / B / C. Facts are looked up first. A toggle turns them off, so you can watch the same
model, same list, same criteria rank on names alone. That toggle is the point: a decision model is
only as good as the state you hand it. Without facts it is vibe-checking its training data.

## Run it yourself

```bash
cp .env.example .env      # add your Jev key from typesafe.ai
node server.js            # http://localhost:3456/compare
```

Plain Node, zero dependencies. The key stays in `.env`; the browser talks to this proxy, never to Jev.

## How it works

- Every item becomes one `score` question per criterion, on a 4-level rubric, all in a single Jev
  call. Tiers are relative to the list, the blend is a weighted mean, and the best item is always S.
- Facts come from Wikipedia infoboxes (serialised, 429-aware, model numbers must match the title).
  Items with no page get a ● and are ranked on the name alone. An optional Serper key adds web facts.
- Presets in `public/presets.js` carry curated spec lines where Wikipedia only has series pages.
- Board: drag or tap cards to overrule Jev (marked ✎), Tier skin (on by default), full screen, share as image or link.

## Layout

```
public/compare.html   the page            public/jev.js        ranking + clean-up (shared module)
public/tierboard.js   board interaction   public/presets.js    starter lists
public/index.html     plain paste page    server.js            proxy + enrichment
docs/                 GitHub Pages build  scripts/             precompute, build, preview
```

## The GitHub Pages site

`docs/` is the live site. Presets are **frozen**: `scripts/precompute.js` ranks every preset on every
criterion, with and without facts, into `docs/data/presets.json`, so the showcase costs nobody any
tokens and needs no server. A visitor's own list goes to the backend named by the `jevit-api` meta
tag; if that is down, presets still work and the page says to run it locally.

```bash
node server.js && node scripts/precompute.js && ./scripts/build-pages.sh
```
