---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
date: 2026-07-25
type: feat
status: implementation-ready
title: Mobile narrow-viewport rendering - Plan
---

# Mobile narrow-viewport rendering - Plan

## Goal Capsule

- **Objective:** Make the Gardens Grimoire site render correctly on a narrow mobile phone (target: iPhone 17 in Safari, ~393 pt logical width) — nothing cut off by the Dynamic Island or home bar, no horizontal scrolling, no zoom-on-input, controls comfortably tappable.
- **Product authority:** Ed (the user). Scope confirmed: **responsive rendering correctness only** — no home-screen/PWA app, no bottom tab bar.
- **Open blockers:** none.

## Problem Frame

The app already has a mobile breakpoint (`@media max-width: 600px`) with legible type and 44px touch targets, but it does not opt into the modern-iOS safe-area model. Two concrete gaps on a notched/Dynamic-Island phone:

1. The viewport meta lacks `viewport-fit=cover`, so `env(safe-area-inset-*)` never applies — content can render under the Dynamic Island (top) and the home indicator (bottom), and under the rounded corners in landscape.
2. The layout hasn't been verified against horizontal overflow at ~320–393 pt. Candidate overflow sources: the marker bar (Back · "Currently reading: X" · Next), the Reset two-step affordance (three inline buttons injected into the status line), long unbroken source slugs/URLs, and the tab row.

Input focus-zoom is a *latent* risk only — the sole form control today is the capture `<textarea>` at 1rem (≥16px on mobile, so Safari won't zoom); the defined-but-unused `select`/`input` rules lack a font-size and would zoom if ever rendered. We fix it defensively.

## Requirements

- **R1** — Content clears the Dynamic Island, home indicator, and landscape corner insets on iPhone 17 (safe-area aware).
- **R2** — No horizontal scrolling / no clipped content at 320–393 pt width; dense control rows wrap instead of overflowing.
- **R3** — No unwanted zoom when focusing any form control (all inputs ≥16px).
- **R4** — Existing desktop appearance and the parchment design are unchanged.

## Key Technical Decisions

**KTD1 — Opt into the iOS safe-area model rather than hard-coding device insets.** Add `viewport-fit=cover` to the viewport meta and pad the layout with `env(safe-area-inset-*)` (with `0px` fallbacks via `max()`), so the same CSS adapts across iPhone 17 and every other notched device — no per-device magic numbers. Grounded in current iOS behavior: iPhone 17 reports safe-area insets correctly *only when the page declares `viewport-fit=cover`*.

**KTD2 — Pure CSS + one meta attribute; no new files, no JS.** The fix lives entirely in `web/index.html` (viewport meta) and `web/styles.css`. No manifest, no icons, no layout-model change — matches the confirmed "rendering correctness only" scope.

**KTD3 — Fix overflow by making dense rows wrap and long tokens break, not by shrinking.** Keep the readable type scale; ensure `flex-wrap` + `overflow-wrap: anywhere` where dense content or long slugs could push past the viewport.

## Implementation Units

### U1. Safe-area-aware viewport

- **Goal:** Content respects the Dynamic Island, home bar, and landscape corners on iPhone 17.
- **Requirements:** R1, R4.
- **Dependencies:** none.
- **Files:** `web/index.html`, `web/styles.css`.
- **Approach:** In `index.html`, set the viewport meta to `width=device-width, initial-scale=1, viewport-fit=cover`. In `styles.css`, add the safe-area insets to the outer container so the whole page shifts inside the safe area: pad `.wrap` (or `body`) using `max(<existing pad>, env(safe-area-inset-<side>))` for top/right/bottom/left, preserving the current padding as the floor on non-notched screens. Keep the parchment `body` background extending edge-to-edge (only the content padding changes), so the fill still bleeds under the island rather than leaving a bar.
- **Patterns to follow:** existing `.wrap` padding + the `@media max-width: 600px` block in `web/styles.css`.
- **Execution note:** CSS/meta only — verify in the browser at a narrow, notched viewport rather than with unit tests.
- **Test scenarios:** `Test expectation: none — layout/CSS; verified by the narrow-width browser pass in the Verification Contract.`
- **Verification:** at iPhone-17 width the header and footer are not overlapped by the status bar / home indicator; desktop layout is visually unchanged.

### U2. Narrow-width overflow + input hardening

- **Goal:** No horizontal scroll or clipped controls at 320–393 pt, and no input focus-zoom.
- **Requirements:** R2, R3, R4.
- **Dependencies:** U1.
- **Files:** `web/styles.css`.
- **Approach:** Guarantee no horizontal overflow: confirm/enforce `flex-wrap: wrap` on the marker bar, tab row, and `.data-controls`; make the Reset two-step affordance wrap (its injected buttons should sit in a wrapping container, with comfortable spacing, not a single non-wrapping line); add `overflow-wrap: anywhere` (or `word-break`) to entry/dossier/`.cite-src` text so a long source slug or pasted URL can't force a wide line. Set `font-size: 16px` on `.capture select, .capture input[type="text"]` (defensive, prevents iOS zoom if ever rendered) and confirm the textarea stays ≥16px on mobile. Optionally add `-webkit-tap-highlight-color` softening and `overflow-x: hidden` on the body as a backstop (only if a real overflow source can't be otherwise removed — prefer fixing the source).
- **Patterns to follow:** the existing `@media max-width: 600px` block, `.marker-bar`/`.tabs`/`.data-controls` flex rules in `web/styles.css`.
- **Execution note:** CSS only — verified by the narrow-width browser pass; drive the Reset two-step and open a provenance disclosure to confirm neither overflows.
- **Test scenarios:** `Test expectation: none — layout/CSS; verified by the narrow-width browser pass in the Verification Contract.`
- **Verification:** at 320 pt and 393 pt widths there is no horizontal scrollbar; the marker bar, tabs, data controls, and the active Reset two-step all wrap within the viewport; focusing the capture field does not zoom the page.

