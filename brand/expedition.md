# Expedition — pip, the next turn of the crank

**Product:** pip — single-player Texas Hold'em, play money, no account, open source.
**Vessel:** `metatoy/fls-harness-demo` (fork of `playpip/pip-web`).
**Design system:** Night Shift.
**Filed under:** Even Money, and answerable to *nobody at our tables is playing a different
game*.

---

## What this expedition is for

pip already works. This is not a rescue; it is choosing the next thing worth building in a
product that has more surface than it has polish.

Three questions, in one expedition, because they trade against each other and answering
them separately produces three features that fight:

1. **Where is the UX costing us?**
2. **What would make a new player stay past the first session?**
3. **What would make a serious player choose this over what they already use?**

The third is the one that decides whether we are a toy. The second is the one that decides
whether anyone finds out.

---

## What is already here

Read before proposing anything, because the most common failure in this product is building
a second version of something it already has.

| Surface | What it does |
|---|---|
| `/game/rail`, `/game/ladder`, `/game/side` | Cash tables, tournament ladder, side games — where play happens |
| `/game/drills` | Four drills: which hand wins, count your outs, pot odds, hand strength |
| `/learn/*` | Written guides: hand rankings, how to play, bet sizing, how often you flop a set |
| `/tutorial` | First-run teaching path |
| `/poker-odds-calculator` | Standalone tool, and a search entry point |
| `/stats`, `/hand` | Career numbers; a single shareable hand |
| `lib/coach.ts` | **"Second opinion"** — one honest read on the hand you just played, or silence |
| `lib/reads.ts` | Plain-English opponent tendencies from observed stats |
| `lib/recap.ts` | End-of-run report, shown once and then gone by design |
| `lib/playStyle.ts`, `standing.ts`, `rating.ts` | How the player plays, where they stand, what they are worth |

Two of these deserve attention because they are further along than they look. **Second
opinion** is already the honest-coaching principle in code: one named moment with the
arithmetic that makes it true, or nothing at all, explicitly refusing to invent a lesson
where there wasn't one. And **reads** already treats watching opponents as a skill to be
taught rather than a readout to be handed over.

The teaching thesis is half-built and nobody has said so out loud.

---

## Focus 1 — UX: the hand is the product, the rest is overhead

The design system's first north star is that the table earns its keep by disappearing during
a hand. Measure the product against that and the question stops being "is it pretty" and
becomes **what is in the way**.

Candidate ground:

- **The decision moment.** What a player must read to act — pot, stack, what to call, what a
  raise costs — and whether it is all legible in one glance, one-handed, in poor light. This
  is the system's own stated bar and the one most easily lost to a later feature.
- **The recap as the teaching moment.** A run ends, the recap appears once, and it is gone.
  That is a deliberate refusal of history-as-pressure, and it is also the single highest-
  attention instant in the whole product. Whether it is carrying its weight is worth asking.
- **Re-entry.** What it costs to come back after a day away: whether the player is returned
  to where they were or made to find it again.

Not in scope: a visual refresh. Night Shift is settled.

---

## Focus 2 — New players: from "which hand wins" to a second session

The product has teaching surfaces, and they sit beside the game rather than inside it. A
new player is asked to go and learn, then come back and play. Most do not come back.

Candidate ground:

- **Scaffolding inside the hand, not next to it.** A beginner needs to know how strong their
  hand is while deciding, which is exactly the thing an expert must never be handed
  invisibly. This is the north star's live edge: allowed if it is **on offer to everyone and
  the table knows who has it**, forbidden the moment it is a private advantage. Any proposal
  here must say which side of that line it is on and how a player can tell.
- **The first five minutes.** What happens between landing and the first hand played, and
  whether the tutorial is the shortest honest path to a real decision.
- **Second opinion, earlier.** The coaching module is strongest for a player who already
  knows what they did wrong. Whether it can speak usefully to someone who does not, without
  becoming the running commentary it deliberately refuses to be.

---

## Focus 3 — Serious players: a reason to choose this

A studying player already has tools. They will not switch for a nicer table. They switch for
**a shorter path from "I played badly" to "I know why, and I have drilled it"** — and that
path is where this product's parts are unusually well placed.

Candidate ground:

- **From leak to drill.** `playStyle`, `standing` and `rating` describe how a player plays;
  the drills train specific skills. Nothing connects them. A player who is losing money on
  the turn should meet a turn spot, not a general drill menu.
- **Spots from your own hands.** The drills are synthetic. The hands a player misplayed are
  real, recorded, and more motivating than any generated spot.
- **Opponent modelling as a taught skill.** `reads` already surfaces tendencies. Whether a
  player can be taught to form the read *before* being shown it is the difference between a
  readout and a lesson.
- **The coach's seat.** Coaches run practices on our software. What a coach needs — a hand
  to hand to a student, a spot to set, a way to see what the student did — is almost
  entirely unbuilt, and is the clearest wedge into the professional market.

---

## Success

An expedition on this succeeds when:

- One of the three focuses has produced a change a real player can use, behind a flag, with
  its own tests, in a reviewable diff.
- The change composes from Night Shift and breaks none of its refusals.
- If it touches information available during a live hand, it states plainly which side of
  the north star it sits on, and a player can tell by looking.
- The other two focuses are *named* rather than half-built. Three simultaneous directions
  is how a product gets worse.

## Not in scope

Multiplayer. Real money. Anything that reads a live hand for one player and not the others.
A visual redesign. A recap inbox — the recap is shown once on purpose.

---

## Altitude

**Feature.** One reviewable change, flag-gated, inside the line budget. This is a turn of
the crank, not a programme — and the point of filing it as an expedition is that the choice
between the three focuses is made once, in the open, by a person, before anything is built.
