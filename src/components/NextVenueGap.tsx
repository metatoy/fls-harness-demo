'use client'

import type { CSSProperties } from 'react'
// The design system itself, not a copy of it (see profile/WeakSpotCard.tsx): each .jsx source
// carries its own CSS, which is the only way to use Night Shift here without night-shift/styles.css.
import { Badge } from '../../design-system/night-shift/components/core/Badge.jsx'
import { Figure } from '../../design-system/night-shift/components/core/Figure.jsx'
import type { Venue } from '@/config/venues'
import { isEnabled } from '@/lib/flags'
import { nextVenueGap } from '@/lib/venueGap'

/**
 * The Night Shift components are handed the app's own colour tokens through the properties they
 * already read, so the strip is legible in both themes without a literal colour anywhere. Same
 * bridge, and the same reason, as WeakSpotCard.
 */
const palette = {
  '--ns-text': 'var(--color-foreground)',
  '--ns-text-2': 'var(--color-muted-foreground)',
  '--ns-muted': 'var(--color-muted-foreground)',
  '--ns-line': 'var(--color-border)',
} as CSSProperties

/**
 * One pinned strip: the next venue up, the chips short of it, and that shortfall in buy-ins of the
 * venue it is measured against — the same component verbatim above the venue list and on the
 * cash-out screen, because it is the same sentence in both places.
 *
 * It is a statement, not a control: there is nothing to unlock or buy here, and nothing that could
 * be mistaken for a nudge to keep playing. The badge is neutral — the signal colour belongs to the
 * clock waiting on you, never to a target.
 *
 * `roll` is whatever Roll the screen is showing (on cash-out, the Roll *after* the run), and the
 * gap is recomputed from it on every render, so the strip can never name a room the player has
 * already bought into.
 */
export function NextVenueGap({ roll, current }: { roll: number; current: Venue | null }) {
  if (!isEnabled('next-venue-gap')) return null
  const gap = nextVenueGap(roll, current)
  // Nothing left to be short of: the strip is absent rather than empty.
  if (!gap) return null

  return (
    <section
      aria-label="Next venue up"
      style={palette}
      className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"
    >
      <div>
        <Badge>Next venue up</Badge>
        <p className="mt-2 text-base font-semibold tracking-tight">{gap.venue.name}</p>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {gap.buyIns === null
            ? `Buy-in ${gap.venue.buyIn.toLocaleString('en-US')} chips.`
            : `About ${gap.buyIns.toFixed(1)} buy-ins at ${gap.anchor.name}.`}
        </p>
      </div>
      <Figure size="lg" label="Short by" value={gap.shortfall} />
    </section>
  )
}
