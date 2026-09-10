# fls-harness-demo

A small app that exists to be modified by an agent.

It is the vessel for the Fidelity Ladder harness proof of concept: a request typed into a web page
becomes wireframes, then a working prototype, then a real change in this repository with its own
tests, opened as a pull request behind a feature flag. Two screens keep the surface honest — a
puzzle and its results — so what the pipeline does is visible rather than buried in an application.

```
pnpm install
pnpm run dev     # http://127.0.0.1:8794
pnpm run test    # unit
pnpm run e2e     # end to end; builds and previews for itself
```

The design system lives in `design-system/` as data: tokens and component specs extracted from a
design tool and committed, so a build never depends on a live design connection. `src/ds/` is that
system as React components; screens compose from it. Every new surface ships behind a flag in
`flags.json`, off until a human turns it on.

Working rules for agents and people alike: `CLAUDE.md`.
