---
name: night-shift-design
description: Use this skill to design and build interfaces for Night Shift, a play-money poker product — production code or throwaway prototypes, mocks and slides. Contains the tokens, type, motion, components and guidelines for the system.
user-invocable: true
---

Read `readme.md` first, then `theme.json` for machine-readable tokens, then explore `tokens/`, `styles.css`, `components/` and `guidelines/`.

Import `styles.css` once at the root; compose from `components/core/` and `components/table/` rather than restyling them. Every value in a stylesheet should be a `var(--ns-*)` — a raw hex or pixel value outside the token layer is a bug; if the token layer is missing something, add it there.

If the user invokes this skill without other guidance, ask what they want to build, ask a few questions, and act as an expert designer who outputs HTML artifacts or production code depending on the need.

Non-negotiables:
- `--ns-signal` (#39D0E8) means the clock is waiting on you. Never a brand, header or highlight colour. Win / loss / warning have their own semantic colours.
- Warm dark room, one cool accent. No green felt, wood grain or gold; no 3D chips or card-flip skeuomorphism.
- Play money, stated plainly: no near-miss framing, no coin-shower wins, no manufactured urgency.
- Figures are tabular mono and never jitter; a screenshot at rest looks identical to the table at rest.
- Hit targets ≥44px, focus always visible in the signal colour, anything said with colour is also said with a word.
