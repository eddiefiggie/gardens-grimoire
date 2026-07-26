# Dry-run — Prologue + Chapter 1 (validated 2026-07-25)

The first validated processing run and the U8 Definition-of-Done gate. It also seeds
the app with real, position-safe content so the deployed site is not empty.

## Sources (RULES rule 4 — per-chapter subpages only)
- `https://malazan.fandom.com/wiki/Gardens_of_the_Moon/Prologue` (position 0)
- `https://malazan.fandom.com/wiki/Gardens_of_the_Moon/Chapter_1` (position 1)

Read via Claude-in-Chrome (`navigate` + `get_page_text`) — Fandom blocks `WebFetch` (402).
The main-page Plot summary was **not** read; outbound entity links were **not** followed.

## Output written
- `web/data/entities.json` — 18 entities (Prologue 8, Chapter 1 adds/extends), each layer
  `safeAsOf` 0 or 1 and `source` = the subpage slug.
- `web/data/journal.json` — 2 refined entries (each with `provenance` = an original raw
  note and the same-`id` contract) + 2 questions: one answered at position 1 (Cotillion /
  Ammanas), one pending with `unlocksAt: null` ("resolves later — keep reading").
- `web/data/recaps.json` — 2 "Previously On…" blocks + 2 "things you should have noticed"
  callouts, all past-facing and `safeAsOf` ≤ 1.

## Gate result (PASSED)
A scripted check confirmed:
- Every entity layer, entry, recap, and noticed item is `safeAsOf`/`position` ≤ 1.
- Every item is cited to `Prologue` or `Chapter_1` (no bare main-page citation).
- No `unlocksAt` number appears in any user-facing text field.
- At marker 0, the firewall gate exposes no position-1 content.
- Zero inferred facts — every statement traces to the subpage prose.

## Note on held questions and the no-read-ahead rule
`unlocksAt` for a pending question is left `null` until a **later** run — once the reader
has advanced far enough that the answering subpage is at or below the new marker. The
workflow never reads ahead to discover a future unlock position, so a future chapter
number is never stored and therefore never leaks. When the answer is found (its position ≤
marker) the question flips to answered and surfaces in the "newly knowable" feed.
