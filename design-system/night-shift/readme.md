# Night Shift

> To publish or update this system in Claude Design, see `HOW-TO-PUBLISH.md`.

A design system for a play-money poker product.

Most poker interfaces sell a casino: green felt, gold, chips clinking, a room you are lucky to be
in. This one is designed for the truth of how the game is actually played, which is one-handed, in
poor light, late. So the room is a warm dark you can sit in for an hour, and exactly one cool
accent means **it is your turn**.

## North stars

1. **The table is the product.** Everything that is not cards, chips or people is overhead. The
   system earns its keep by disappearing during a hand.
2. **Money is information, not spectacle.** Stacks, pot and the Roll are figures read under time
   pressure. They line up, they never jitter, they never celebrate at you.
3. **It is play money and it says so.** No near-miss theatre, no manufactured urgency, no dark
   patterns. The honesty is the differentiator.
4. **Legible one-handed, in the dark.** Contrast and target size are structural, decided here,
   not audited later.
5. **Motion reports state.** A screenshot of the table looks identical to the table at rest.

## The one rule people break first

The signal colour `--ns-signal` means the clock is waiting on you. It is not a brand colour, not a
header colour, and not a highlight. Win, loss and warning have their own semantic colours precisely
so the accent never has to share duty. The moment the signal means two things it means nothing, and
the player loses the one cue that tells them to act.

## Structure

```
tokens/colors.css       the room, the signal, semantic state, cards, chips
tokens/typography.css   two voices; figures tabular by default
tokens/spacing.css      4px base, radii, the 44px tap target, table measurements
tokens/motion.css       two durations, one curve, reduced-motion collapse
styles.css              base layer; imports the tokens and sets only what every surface needs
components/core/        Button, Badge, Figure — the vocabulary any screen uses
components/table/       PlayingCard, ChipStack, Seat, PotDisplay — the game objects
guidelines/             the decisions that are not expressible as a token
```

## Using it

Import `styles.css` once at the root. Compose from the components rather than restyling them. Every
value in a stylesheet should be a `var(--ns-*)`; a raw hex or pixel value that is not in the token
layer is a bug, and if the layer is missing something, add it there rather than working around it.

## What this system refuses

Green felt, wood grain, gold anything, drop-shadowed 3D chips, card-flip skeuomorphism, coin-shower
wins, countdown urgency that is not a real clock, "nearly!" messaging on a lost hand, and any use of
the signal colour that is not the clock waiting on you. Each is easy, and each converts the product
from a game into a machine for extracting another hand.
