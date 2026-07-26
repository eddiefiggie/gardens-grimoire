---
title: Running the Gardens Grimoire refine workflow
date: 2026-07-26
last_updated: 2026-07-26
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

**3. Every raw note gets a refined entry — a held question is additive, not a substitute.** This is the correction a second pass forced: the first pass left three question-notes as held questions *only*, with no refined entry — so those raw notes never reconciled and kept showing as unrefined in the reader's journal. The rule: **every** staged note must end the run as a refined entry that reuses its `id` (so `reconcile()` clears the staged copy). What varies is what that entry *says*:

- **Answered** — the subpage covers the note. The refined entry states the cited fact. Shape: `{ id, position, timestamp, refined: true, text, source, provenance }`, `source` = the subpage slug (e.g. `"Prologue"`).
- **Held** — the subpage does NOT cover it, *even if the reader plainly saw it in the prose*. Write the refined entry honestly ("the Prologue doesn't state this — kept as an open question") **and** add a separate held question `{ id, position, text, unlocksAt: null }`. The refined entry reconciles the raw note; the held question tracks the open thread until a later position answers it. Both, not either. This run held "the tower," "Seven Cities," and "did the First Sword betray a god?" — each now has a refined entry *and* a held question.
- **Correction** — the reader's in-the-moment reading was wrong. The refined entry fixes it against the authority (this run: "Ganoes Palau" → Ganoes Paran, "citadel" → Mock's Hold, "Kallanved" → Kellanved).

The common thread: reuse the raw note's stable `id` and copy its text into `provenance` on **every** refined entry. This is the reconciliation contract in `WORKFLOW.md` — `reconcile()` clears the staged copy by matching `id`, so a new id (or no entry at all) silently orphans the staged note, which is exactly how a note ends up looking "not refined."

**4. No inference — ever.** Assert only what the subpage supports. The reader guessed "Surly created the Claw"; the subpage only says she is *flanked by* Claw acolytes, so the refined entry stated the supported fact and explicitly did not claim she created them. When the authority is silent, the note becomes a held question or a narrowed refined entry — never a confident extrapolation.

**5. Spoiler-safety is structural, not vibes.** Every written item carries `safeAsOf`/`position` ≤ marker. No `unlocksAt` *number* ever appears in user-facing text — a held question shows as an open question, not "answered at position N," which would itself be a spoiler.

**6. Validate before publishing.** The gate: JSON parses; every item has `safeAsOf ≤ marker`; every refined entry has both `source` and `provenance`; no `unlocksAt` number leaks into user-facing text; the unit tests pass; and a localhost visual pass in Chrome confirms refined entries render as "refined ✓ · cited" with the provenance disclosure working.

## Why This Matters

Skip the inventory step and you regenerate `entities.json` / `recaps.json` that setup already seeded — duplicated, possibly divergent content. Blur the refined/held distinction and you either invent an answer the authority never gave (a fabricated "fact") or, worse, answer a note the reader isn't positioned to know yet — a silent spoiler that the whole app exists to prevent. Mint a fresh `id` instead of reusing the raw note's — or leave a question-note with no refined entry at all — and `reconcile()` can't clear the staged copy: the note lingers in staging, still showing as "not refined," with no error to warn you. (That is exactly what the first pass did to three notes; a second pass had to give each a refined entry.) Promote a fan-guess like "Surly created the Claw" to a refined entry and you've laundered speculation into cited knowledge. And forget to confirm the browser extension is connected and you burn a round-trip on a blocked first fetch — every session, unless it's a habit.

## When to Apply

Every future reading-session refinement run — each new chapter/position the reader reaches. When a new export arrives at a higher marker, this is the method: convert if wrapped, connect the browser, read only that position's subpage, inventory what's seeded, give **every** note a refined entry (answered / held-plus-question / correction), honor the id+provenance contract, assert nothing unsupported, keep everything ≤ marker, then run the validation gate before committing and deploying. It is also the moment to revisit prior held questions: if the new subpage now answers one, promote it (set its `unlocksAt` / refine it) at this position.

## Examples

Concrete note → outcome mappings from the Prologue run. After the correcting second pass, all 14 raw notes have refined entries, plus 4 held questions and one "noticed" recap beat about the opening epigraph:

- **"First Sword's name?"** → **Answered.** The subpage names him: Dassem Ultor, First Sword of the Empire, who died at Y'Ghatan. Refined entry cites `source: "Prologue"`, reuses the note's id, carries the raw note in `provenance`.
- **"Seven Cities?"** → **Held (both).** The reader saw the phrase, but the Prologue subpage doesn't explain it — so the note gets a refined entry saying exactly that, *and* a held question (`unlocksAt: null`) that waits for a later position.
- **"Ganoes Palau"** → **Correction.** The authority gives the name as Ganoes Paran; the refined entry fixes the misremembering.
- **"citadel" / "Kallanved"** → **Corrections** to Mock's Hold and Kellanved respectively.
- **"Surly created the Claw"** → **Refined to the supported fact only.** The subpage says Surly is flanked by Claw acolytes; the entry records that and pointedly does not claim she created them.
- **"did the First Sword betray a god?"** → **Held (both).** Not covered by the Prologue subpage at this marker — a refined entry notes the absence and a held question (`unlocksAt: null`) keeps the thread open.

## Related

- [Dual-format export: keep a machine round-trip format alongside a human-readable one](../design-patterns/dual-format-export-machine-and-human.md) — the data-contract side of the same journal area. That doc explains why the JSON export bundle (`marker`, `staging`, `journal`) stays re-importable; this workflow is one of the bundle's re-ingesting consumers.