## Verification Contract

- **Narrow-width browser pass:** serve `web/` (`python3 -m http.server --directory web`), load in Claude-in-Chrome at an iPhone-17-class narrow viewport (~393×852, and a 320-wide stress check). Confirm: no horizontal scroll; header/footer clear the safe areas; tabs, marker bar, data controls, and the Reset two-step wrap; a provenance disclosure and a long source slug don't overflow; focusing the capture textarea doesn't zoom.
- **Desktop regression:** at desktop width the parchment layout is visually unchanged from the current build.
- **Syntax gate:** `node --check web/*.js` still passes (no JS changed, but keep the gate green).

## Definition of Done

- U1 + U2 landed; the narrow-width browser pass is clean (no overflow, safe areas respected, no input zoom); desktop appearance unchanged; committed and pushed (auto-deploys to Pages).

## Risks & Dependencies

- **iOS 26 landscape top-edge touch dead-zone:** current iOS has a landscape region along the top edge where touches are silently captured and which `env(safe-area-inset-*)` does not report. Low impact here — the app is portrait-primary and has no critical control pinned to the top edge in landscape. Note only; no work unless a control lands there.
- **No new dependencies.** Pure CSS + one meta attribute; deploys via the existing push-to-`main` Pages workflow.

## Sources & Research

- iPhone 17 / iOS 26 safe-area behavior (insets apply only under `viewport-fit=cover`; iPhone 17 reports them correctly; landscape top-edge dead-zone): [Polypane — safe-area-inset guide](https://polypane.app/blog/using-safe-area-inset-to-build-mobile-safe-layouts/), [iOS Safe Area Guide (iPhone 17 and older) — Figma](https://www.figma.com/community/file/1425591247196745890/ios-safe-area-guide-iphone-17-and-older), [Safari iOS 26 viewport discussion](https://discussions.apple.com/thread/256138682).
