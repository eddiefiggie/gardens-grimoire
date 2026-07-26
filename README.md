# Gardens Grimoire

**Category:** Personal

A GitHub-hosted static **reading companion** for Steven Erikson's *Gardens of the
Moon* (Book One of *The Malazan Book of the Fallen*). A fresh re-engineering of the
original single-file running log (now archived at
`~/ClaudeGarage/archive/gardens-grimoire-singlefile/`).

The reader captures position-scoped notes as they read; a strictly rule-bound
Claude workflow refines those notes into **spoiler-safe, authority-cited** knowledge
scoped to the reader's current chapter. The reader never misses atmosphere and stays
comfortable not-yet-knowing.

## Status
**LIVE** (build `07262026.1` — Markdown journal export added) at **https://eddiefiggie.github.io/gardens-grimoire/**
· repo **https://github.com/eddiefiggie/gardens-grimoire**. All 8 units (U1–U8), 44 unit
tests green, browser visual pass done, dry-run gate passed. Seeded with the **Prologue
only** (Chapter 1 onward = your own reading sessions). Implementation-ready plan →
`docs/plans/2026-07-25-001-feat-gardens-grimoire-reading-companion-plan.md`.
Deploys automatically on push to `main` (GitHub Actions → Pages).

## Build & run
No build step. Serve `web/` and open it:

```
python3 -m http.server --directory web 8000    # then open http://localhost:8000/
node --check web/*.js                           # syntax gate
node tests/<name>.test.js                        # per-module unit tests (plain node, no deps)
```

Deploy: push to `main` → GitHub Pages Action serves `web/`. One-time before first push:
`gh api -X POST /repos/<owner>/gardens-grimoire/pages -f build_type=workflow`.

## The idea in one breath
Three surfaces over one position-aware JSON dataset:
1. **Landing — "Previously On…"** — TV-recap of the story so far (up to your
   position) + "things you should have noticed" (past-facing only).
2. **Journal** — a "next section" button; timestamped raw notes that graduate
   **raw → refined** in place (refined replaces the display; raw kept as provenance).
3. **Grimoire** — accumulating per-entity dossiers gated by your "currently reading"
   marker + a "newly knowable" unlock feed + held questions that auto-surface when
   answerable (unlock chapter hidden until it fires).

Plus **Reset / Import / Export** for the journal data.

## Non-negotiables (the whole point)
- **Spoiler firewall:** nothing above the current chapter marker is ever shown.
- **Authority:** the Malazan Fandom wiki GotM page
  (`https://malazan.fandom.com/wiki/Gardens_of_the_Moon`) — **chapter-summary prose
  only, never the outbound entity links** (those are full-series spoiler bombs).
- **The workflow is rule-bound with zero exceptions:** it reads `RULES.md` first every
  run, never infers, and cites every fact to a specific authority section.
- **Parchment aesthetic**, clean and legible, with an unmistakable visual change from
  raw notes to refined content.

## Architecture
No-build client-side render (static `index.html` + JSON data files) → GitHub Pages
auto-deploy on push. The data *is* the future graph-DB export.

## Authority (confirmed 2026-07-25)
26-position spine: Prologue (0), Chapters 1–24, Epilogue (25), grouped under 7 Books
(Pale, Darujhistan, The Mission, Assassins, The Gadrobi Hills, The City of Blue Fire,
The Fête). Workflow source = per-chapter subpages
`.../Gardens_of_the_Moon/Chapter_<N>` (confirmed chapter-scoped). **Hard rule:** never
read the main GotM page's full "Plot summary" (spans all 7 Books) and never follow
entity links. Full map in the plan.

## Open blockers
- Persistence round-trip mechanism (localStorage staging ↔ repo data files) — rule
  settled, implementation deferred to planning.
- Confirm the Prologue/Epilogue subpage slugs on the first workflow run (minor).

## Reading the authority
WebFetch is 402-blocked for Fandom — use Claude-in-Chrome (the `malazan.fandom.com`
permission is granted). Same pattern as the DDO wiki.

## Resume prompt
> I'm resuming the **Gardens Grimoire** project at
> `~/ClaudeGarage/personal/gardens-grimoire/`. It's a fresh, GitHub-hosted static
> **reading companion** for *Gardens of the Moon* — three surfaces (Landing
> "Previously On…" recap, a Journal of timestamped notes that graduate raw→refined,
> and a Grimoire of position-gated entity dossiers with held questions) over one
> position-aware JSON dataset, deployed no-build via GitHub Pages.
>
> The spoiler firewall is absolute: nothing above the current chapter marker is ever
> shown. Content is sourced by a rule-bound Claude workflow that reads `RULES.md`
> first with zero exceptions, never infers, and cites every fact to the Malazan
> Fandom wiki GotM page — **chapter-summary prose only, never the entity links.**
> Aesthetic is clean text on parchment with an unmistakable raw→refined visual change.
> Reset / Import / Export for the journal data.
>
> Read `docs/plans/2026-07-25-001-feat-gardens-grimoire-reading-companion-plan.md`
> for the full requirements, then help me with: [plan / build / confirm the wiki
> section map].

---
_Last updated: 2026-07-25 (brainstorm complete; requirements-only plan written;
old single-file build archived)._
