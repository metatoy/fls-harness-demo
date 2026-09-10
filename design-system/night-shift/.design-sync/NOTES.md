# design-sync notes — Night Shift

Carried forward between syncs. Read before running `/design-sync` again.

## Shape: prebuilt, no converter

This folder is already in Claude Design's design-system layout, so **no build/converter step
applies** — the sync uploads the folder as-is. Cards are indexed from the **first line**
`<!-- @dsCard ... -->` marker of each preview page. `thumbnail.html` deliberately has no marker
(it is the cover, not a card).

Local-only, never uploaded: `.design-sync/`, `.git/`, `.render-check.json`, `.DS_Store`,
`.gitignore`.

## Two copies of this folder exist

Canonical: `fls-harness-demo/design-system/night-shift/` (this one).
The standalone repo `metatoy/night-shift-design-system` was a snapshot and was **moved to the
Trash on 2026-09-10**; the consolidation matches what `HOW-TO-PUBLISH.md` already prescribed
("Edit here and sync from here… do not edit both"). If that repo is ever restored, treat it as
stale — it predates every fix below.

## Fixed during the 2026-09-10 first sync

1. **Five `@dsCard` viewport heights were too short, clipping card content.** Measured true
   content height at 700px wide and corrected the markers:

   | page | was | now | true content |
   |---|---|---|---|
   | `guidelines/north-stars.html` | 700x240 | 700x425 | 407 |
   | `guidelines/type-scale.html` | 700x330 | 700x390 | 373 |
   | `guidelines/refusals.html` | 700x260 | 700x310 | 293 |
   | `guidelines/colour-signal-law.html` | 700x250 | 700x290 | 273 |
   | `guidelines/motion-access.html` | 700x230 | 700x260 | 244 |

   north-stars was the severe one: the fifth commitment ("Motion reports state") was entirely
   invisible and the fourth was cut mid-sentence. **When editing any preview page, re-measure and
   update its marker** — the height is not enforced anywhere, so it fails silently and only shows
   up as a clipped card in the picker.

2. **Both `.card.html` specimens restated the component CSS locally, and it had drifted.**
   They declared their own `.btn` / `.badge` / `.card` / `.seat` / `.chip` rules instead of using
   the shipped `.ns-*` classes, despite already linking `styles.css`. The copies had fallen
   behind: no `:hover` / `:active` / `transition`, and hardcoded `1px` where the real rule uses
   `var(--ns-border)`. This is the dangerous class of bug for a design system — **the specimen can
   look perfect while the shipped CSS is broken**, because the card was never exercising it.
   Both pages now use the real `.ns-*` classes and mirror exactly what the JSX components emit;
   only layout helpers (`.g`, `.lbl`, body padding) remain local. Renders are pixel-identical.

3. **`styles.css` was missing `.ns-pot__label` and `.ns-pot__v`.** `PotDisplay.jsx` emits them but
   the shipped stylesheet did not define them. It went unnoticed because every component also
   carries its own inline `<style>`, so the component self-heals — but `HOW-TO-PUBLISH.md` states
   `styles.css` is what actually renders in a consuming project. Added, copied verbatim from the
   component.

4. **Root `tokens.css` had drifted 7 variables behind `tokens/*.css`.** It is linked directly by
   the `.dc.html` overview (which cannot follow the `@import` chain in `styles.css`). Harmless at
   the time — the overview used none of the 7 — but a live trap. It is now **generated** from
   `tokens/*.css` and carries a do-not-hand-edit banner. Both sheets currently hold the same 71
   variables. **Edit `tokens/*.css` and regenerate; never hand-edit `tokens.css`.**

## Known, left alone deliberately

- `.ns-fig` is emitted by `Figure.jsx` but has no rule in `styles.css`. Correct as-is — it is a
  bare container; the styling lives on `.ns-fig__label` / `.ns-fig__v`.
- `--ns-track-tight` is defined in `tokens/typography.css` and used nowhere. Dead token.
- Every component duplicates its CSS in an inline `<style>` **and** in `styles.css`. This is
  intentional per `HOW-TO-PUBLISH.md` ("a new component needs both"), but it is the root cause of
  findings 2 and 3 — the two copies drift silently. **When changing a component's CSS, change it
  in both places.**
- Opening the `.dc.html` overview over `file://` logs one console error (`Fetch API cannot load
  file://… URL scheme "file" is not supported`) — the canvas runtime fetching itself. Not a
  defect; it does not occur when served over https.

## Verification method used

Playwright via `sorb-test-ui` (`node _ns_shoot.mjs` / `_ns_verify.mjs`, written to the session
scratchpad). Each preview rendered at its declared `@dsCard` viewport, checked for content
overflow, console errors, failed requests, and token resolution (`--ns-ground` resolving proves
the `@import` chain loaded). All 7 cards clean at upload time.
