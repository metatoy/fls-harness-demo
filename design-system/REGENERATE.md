# Regenerating the design pack

`pack.json` and `tokens.css` are **generated artifacts, committed on purpose**. The prototype rung
and the build rung read these files; neither the harness VM nor CI needs a live Claude Design
connection, so there is no extra credential to hold or rotate and a given commit always builds the
same way.

## Source
Claude Design project **"FLS Design System A — Resolution"**
`e0b07628-0962-4c18-afc6-00bd31f4704e` — <https://claude.ai/design/p/e0b07628-0962-4c18-afc6-00bd31f4704e>

Files read: `tokens.css` (the canonical `:root` set), `FLS Design System A.dc.html` (palette roles,
the ratchet, type voices), `design_handoff_admin_workbench/README.md` (component anatomy, radius
and border scales, textures, motion, state model).

## When to regenerate
When the source project changes, or when a component is added that the prototype builder should
compose from. Not on every build.

## How
From a machine whose Claude Code has Claude Design access (`/design-login` if the token lacks
`user:design:read`), in a session with the `claude-design` MCP:

1. `list_files` on the project with `depth: -1` to see what moved.
2. `read_file` on the three source files above.
3. Rewrite `tokens.css` from the project's own `tokens.css`, keeping the extraction header.
4. Update `pack.json`: bump nothing if only values changed; add to `components[]` when a new
   component appears; keep `source.extracted` current.
5. Re-run the pack test (`pnpm test design-system` once the stub app has tests) and commit both
   files with a note saying what changed in the source.

## What belongs in the pack
Tokens, component anatomy with real values, and the rules a builder must not violate. Not: brand
asset binaries, prose about the brand's story, or anything a builder cannot act on. Keep it the
size a bounded context can carry.

## Other pack sources
The same schema accepts two other inputs, documented so a future instance is not tied to Claude
Design: a Figma share link (variables via `get_variable_defs`, structure via `get_design_context`,
which needs the `figma-design-to-code` guidance loaded as an MCP resource first) and pasted text
(`--from-text`). All three produce the same `pack.json` shape; only `source.kind` differs.
