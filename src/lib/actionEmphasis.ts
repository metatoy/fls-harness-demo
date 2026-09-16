/**
 * The in-hand action bar's emphasis.
 *
 * A player acting under a clock has to hit fold, call or raise without looking twice, so the
 * three of them are the loudest controls on the felt and they are told apart by fill: the raise
 * is solid, the call is outlined in the same green, the fold is neutral. Fold stays the quietest
 * of the three on purpose — a bar that shouts "fold" is steering the player.
 *
 * Nothing here touches what a button does, what it costs, or when it is legal: this is emphasis,
 * not behaviour. It gives the hero no information the table does not already have — the labels
 * and the amounts are the ones that were already on the bar — so it sits on the public side of
 * the north star.
 *
 * The colours and the sizes live in `src/app/globals.css` under `.pip-actions`, keyed off the
 * `data-action` attribute this module names. They are CSS rather than utility classes because
 * the design system's Button ships its own unlayered <style>, which beats a Tailwind utility on
 * the same element; the comment there has the detail.
 */

/** The flag the whole surface sits behind. Off in both environments until a human says so. */
export const ACTION_EMPHASIS_FLAG = 'action-emphasis'

/** The three in-hand actions. `call` is the check-or-call slot: one control, two names. */
export type ActionKind = 'fold' | 'call' | 'raise'

/**
 * Which design system Button variant each action wears.
 *
 * None of them is `act`. `act` is the accented variant and it is painted in `--ns-signal`, which
 * in this system means "the clock is waiting on you" and nothing else — on this bar that is true
 * of all three buttons at once, so spending the signal on one of them would say something false.
 * The emphasis is carried by `data-action` instead, in the app's own green.
 */
export const ACTION_VARIANT: Record<ActionKind, 'quiet' | 'fold'> = {
  fold: 'fold',
  call: 'quiet',
  raise: 'quiet',
}

/** Left to right on the bar: quietest first, the commitment last. */
export const ACTION_ORDER: readonly ActionKind[] = ['fold', 'call', 'raise']
