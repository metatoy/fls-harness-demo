# The design system, and the pack built from it

`night-shift/` is the design system itself. Everything else in this folder is generated from it by
`build-pack.mjs`, so there is exactly one place a value is authored and no second copy to keep in
step.

| Path | What it is | Edit? |
|---|---|---|
| `night-shift/` | **Night Shift**, in Claude Design's own layout. Tokens, one stylesheet, React components, guidelines. The source of truth. | Yes — and re-run the build |
| `pack.meta.json` | The half of the pack no parser can derive: what a colour means, what a component is for, what a builder must not do. | Yes |
| `build-pack.mjs` | The generator and its checks. | Yes |
| `pack.json` | Tokens + components + rules: the bounded context a ladder rung reads. | Generated |
| `tokens.dtcg.json` | The token layer as DTCG, for the Sorb bridge and any token tool. | Generated |
| `tokens.night.json` | The flat committed token set `SorbProvider` takes. | Generated |
| `tokens.day.json` | The same set with the day overlay applied. | Generated |
| `tokens.app.css` | The token layer as one stylesheet, imported by `globals.css`. | Generated |

```bash
pnpm design-system        # rebuild the generated files
pnpm test:design-system   # fail if they are out of date (part of pnpm test:all)
```

## Why the pack exists at all

The prototype rung and the build rung compose from this system. They read `pack.json` — a file —
rather than calling a design tool, so the harness VM holds no design credential, and a given commit
builds the same way every time. Refreshing the pack is a deliberate act with a diff, not a side
effect of someone else's edit.

## What the build refuses to do

Each of these stops the build rather than producing a plausible-looking artifact:

- a token whose name matches no group rule (add a rule; do not widen one);
- a `var(--ns-…)` used anywhere in `night-shift/` that no token defines;
- a colour token with no role in `pack.meta.json`;
- a component in `pack.meta.json` whose file does not exist;
- a day override for a token the night theme never defines.

The failure this system is most prone to is drift: a specimen keeps looking correct while the
shipped CSS rots underneath it. That is not hypothetical here — the first `/design-sync` found two
specimen pages that had restated the component CSS locally and fallen behind the real rules. The
checks above are aimed squarely at that class of bug.

## Two things worth knowing about the values

**Motion durations are the base values, not the reduced-motion ones.** `tokens/motion.css` collapses
both durations to `1ms` inside a `prefers-reduced-motion` block. A parser that takes the last
occurrence of a property records `--ns-m-state: 1ms`, which is wrong — and Claude Design's own
generated `_ds_manifest.json` does exactly that. This build reads only the unconditional `:root`
value and records the reduced-motion figure separately.

**DTCG values are CSS strings.** Every `$value` in `tokens.dtcg.json` is the exact string the custom
property carries, so the file round-trips to `--ns-*` without a transform. That is a deliberate
deviation from DTCG's typed value objects, declared at the root as `valueSyntax: "css"`. Where a
value is a shorthand DTCG models as a composite — typography, shadow — the parsed structure sits
alongside it under `$extensions`, rather than the string pretending to be the composite.

## The Sorb bridge

`sorb.config.json` at the repository root points the bridge at `tokens.dtcg.json`. With `sorb dev`
running, a proposed token set from the design tool replaces these values live in the running app,
with no rebuild. `src/components/SorbTokens.tsx` mounts the provider at the app root; preview is off
in production builds.

Two limits, both real and both verified rather than assumed:

- **`--ns-m-ease` cannot travel through a preview.** Sorb sanitises token values against an
  allowlist of CSS functions before injecting them, and `cubic-bezier` is not on it
  (`sorb-leaf/src/sanitize.js`). The committed value still applies normally; only live preview of
  that one token is unavailable. `pnpm design-system` reports this whenever `@sorb/leaf` is
  installed, so the list stays honest if either side changes.
- **Day mode is not wired through Sorb.** Sorb's mode-aware path builds a stylesheet whose bare
  `:root` carries the light set and switches to dark on `prefers-color-scheme`. Night Shift inverts
  that: night is home at `:root` whatever the operating system prefers, and day is an explicit
  `[data-theme="day"]` opt-in. Handing Sorb the pair would quietly make day the default, so the
  committed set is night only and the day overlay stays in `tokens.app.css` where it is authored.

## Publishing changes back to Claude Design

See `night-shift/HOW-TO-PUBLISH.md`. Night Shift is already registered as a design system
(`65396e49-13f8-49dc-804d-d22d0165635c`), so a sync answers **update existing**.
