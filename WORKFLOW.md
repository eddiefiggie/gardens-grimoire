# Processing Workflow

Turns exported reading notes into cited, position-safe knowledge that the app renders.
Run on demand in Claude Code. **This is a rule-bound job: [`RULES.md`](./RULES.md) governs
it with zero exceptions — read that file first, every run.**

## Inputs

- **The export bundle** the reader downloaded from the app (Journal → Export). It carries:
  - `marker` — the reader's current position ordinal. **This is the boundary the run must
    not cross** (RULES rule 5).
  - `staging` — raw notes: `{ id, position, timestamp, text }`.
  - `journal` — already-refined `entries` and `questions` (for context/idempotency).
- **The authority** — the Malazan wiki per-chapter subpages (RULES rule 4). Fandom blocks
  `WebFetch` (402); read with Claude-in-Chrome `navigate` + `get_page_text`.

## Procedure

1. **Read `RULES.md` in full.** Do not proceed until loaded.
2. **Read the export.** Take `marker` as the hard ceiling. Note which staged notes and
   positions are not yet processed (compare against `journal`).
3. **For each position `p` from 0 up to `marker`** that has unprocessed notes:
   - Open **only** the subpage for `p` (`.../Gardens_of_the_Moon/<slug>` — slug from
     `RULES.md` / `positions.json`). Never the main page's Plot summary. Never the entity
     links on the page.
   - From that subpage's own summary prose (and nothing else), extract what answers the
     reader's notes and what enriches the section they read — people, places, things,
     lore. **No inference** (rule 2). Everything cited to that subpage slug (rule 3).
4. **Write outputs** (all with `safeAsOf = p`, `source = "<slug>"`):
   - **Refined journal entries** → `web/data/journal.json` `entries[]`. Each refined entry
     **MUST reuse the stable `id` of the raw note it derives from** (from the export) and
     **copy that raw note's original text into `provenance`** — this is what makes the app's
     reconciliation (clears the staged copy by id) and the provenance disclosure work.
     Shape: `{ id, position, timestamp, refined: true, text, source, provenance }`.
   - **Entity dossier layers** → `web/data/entities.json` `entities[]`. Add or extend an
     entity `{ id, name, type, layers: [] }`; append `{ safeAsOf, text, source }`.
     `type` ∈ person · place · culture · religion · politics · war · lore · thing.
   - **Recap + noticed** → `web/data/recaps.json`. Append a `recaps[]` block
     `{ safeAsOf, text }` (a "Previously On…" beat for position `p`) and any
     `noticed[]` `{ safeAsOf, text }` (a weighty detail from `p` a reader might have
     glossed — **past-facing only**, never a hint at what's coming).
   - **Held questions** → `web/data/journal.json` `questions[]`. For a logged question that
     can't be safely answered at `p`, set `unlocksAt` to the position where the subpage at
     that position first answers it (found only by reading subpages ≤ marker — never ahead
     of the reader). Shape: `{ id, position, text, unlocksAt, answer, source }`. When
     `unlocksAt <= marker`, fill `answer`; otherwise leave it and the app shows
     "resolves later — keep reading".
5. **Validate before committing:** every written item has `safeAsOf <= marker` and a
   `source` slug; no item references anything above `marker`; no `unlocksAt` value is
   placed in any user-facing text field.
6. **Commit.** Push to `main` → the Pages Action redeploys. The reader reloads; the app
   reconciles staged notes against the new refined entries automatically.

## Data-file shapes (schemaVersion 1)

```
positions.json : { schemaVersion, positions: [ { ord, name, book, slug } ] }   # static spine
entities.json  : { schemaVersion, entities: [ { id, name, type, layers: [ { safeAsOf, text, source } ] } ] }
journal.json   : { schemaVersion, entries: [ { id, position, timestamp, refined, text, source, provenance } ],
                                   questions: [ { id, position, text, unlocksAt, answer, source } ] }
recaps.json    : { schemaVersion, recaps: [ { safeAsOf, text } ], noticed: [ { safeAsOf, text } ] }
```

Keep every file additive and `schemaVersion`-stamped; never strip unknown fields
(the app's `schema.js` preserves them for forward-compatibility).

## Dry-run gate

Before trusting a run, dry-run the Prologue + Chapter 1: source from their subpages,
produce entries/entities/recap, and confirm a spot-check finds **zero uncited or inferred
facts** and **nothing sourced from above the position**. See `docs/dry-run-prologue-ch1.md`
for the first validated run.
