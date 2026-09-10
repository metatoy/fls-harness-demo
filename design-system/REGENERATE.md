# Regenerating the pack

```bash
pnpm design-system
```

That is the whole procedure. It reads `night-shift/` and rewrites `pack.json`,
`tokens.dtcg.json`, `tokens.night.json`, `tokens.day.json` and `tokens.app.css`. It needs no
network and no design credential. `pnpm test:design-system` runs the same build with `--check`,
writes nothing, and fails if any artifact is out of date; it is part of `pnpm test:all`, so a change
to the design system that is not rebuilt cannot reach a green gate.

## When

- After changing anything under `night-shift/` — a token value, a component, a guideline.
- After pulling a `/design-sync` down from Claude Design.

Commit the source change and the regenerated files together. A diff that shows one without the
other is the thing the check exists to catch.

## Changing a token

Edit the relevant file under `night-shift/tokens/` and re-run. If the token is new:

1. It needs a **group rule** in `build-pack.mjs` (`GROUPS`), or the build stops. Add a rule; do not
   widen an existing regex to swallow it, because the point of the table is that every token has a
   deliberate home.
2. If it is a colour, it needs a **role** in `pack.meta.json`, or the build stops. The role is what
   a builder reads to decide whether it may use the colour, so write it as an instruction rather
   than a description.

## Changing a component

Edit the `.jsx` under `night-shift/components/` **and** the matching rules in `night-shift/styles.css`.
The stylesheet is what actually renders in a consuming project; the JSX is the readable form of the
same behaviour. A component whose CSS lives only inside its JSX renders unstyled through
`_ds_bundle.js`. Then update its entry in `pack.meta.json` — the prop list and the usage rule are
what a builder composes from.

## The other accepted pack sources

The pack schema is not tied to Claude Design. Two other inputs produce the same `pack.json` shape,
differing only in `source.kind`:

- **A Figma share link** — variables through `get_variable_defs`, structure through
  `get_design_context`. Note that `get_design_context` needs the `figma-design-to-code` guidance,
  which is absent from Figma plugin 2.2.12 and has to be fetched as the MCP resource
  `skill://figma/figma-design-to-code/SKILL.md`.
- **Pasted text** — a description of tokens and components, transcribed into the same shape.

Neither is wired up here. For this vessel the committed artifact is the deliverable, and a
`design_pack` CLI is only worth writing when a second instance needs one.
