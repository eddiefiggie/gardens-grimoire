# Processing Rules — zero exceptions

These rules govern every run of the Gardens Grimoire processing workflow. They are
absolute. If any rule cannot be honored for a given fact, that fact is **not written** —
there is no "close enough." Read this file, in full, at the start of every run before
touching any note or any source.

## The six rules

1. **Read the rules first, every run.** Load this file at the start of every processing
   run and follow it strictly — no exceptions, no improvisation.

2. **No inference.** Never infer, guess, extrapolate, or fill gaps from your own
   background knowledge of Malazan. If a fact is not present in the authority at or below
   the reader's current position, it is not written.

3. **Everything is cited to the source authority.** Every refined detail must be
   attributable to the **specific per-chapter subpage it was read from**
   (`.../Gardens_of_the_Moon/Chapter_<N>`, or the Prologue/Epilogue subpage) — the exact
   page, never the bare main-page URL. Record that page slug as the `source` on every
   entry, layer, recap block, and answer.

4. **Authority discipline — per-chapter subpages only; never the master summary; never the links.**
   Source **only** from the per-chapter summary subpages at or below the reader's current
   position:
   - `https://malazan.fandom.com/wiki/Gardens_of_the_Moon/Chapter_<N>` for N = 1–24
   - `https://malazan.fandom.com/wiki/Gardens_of_the_Moon/Prologue`
   - `https://malazan.fandom.com/wiki/Gardens_of_the_Moon/Epilogue`

   You **must never** read the main `Gardens_of_the_Moon` page's "Plot summary" section —
   it spans all seven Books and is a full-book spoiler. You **must never** follow the
   outbound entity links (character/place pages) on any chapter page — they carry
   full-series spoilers. This single rule is what keeps the authority from becoming a
   spoiler. Fandom blocks `WebFetch` (HTTP 402); read pages with Claude-in-Chrome
   (`navigate` + `get_page_text`).

5. **Position boundary is absolute.** Nothing above the reader's current marker is read,
   sourced, refined, surfaced, or hinted at — including recap "things you should have
   noticed" callouts and held-question estimates. Every written item carries
   `safeAsOf = <its position ordinal>`.

6. **Held-question estimates stay hidden.** When a logged question resolves at a later
   position, store its `unlocksAt` so the app can fire the unlock — but the number is
   never rendered until it fires. (The app enforces this too: `pendingQuestions` strips
   `unlocksAt` before render.)

## Position spine (authority source map)

| Ord | Position | Subpage slug | Book grouping |
|----|----------|--------------|---------------|
| 0  | Prologue   | `Prologue`   | — |
| 1–4  | Chapters 1–4   | `Chapter_1`…`Chapter_4`   | Book One: Pale |
| 5–7  | Chapters 5–7   | `Chapter_5`…`Chapter_7`   | Book Two: Darujhistan |
| 8–10 | Chapters 8–10  | `Chapter_8`…`Chapter_10`  | Book Three: The Mission |
| 11–13 | Chapters 11–13 | `Chapter_11`…`Chapter_13` | Book Four: Assassins |
| 14–16 | Chapters 14–16 | `Chapter_14`…`Chapter_16` | Book Five: The Gadrobi Hills |
| 17–19 | Chapters 17–19 | `Chapter_17`…`Chapter_19` | Book Six: The City of Blue Fire |
| 20–24 | Chapters 20–24 | `Chapter_20`…`Chapter_24` | Book Seven: The Fête |
| 25 | Epilogue   | `Epilogue`   | — |

The canonical spine also lives in `web/data/positions.json`.
