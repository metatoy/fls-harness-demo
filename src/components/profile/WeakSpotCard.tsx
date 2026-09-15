'use client'

import type { CSSProperties } from 'react'
// The design system itself, not a copy of it (see table/Reactions.tsx): each .jsx source carries
// its own CSS, which is the only way to use Night Shift here without loading night-shift/styles.css.
import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import { Figure } from '../../../design-system/night-shift/components/core/Figure.jsx'
import type { SeatStats } from '@/lib/reads'
import { WINDOW, weakSpot } from '@/lib/weakSpot'

/**
 * The --ns-* colours are the night palette at every hour (tokens.app.css switches only on an
 * explicit data-theme, which this app does not set) while /stats follows the app's own light and
 * dark themes. So the Night Shift components are handed the app's colour tokens through the
 * properties they already read: token to token, no literal colour, legible in both themes.
 */
const palette = {
  '--ns-text': 'var(--color-foreground)',
  '--ns-text-2': 'var(--color-muted-foreground)',
  '--ns-muted': 'var(--color-muted-foreground)',
  '--ns-line': 'var(--color-border)',
} as CSSProperties

/**
 * One named weakness from the player's own recent sessions — the top card on the stats screen. One
 * metric, never a ranked list: a list of everything you are bad at is a mood, and the point is a
 * single thing to practise this week. The value is the player's own, the target is authored, and
 * the line underneath says what to do rather than how they did.
 */
export function WeakSpotCard({ sessions }: { sessions: SeatStats[] }) {
  const result = weakSpot(sessions)
  return (
    <section
      aria-labelledby="weak-spot-heading"
      style={palette}
      className="mb-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="weak-spot-heading"
          className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
        >
          Weak spot
        </h2>
        {/* The window it looked at. Neutral: the signal belongs to the clock, never to a stat. */}
        <Badge>Last {WINDOW} sessions</Badge>
      </div>
      {result.state === 'insufficient' && (
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          Not enough to go on yet — {result.sessions} of {result.needed} sessions. A weakness named
          off four runs is noise, and you would practise the wrong thing all week.
        </p>
      )}
      {result.state === 'clear' && (
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          Nothing is below its target across your last {result.window} sessions, so nothing is named
          here.
        </p>
      )}

      {result.state === 'named' && (
        <>
          <p className="mt-3 text-lg font-semibold tracking-tight">{result.metric.name}</p>
          <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-3">
            <Figure size="lg" label="You now" value={result.current} />
            <Figure label="Target" value={result.target} />
          </div>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            Percentages — the {result.metric.unit}.
          </p>
          <p className="mt-4 border-t border-foreground/10 pt-4 text-sm leading-snug">
            {result.action}
          </p>
        </>
      )}
    </section>
  )
}
