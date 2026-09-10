# How to publish this folder as a Claude Design design system

This folder, `design-system/night-shift/` inside the demo app's repository, is the source of truth
for the Night Shift design system. Claude Design is where other projects bind to it. The two are
kept in step with one command, run from this folder.

## The one thing to understand first

In Claude Design, a **design system** is a project of a different type from a normal project, and
that type is fixed when the project is created. Building the right files inside an ordinary project
does not turn it into a design system, and there is no button or API call that converts one. The
only way to get a design system is to create it *as* one, which is what the sync command does. If
you already have the files in a normal project, export them (the ⋯ menu, Download) and start from
the folder, which is exactly how this folder began.

## Two copies exist; this one is canonical

The same files also live in the standalone repository `metatoy/night-shift-design-system`, kept as a
snapshot. Edit here and sync from here. If the standalone copy is ever needed up to date, copy this
folder over it; do not edit both.

## Publish, or update, in three commands

```
cd path/to/fls-harness-demo/design-system/night-shift
claude
› /design-sync
```

`/design-sync` asks whether to create a new design-system project or update an existing one.
This folder is already published: choose **update existing** and pick **Night Shift**
(`https://claude.ai/design/p/65396e49-13f8-49dc-804d-d22d0165635c`, published 2026-09-10). Only
choose "create new" when you are standing up a different system from a folder of your own; that
creates a project of the design-system type and uploads the folder. Every later run diffs the folder against the project and pushes only
what changed, one component at a time, never a wholesale replace. It shows you the exact list of
paths it will write before it writes anything.

## What has to be in the folder for the sync to produce a usable system

| Path | Why it matters |
|---|---|
| `styles.css` | the one stylesheet: the token layer plus the component layer. Consumers link this and nothing else. |
| `tokens/*.css` | the token layer split by concern; `styles.css` imports them |
| `theme.json` | the same decisions as machine-readable data, plus the refusal list |
| `readme.md` | the guide. Claude Design shows it as the system's documentation and Claude reads it first |
| `SKILL.md` | makes the system invocable as a skill inside Claude Design, so "build me a lobby screen" is answered in this system's vocabulary |
| `thumbnail.html` | the cover in the Design systems list |
| `components/**` | the readable JSX sources plus one `*.card.html` specimen page per group |
| `guidelines/*.html` | one page per rule that cannot be expressed as a token |
| `support.js` | the runtime the `.dc.html` overview page needs; regenerate it rather than editing it |

**Card markers.** The Design System pane builds its card index from the **first line** of each
preview HTML:

```html
<!-- @dsCard group="Components" name="Core: Button, Badge, Figure" subtitle="…" viewport="700x330" -->
```

A preview page without that line uploads fine but never appears as a card. Every card and guideline
page in this repository carries one; add one to any new page you create.

## Making changes

Edit the tokens in `tokens/`, and the component layer in `styles.css` next to the component whose
class it styles. The `.jsx` files are the readable form of the components; the CSS in `styles.css`
is what actually renders in a consuming project, so a new component needs both. Run `/design-sync`
again. Then in any Claude Design project bound to this system, the update is picked up on the next
open.

## Doing this for your own design system

1. Build the folder to the shape in the table above. The cheapest way to learn the shape is to open
   an existing design system in Claude Design and read its files; every one of them follows it.
2. Decide where the folder lives. Its own repository suits a system shared by several apps. Here it
   lives inside the demo app's repository, as a subfolder, because the app and the system evolve
   together and one pull request should be able to change both. The sync does not care which; it
   runs from the folder either way.
3. Run the three commands. Answer "create new" the first time; "update existing" after that.
4. Bind it: in any Claude Design project, choose this system as the project's design system. Its
   files are copied into that project under `_ds/`, and the guide and skill are loaded for Claude.

## What this repository does not contain

Nothing secret and nothing generated. `.render-check.json`, written by the sync's validation pass,
is ignored. `support.js` is the vendor runtime and is committed because the overview page needs it
to open, but it is not hand-edited.
