# Dry-run + Prologue seed (validated 2026-07-25)

The first validated processing run and the U8 Definition-of-Done gate. The **seed shipped
in the app is the Prologue only** — Chapter 1 onward is left for the reader's own sessions.
(Chapter 1 was processed during the build to validate the workflow across two positions,
then removed from the seed at the reader's request.)

## Sources (RULES rule 4 — per-chapter subpages only)
- `https://malazan.fandom.com/wiki/Gardens_of_the_Moon/Prologue` (position 0) — seeded
- `https://malazan.fandom.com/wiki/Gardens_of_the_Moon/Chapter_1` (position 1) — validated only, not seeded

Read via Claude-in-Chrome (`navigate` + `get_page_text`) — Fandom blocks `WebFetch` (402).
The main-page Plot summary was **not** read; outbound entity links were **not** followed.

## Seed written (Prologue only, safeAsOf 0)
- `web/data/entities.json` — 9 entities (Ganoes Paran, Mock's Hold, Malaz City, the
  Bridgeburners, Dassem Ultor, Laseen, the Claw, Emperor Kellanved, Napan), each cited to
  `Prologue`.
- `web/data/journal.json` — 1 refined entry (with `provenance` = an original raw note and
  the same-`id` contract) + 1 pending question with `unlocksAt: null`
  ("resolves later — keep reading").
- `web/data/recaps.json` — 1 "Previously On…" block + 1 "things you should have noticed"
  callout, both past-facing and `safeAsOf` 0.

## Gate result (PASSED)
A scripted check confirmed the seed is `safeAsOf` 0 throughout, every item is cited to
`Prologue`, no `unlocksAt` number appears in any user-facing text, and at marker 0 the
firewall exposes nothing above position 0. Zero inferred facts — every statement traces to
the Prologue subpage prose.

## Note on held questions and the no-read-ahead rule
`unlocksAt` for a pending question is left `null` until a **later** run — once the reader
has advanced far enough that the answering subpage is at or below the new marker. The
workflow never reads ahead to discover a future unlock position, so a future chapter number
is never stored and therefore never leaks. When the answer is found (its position ≤ marker)
the question flips to answered and surfaces in the "newly knowable" feed.
