---
title: Running the Gardens Grimoire refine workflow
date: 2026-07-26
category: workflow-issues
module: gardens-grimoire
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Converting a reader's raw reading notes into cited, spoiler-safe knowledge for a position-aware app
  - Deciding whether new outputs are needed or content was already seeded during project setup
  - Sourcing per-position facts from a wiki that blocks WebFetch and enforces a spoiler firewall
  - Triaging notes into refined entries, held questions, or corrections against an authority subpage
  - Validating refined data before publish (provenance, position/marker gates, no unlocksAt leakage)
tags:
  - gardens-grimoire
  - refine-workflow
  - spoiler-firewall
  - note-triage
  - provenance
  - wiki-sourcing
  - claude-in-chrome
  - validation-gate
---

# Running the Gardens Grimoire refine workflow

## Context

Gardens Grimoire turns a reader's raw, in-the-moment reading notes into cited, spoiler-safe knowledge across three static surfaces (Landing recap / Journal / Grimoire) rendered over position-aware JSON in `web/data/` (`positions.json`, `journal.json`, `entities.json`, `recaps.json`). The reader reads up to a **marker** (the current position ordinal; Prologue = 0), captures messy notes, and Exports a JSON bundle (`marker`, `staging`, `journal`). A rule-bound "refine" workflow — governed by `RULES.md` and `WORKFLOW.md` — is supposed to promote those staged notes into refined, sourced entries.

The friction is twofold. First, the notes are genuinely raw: partial recall, misspelled names, guesses, and questions the book itself answers later. They must become knowledge that is *cited to an authority* and *never leaks ahead of the marker* — even when the reader plainly saw something in the prose but the authority for their current position does not yet cover it. Second, before this run the workflow had **never actually been executed**. This documents the operational method learned from the first real run: processing the reader's Prologue notes (14 raw notes at marker 0).

Two environment facts shaped the run. The reader's export arrived as an `.rtf` wrapping the JSON; it had to be converted with `textutil -convert txt` before parsing. And the sole authority — the Malazan Fandom wiki **per-chapter subpage** (e.g. `Gardens_of_the_Moon/Prologue`) — blocks WebFetch with HTTP 402, so it must be read via Claude-in-Chrome (`navigate` + `get_page_text`). The browser extension must be *connected first*; a blocked first attempt this session cost a wasted round-trip.

## Guidance

**1. Inventory what's already seeded before producing anything.** For the Prologue, `entities.json` and `recaps.json` were already seeded at project setup and matched the authority — re-deriving them would have duplicated content. The run's real gap was the **journal** (`journal.json`): raw notes → refined entries plus held questions. So the first step is always: diff the authority subpage against the existing data files, and only fill genuine gaps. Do not regenerate what setup already produced.

**2. Authority discipline.** Read only the per-chapter subpage for the current position (e.g. `Gardens_of_the_Moon/Prologue`). Never the main page's full plot summary, and never follow outbound entity links — both routes leak future events. This is the spoiler rule in `RULES.md`, enforced by *where you are allowed to read*, not by judgment after the fact.

**3. Triage each raw note into exactly one outcome:**

- **Refined entry** — when the subpage answers or enriches the note. Each refined entry MUST reuse the raw note's stable `id` and copy the raw note text into `provenance`. This is the reconciliation contract stated in `WORKFLOW.md`: the app's `reconcile()` clears the staged copy by matching `id`, so a new id silently orphans the staged note. Shape: `{ id, position, timestamp, refined: true, text, source, provenance }`, where `source` is the subpage slug (e.g. `"Prologue"`).
- **Held question** — `{ id, position, text, unlocksAt: null }` — when the subpage does NOT cover the note, *even if the reader plainly saw it in the book's prose*. You cannot read ahead of the marker, so `unlocksAt` stays `null` until some future position's subpage answers it. This run held "the tower," "Seven Cities," and "did the First Sword betray a god?" for exactly this reason.
- **Correction** — when the reader's in-the-moment reading was simply wrong. Fix it against the authority. This run corrected "Ganoes Palau" → Ganoes Paran, "citadel" → Mock's Hold, and "Kallanved" → Kellanved.

**4. No inference — ever.** Assert only what the subpage supports. The reader guessed "Surly created the Claw"; the subpage only says she is *flanked by* Claw acolytes, so the refined entry stated the supported fact and explicitly did not claim she created them. When the authority is silent, the note becomes a held question or a narrowed refined entry — never a confident extrapolation.

**5. Spoiler-safety is structural, not vibes.** Every written item carries `safeAsOf`/`position` ≤ marker. No `unlocksAt` *number* ever appears in user-facing text — a held question shows as an open question, not "answered at position N," which would itself be a spoiler.

**6. Validate before publishing.** The gate: JSON parses; every item has `safeAsOf ≤ marker`; every refined entry has both `source` and `provenance`; no `unlocksAt` number leaks into user-facing text; the unit tests pass; and a localhost visual pass in Chrome confirms refined entries render as "refined ✓ · cited" with the provenance disclosure working.

## Why This Matters

Skip the inventory step and you regenerate `entities.json` / `recaps.json` that setup already seeded — duplicated, possibly divergent content. Blur the refined/held distinction and you either invent an answer the authority never gave (a fabricated "fact") or, worse, answer a note the reader isn't positioned to know yet — a silent spoiler that the whole app exists to prevent. Mint a fresh `id` instead of reusing the raw note's and `reconcile()` can't clear the staged copy: the note lingers in staging forever, broken reconciliation with no error. Promote a fan-guess like "Surly created the Claw" to a refined entry and you've laundered speculation into cited knowledge. And forget to confirm the browser extension is connected and you burn a round-trip on a blocked first fetch — every session, unless it's a habit.

## When to Apply

Every future reading-session refinement run — each new chapter/position the reader reaches. When a new export arrives at a higher marker, this is the method: convert if wrapped, connect the browser, read only that position's subpage, inventory what's seeded, triage every note into refined / held / correction, honor the id+provenance contract, assert nothing unsupported, keep everything ≤ marker, then run the validation gate before committing and deploying. It is also the moment to revisit prior held questions: if the new subpage now answers one, promote it (set its `unlocksAt` / refine it) at this position.

## Examples

Concrete note → outcome mappings from the Prologue run (14 raw notes → 11 refined entries + 4 held questions, plus one "noticed" recap beat about the opening epigraph):

- **"First Sword's name?"** → **Refined.** The subpage names him: Dassem Ultor, First Sword of the Empire, who died at Y'Ghatan. Refined entry cites `source: "Prologue"`, reuses the note's id, carries the raw note in `provenance`.
- **"Seven Cities?"** → **Held question.** The reader saw the phrase, but the Prologue subpage doesn't explain it. `unlocksAt: null`; it waits for a later position's subpage.
- **"Ganoes Palau"** → **Correction.** The authority gives the name as Ganoes Paran; the refined entry fixes the misremembering.
- **"citadel" / "Kallanved"** → **Corrections** to Mock's Hold and Kellanved respectively.
- **"Surly created the Claw"** → **Refined to the supported fact only.** The subpage says Surly is flanked by Claw acolytes; the entry records that and pointedly does not claim she created them.
- **"did the First Sword betray a god?"** → **Held question.** Not covered by the Prologue subpage at this marker; `unlocksAt: null`.

## Related

- [Dual-format export: keep a machine round-trip format alongside a human-readable one](../design-patterns/dual-format-export-machine-and-human.md) — the data-contract side of the same journal area. That doc explains why the JSON export bundle (`marker`, `staging`, `journal`) stays re-importable; this workflow is one of the bundle's re-ingesting consumers.
