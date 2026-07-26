---
title: "Dual-format export: keep a machine round-trip format alongside a human-readable one"
date: 2026-07-26
module: "web/datacontrols.js (journal export/import)"
category: design-patterns
problem_type: design_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - Adding a new export format to a feature that already exports a format another code path re-ingests
  - An existing export is consumed by an Import path or an automated workflow, not only read by a human
  - The new format (e.g. Markdown) is human-readable only and has no parser on the import path
  - Tempted to replace an existing export format rather than add the new one alongside it
related_components:
  - testing_framework
tags:
  - export
  - import
  - data-portability
  - round-trip
  - json
  - markdown
  - dual-format
---

# Dual-format export: keep a machine round-trip format alongside a human-readable one

## Context

Gardens Grimoire has a single Journal **Export** feature. When we wanted a
human-readable export — something a reader could actually read, or paste into a
Claude session — the tempting move was to "change Export to emit Markdown."

That temptation hides a trap: the existing Export does not serve a human. It
serves *two machines*.

- The app's own **Import** button re-parses the exported JSON bundle, so a reader
  can carry notes between browsers and devices.
- The project's rule-bound "refine" workflow consumes the *same* JSON bundle
  (`marker`, `staging`, `journal`) as its input.

So "the export" already had two re-ingesting consumers. A brand-new human reader
is a *third* consumer with the opposite need. One button cannot correctly serve
both a parser and a person.

## Guidance

**When you add a human-readable export, keep the machine round-trip format and
add the new one alongside it. Never replace.**

Export formats are typed by their *consumer*, not by which one you happen to
prefer this week:

- A format that something re-ingests (Import, sync, a downstream tool, a
  workflow step) must stay stable and lossless. It is the round-trip format.
- A format a human reads is allowed to be lossy, reflowed, and pretty. It is
  read-only by construction.

Give each consumer its own export path. The concrete shape that worked here:

- **A dedicated button per format**, each with its own status message — "Export"
  (JSON) and "Export MD" (Markdown) sit side by side in `render()`
  (`web/datacontrols.js`).
- **A shared low-level download helper.** The anchor-click download logic was
  refactored out of the pre-existing `downloadExport()` into
  `triggerDownload(filename, blob)`, so both JSON and Markdown paths share it and
  neither drifts.
- **A pure, unit-testable serializer.** `buildMarkdown(app, now, positions)` takes
  its inputs as arguments and returns a string — no DOM, no `Date.now()` reached
  for internally. `downloadMarkdown(app)` is the thin wrapper that calls it,
  wraps the result in `Blob({type:"text/markdown"})`, and hands it to
  `triggerDownload()`.
- **Deterministic timestamp formatting.** `buildMarkdown` renders every timestamp
  through a fixed UTC `fmtStamp(ts)` helper rather than a locale- or
  timezone-sensitive format, so the pure function's output is stable in tests.

```
// two consumers, two typed exports, one shared primitive
buildExport(app)              -> JSON bundle   (re-importable; workflow input)
buildMarkdown(app, now, pos)  -> Markdown text (human-readable; NOT re-importable)

downloadExport(app)   -> triggerDownload("...-YYYY-MM-DD.json", jsonBlob)
downloadMarkdown(app) -> triggerDownload("...-YYYY-MM-DD.md",  mdBlob)
```

## Why This Matters

If you *replace* the round-trip format with the human one, the breakage is
silent. `buildExport()` and `importBundle()` would still compile; the "Export MD"
button would work beautifully; and then the day a reader hits **Import** with
their new `.md` file — or the refine workflow tries to ingest it — it fails,
because the Import path has no Markdown parser and never will. Prose does not
round-trip back into structured `marker` / `staging` / `journal` records without
being lossy and ambiguous. You would have traded a working sync-and-workflow
pipeline for a nicer-looking file, and not noticed until a user lost data.

Keeping both also protects adjacent safeguards: Reset's "Export first" prompt
still points at the JSON export, because JSON is the *recoverable* format. A
human-readable dump is not a backup.

The general rule: **an export's format is a property of who consumes it.** If
even one consumer re-ingests the output, that format is load-bearing and must
survive the addition of any reader-friendly sibling.

## When to Apply

Any export or serialization feature where the outputs have mixed consumers:

- At least one consumer **re-ingests** the output — import/restore, cross-device
  sync, or a downstream tool/workflow that parses it.
- At least one consumer just **reads** it — a human, or something that only
  displays it.

When both are true, ship both formats. Do not let a request for the readable
format quietly delete the re-ingestible one. If you are ever unsure whether a
format is re-ingested, assume it is and keep it — the cost of an extra button is
trivial next to a silent round-trip break.

## Examples

**Before:** one "Export" button emitting JSON. Serves Import and the refine
workflow.

**After** (`web/datacontrols.js`, build `07262026.1`):

- "Export" (JSON) — re-importable; still the workflow input; unchanged
  `buildExport()` / `importBundle()`; still what Reset's "Export first"
  safeguard produces.
- "Export MD" (Markdown) — human-readable; **not** re-importable by design. New
  `buildMarkdown()` writes a header (export time, current chapter, schema
  version), a spoiler-firewall notice line, and three sections — *Refined
  entries*, *Raw notes — awaiting refinement*, *Held questions*. Position
  ordinals resolve to chapter names via `posLabel(positions, ord)`, falling back
  to `"Position N"` when a position is unmapped.

Supporting moves worth copying:

- The shared `triggerDownload(filename, blob)` refactor means adding the second
  format did not duplicate the download plumbing.
- The pure `buildMarkdown(app, now, positions)` signature plus the deterministic
  `fmtStamp(ts)` made it directly unit-testable. Two new tests in
  `tests/datacontrols.test.js` cover it: one asserts the header, sections,
  chapter-name resolution, and spoiler line; the other asserts the
  `"Position N"` fallback for unmapped positions. Suite is now 44 tests, all
  green.

## Related

- No prior `docs/solutions/` entries — this is the repository's first captured learning.
