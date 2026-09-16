'use client'

import type { CSSProperties, ReactNode } from 'react'
// The design system itself, not a copy of it (see profile/WeakSpotCard.tsx): each .jsx source
// carries its own CSS, which is the only way to use Night Shift here without night-shift/styles.css.
import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import { Figure } from '../../../design-system/night-shift/components/core/Figure.jsx'
import { PlayingCard } from '@/components/PlayingCard'
import { SECOND_SPOT, pct, requiredEquity, ruleOfTwo } from '@/config/potOdds'
import { cardFromString } from '@/lib/poker/cards'
import { isEnabled } from '@/lib/flags'
import { useHydrated } from '@/lib/useHydrated'

/**
 * The --ns-* colours are the night palette at every hour, while a guide page follows the app's own
 * light and dark themes. So the Night Shift components are handed the app's colour tokens through
 * the properties they already read: token to token, no literal colour, legible in both themes.
 */
const palette = {
  '--ns-text': 'var(--color-foreground)',
  '--ns-text-2': 'var(--color-muted-foreground)',
  '--ns-muted': 'var(--color-muted-foreground)',
  '--ns-line': 'var(--color-border)',
} as CSSProperties

/** An arithmetic line, in the figure face the product uses for every number. */
const figureFont = { font: 'var(--ns-t-figure)', color: 'var(--ns-text)' } as CSSProperties

const { pot, bet, hero, flop, outs, outsLabel } = SECOND_SPOT
/** The call is the bet. That equality is why the division below has three terms in it. */
const call = bet
const finalPot = pot + bet + call
const required = pct(requiredEquity(bet / pot))
const equity = ruleOfTwo(outs)

/**
 * The guide's second worked spot, and the first one's twin: pot, bet, pot odds, the equity you
 * need, what the hand is worth, the decision — the same six steps in the same words, at different
 * stakes, landing on a fold. One step per card, read straight down, so the two spots stack.
 *
 * Every figure is computed from SECOND_SPOT: the price through requiredEquity(), the hand through
 * the rule of 2 the outs section teaches. Both divisions are written out rather than asserted,
 * because a reader who cannot check the arithmetic has to take the fold on trust, and the whole
 * point of the page is that they do not have to.
 *
 * Nothing here is live-hand assistance: it is a fixed spot on a study page, the same numbers for
 * everyone, with no connection to any hand being played.
 */
export function SecondSpot() {
  // Flags are read at build time in a static export, so the gate is client-side: that is what lets
  // a reviewer switch the surface on with ?flags-pot-odds-second-spot=true on stage. useHydrated
  // keeps the server render and the first client render identical.
  const hydrated = useHydrated()
  if (!hydrated || !isEnabled('pot-odds-second-spot')) return null

  return (
    <section
      aria-labelledby="second-spot-heading"
      style={palette}
      className="mt-9 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 sm:p-6"
    >
      <h3 id="second-spot-heading" className="text-base font-semibold tracking-tight">
        The same six steps, the other way
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        A bigger pot, a bigger bet and a thinner draw. Nothing about the method changes.
      </p>

      <ol className="mt-5 space-y-3">
        <Step label="The pot">
          <Figure label="Before they bet" value={pot} />
        </Step>

        <Step label="The bet">
          <Figure label="They bet" value={bet} />
          <p className="mt-2 text-sm text-muted-foreground">
            A pot-sized bet, so calling costs you the same {bet} again.
          </p>
        </Step>

        <Step label="The pot odds">
          <p style={figureFont}>
            {pot} + {bet} + {call} = {finalPot}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            You are putting in {call} to win a pot that will hold {finalPot} once you have — the pot
            after your call, never the pot as it stands.
          </p>
        </Step>

        <Step label="The equity you need">
          <p style={figureFont}>
            {call} ÷ {finalPot} = {required}%
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Win it more often than {required}% of the time and the call makes money.
          </p>
        </Step>

        <Step label="What the hand is worth">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <Hand label="You have" codes={hero} />
            <Hand label="The flop" codes={flop} />
          </div>
          <p className="mt-3" style={figureFont}>
            {outs} × 2 = {equity}%
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Outs: {outsLabel}. Times two for the one card this bet buys you, because they get to bet
            again on the river.
          </p>
        </Step>

        <Step label="The decision">
          <Badge>Fold</Badge>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            {equity}% against a price of {required}%, so the call loses money by a distance. This is
            the same subtraction that sent the first spot the other way; only the numbers moved.
          </p>
        </Step>
      </ol>
    </section>
  )
}

/** One step, one card, full width. The label is the step's name in the list above. */
function Step({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="rounded-xl border border-foreground/10 p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <div className="mt-2.5">{children}</div>
    </li>
  )
}

function Hand({ label, codes }: { label: string; codes: readonly string[] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex gap-1.5">
        {codes.map((code) => (
          <PlayingCard key={code} card={cardFromString(code)} size="sm" />
        ))}
      </div>
    </div>
  )
}
