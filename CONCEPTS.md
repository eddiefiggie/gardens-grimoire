# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Reading position

### Position
An ordinal point in the book's reading spine, running from the Prologue through the Epilogue with each chapter in between, grouped under the book's named parts. Every piece of knowledge in the app is stamped with the position it belongs to.

### Marker
The reader's current position — the single point that says "this is how far I have read." It is the hard ceiling for everything the app shows.

The Marker is absolute: no content stamped above it is read, sourced, refined, surfaced, or hinted at. Advancing the Marker is what unlocks new material; nothing is shown ahead of it.

### Spoiler firewall
The project's non-negotiable rule that nothing above the reader's Marker is ever displayed, cited, or alluded to — including recap callouts and question hints. It is the whole point of the product, enforced in both the content workflow and the app's rendering.

## Journal notes

### Staging note
A raw, not-yet-refined note the reader captured while reading, held locally until it is exported and processed. Its position records where the reader was when they wrote it.

### Refined entry
A staging note that has graduated into cited, spoiler-safe knowledge: rewritten from an authority source, attributed, and stamped safe as of its position. A Refined entry keeps the stable identity of the raw note it came from and preserves that note's original text as provenance, so the app can retire the raw copy and still show where the knowledge started.

### Held question
A reader's logged question that cannot yet be answered without crossing the Marker, so it is stored to surface later. The position where it becomes answerable is recorded but stays hidden until it fires — the reader is never shown how far ahead the answer lies.

## The refine workflow

### Refine
The named process that promotes a reader's raw [[Staging note]]s into cited, position-safe knowledge — Refined entries, plus Held questions for what the source does not yet cover. Refining draws only on the Authority and asserts nothing it does not support.

### Authority
The single sanctioned source a refinement run may read for a given Position: that position's own per-chapter reference page, and nothing else. The main whole-book summary and any outbound entity links are off-limits, because they reach past the Marker — so the Authority is what keeps sourcing inside the Spoiler firewall rather than becoming a way around it.
