# CLAUDE.md — fls-harness-demo

The app the fidelity ladder builds in. An agent works here unattended, so the rules below are
constraints, not suggestions. A change that breaks one of them is wrong even if it works.

## What this app is
Two screens — a puzzle and its results — plus a design system, feature flags, unit tests and an
end-to-end pass. It is small on purpose. It exists to exercise a build pipeline end to end, not to
be a real product. Resist the urge to make it more interesting.

## Hard rules

- **JavaScript only, never TypeScript.** Types are JSDoc. No `.ts` files, no `typescript` dependency.
- **Compose from `src/ds/`.** Those components carry the design system. Do not hand-roll a button,
  a chip, or a card, and do not introduce a UI library.
- **Every value traces to `design-system/pack.json`.** Use the CSS custom properties in
  `design-system/tokens.css`. A raw hex or pixel value that is not in the pack does not belong in a
  stylesheet. If the pack lacks what you need, say so rather than inventing it.
- **Every new surface ships behind a flag** in `flags.json`, off in both environments until a human
  turns it on. Read flags through `src/flags.mjs`.
- **Tests and an e2e pass are part of the change, not a follow-up.** `pnpm run test` and
  `pnpm run e2e` must both be green before you open a pull request. Write the test first when you
  can; a feature with no test is unfinished.
- **Accessibility is a floor, not a goal.** Every control is a real control with an accessible name,
  a 44px effective target, and a visible focus state. Anything conveyed by colour also carries text.
  Honour `prefers-reduced-motion`. A modal traps focus and closes on Escape.
- **Never push to `main` and never merge your own pull request.** Open the PR and stop.

## The design system's own rules
Carried in `design-system/pack.json` under `rules`. The ones most easily broken:
one primary dominates a surface; red only ever flags; grounds stay warm neutral, never pure black
or white; fidelity is stepped, so no gradients as structure.

## Commands
```
pnpm install          pnpm run dev        # http://127.0.0.1:8794
pnpm run test         pnpm run e2e        # e2e builds and previews for itself
pnpm run check        # test + build, the quick gate before a PR
```

## Layout
```
src/ds/         the design system as components — the vocabulary you compose from
src/screens/    Home (the puzzle) and Results (the target of most requests)
src/flags.mjs   flag resolution, pure and testable
design-system/  pack.json + tokens.css, generated; see design-system/REGENERATE.md
e2e/            Playwright specs; they build and preview the app themselves
```
