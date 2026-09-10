# CLAUDE.md — agent guide

## Read this first: what this repository is for

This is **`fls-harness-demo`**, a fork of [`playpip/pip-web`](https://github.com/playpip/pip-web)
(MIT) used as the **vessel** for the Fidelity Ladder System harness. An agent works here
**unattended**, inside a rung of a human-gated ladder, so the rules in this section are constraints
rather than suggestions. A change that breaks one of them is wrong even if it works.

Everything after this section is upstream's guide to the app itself, and it still applies.

### The vessel rules

- **Compose from the design system.** `design-system/pack.json` names the components, their props
  and the rules they carry; the components themselves are in `design-system/night-shift/`. Do not
  hand-roll a button, a badge or a chip, and do not add a UI library.
- **Every value traces to a token.** Use the `--ns-*` custom properties (they are in the document
  already, via `design-system/tokens.app.css`) or the app's own Tailwind theme tokens. A raw hex or
  pixel value that the token layer already carries is a bug. If the layer is missing something, say
  so rather than inventing it.
- **Never edit the generated files.** `design-system/{pack,tokens.dtcg,tokens.night,tokens.day}.json`
  and `tokens.app.css` are written by `pnpm design-system` from `night-shift/`. Change the source and
  re-run. `pnpm test:design-system` is in the gate and will catch you.
- **Every new surface ships behind a flag** in `flags.json`, off in **both** environments until a
  human turns it on. Read flags through `src/lib/flags.ts`, never by importing the JSON directly.
  The ladder's rung 5 writes that file, so its shape is a contract with the engine.
- **Tests are part of the change, not a follow-up.** `pnpm test:all` must be green before you open a
  pull request. Tests are **AVA**, not Vitest. Write the test first where you can; a feature with no
  test is unfinished.
- **Accessibility is a floor.** Every control is a real control with an accessible name, a 44px
  effective target and a visible focus state. Anything conveyed by colour also carries text. Honour
  `prefers-reduced-motion`. A modal traps focus and closes on Escape.
- **Never push to `main` and never merge your own pull request.** Open the PR and stop.
- **Do not touch the harness's own surfaces**: `design-system/night-shift/` is a vendored artifact
  synced from Claude Design, and `sorb.config.json` plus `src/components/SorbTokens.tsx` are the
  token bridge. Change them only when the task is explicitly about them.

### The design system's own rules

Carried in `design-system/pack.json` under `rules` and `refuses`. The one broken first: **the signal
colour `--ns-signal` means the clock is waiting on you, and nothing else.** It is not a brand colour,
a header colour or a highlight. Win, loss and warning have their own semantic colours precisely so
the accent never has to share duty.

### Commands this fork adds

```bash
pnpm design-system        # rebuild the pack from night-shift/
pnpm test:design-system   # fail if the pack is out of date
```

`design-system/README.md` explains the pack and the Sorb token bridge; `REGENERATE.md` is the
procedure.

---

# Upstream: agent guide for Pip

**Pip** is a clean, single-player Texas Hold'em web app (play money, no account needed,
desktop-first). GitHub repo: [`playpip/pip-web`](https://github.com/playpip/pip-web).

Full documentation lives in **[`docs/`](./docs/README.md)** — read it before non-trivial
work. This file is the quick-start and the non-negotiables.

## Read first (by task)

| Doing… | Read |
|--------|------|
| Anything | [docs/README.md](./docs/README.md), [docs/architecture.md](./docs/architecture.md) |
| Poker rules / AI | [docs/poker-engine.md](./docs/poker-engine.md) |
| Tournament pacing / economy | [docs/game-flow.md](./docs/game-flow.md) |
| UI / styling | [docs/design.md](./docs/design.md) |
| Copy / naming / tone | [docs/brand.md](./docs/brand.md) |
| Venues / venue art | [docs/venues.md](./docs/venues.md) |
| Persistence / backup / offline PWA | [docs/data-and-offline.md](./docs/data-and-offline.md) |
| Setup / testing / conventions / deploy | [docs/development.md](./docs/development.md) |

## The three layers (respect the boundaries)

1. **Engine** — `src/lib/poker/`. Pure, deterministic, React-free, unit-tested. Rules live here.
2. **Orchestration** — `src/store/game.ts` (turn pacing, AI timers, economy) + `src/store/profile.ts` (persisted).
3. **Presentation** — `src/components/`, `src/app/`. Reads stores; look & feel only.

Rules change → engine (+ tests). Pacing/money → game store. Looks → components + tokens.

## Non-negotiables

- **Package manager: pnpm.** Never hand-pin versions — install latest, let pnpm resolve.
- **Tests: AVA**, not Vitest. Engine changes ship with tests.
- **Colours: theme tokens only.** Never hardcode `bg-white/…`, `text-black`, etc. Use
  `foreground/<alpha>` for subtle surfaces, `bg-primary`/`text-primary-foreground` for
  emphasis. Must work in **both light and dark**. (See docs/design.md.)
- **No real money framing.** Play-money "chips" only; never show `$`. No casino textures,
  no pop-ups, no dark patterns. (See docs/brand.md.)
- **Determinism in the engine.** Pass a seeded `Rng`; no `Date.now()`/`Math.random()` in
  logic that must be reproducible.
- **Engine stays pure.** No React/store/browser imports in `src/lib/poker/`.
- **Persisted profile changes** → bump `PERSIST_VERSION` + add a `migrate` branch in
  `src/store/profile.ts`.
- **`set-state-in-effect`** (React 19 rule, enforced by convention) — use the patterns in
  docs/development.md (`useHydrated`, mount-form-while-open), not `setState` in `useEffect`.
- **Releases are automatic.** Pushing to `main` deploys *and* cuts a release: the version
  auto-bumps (patch by default; `#minor`/`#major` in the commit **subject line** to bump
  harder — the body is ignored), tags, and publishes a GitHub Release. Don't bump
  `package.json` version by hand. (See docs/development.md → Deploy & releases.)

## Commands / definition of done

```bash
pnpm dev         # http://localhost:3000
pnpm test:all    # full gate: format, types, lint (biome), AVA, knip, audit
pnpm test        # AVA engine suite only
pnpm format      # biome — format + safe fixes
pnpm build       # for structural changes
```

A change is done when **`pnpm test:all` passes** (and `build` for structural work).
UI isn't unit-tested — verify UI by running the app. Commit/push only when asked.
