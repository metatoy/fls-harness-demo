'use client'

import type { CSSProperties } from 'react'
// The design system itself, not a copy of it (see table/Reactions.tsx): each .jsx source carries
// its own CSS, which is the only way to use Night Shift here without loading night-shift/styles.css.
import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import { Button } from '../../../design-system/night-shift/components/core/Button.jsx'
import { PotDisplay } from '../../../design-system/night-shift/components/table/PotDisplay.jsx'
import { type Street, STREETS, potAt, streetAt, streetCursors } from '@/lib/replayStreets'
import type { HandRecord } from '@/store/game'

/**
 * The --ns-* colours are the night palette at every hour (tokens.app.css switches only on an
 * explicit data-theme, which this app does not set) while /hand follows the app's own light and
 * dark themes. So the Night Shift components are handed the app's colour tokens through the
 * properties they already read: token to token, no literal colour, legible in both themes.
 */
const palette = {
  '--ns-text': 'var(--color-foreground)',
  '--ns-text-2': 'var(--color-muted-foreground)',
  '--ns-muted': 'var(--color-muted-foreground)',
  '--ns-line': 'var(--color-border)',
  '--ns-raised': 'color-mix(in oklab, var(--color-foreground) 8%, transparent)',
  '--ns-raised-2': 'color-mix(in oklab, var(--color-foreground) 4%, transparent)',
} as CSSProperties

const LABELS: Record<Street, string> = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
}

/**
 * Jump straight to a street of a hand somebody shared with you.
 *
 * This is a cursor move, not a second reading of the hand: every target seeks into the same
 * ordered list of states that Back and Next step through, so stepping on from a jump continues
 * the replay exactly where the jump left it. A street whose cards never came out is shown
 * disabled rather than hidden — "there was no river" is information about the hand, and a target
 * that vanishes makes the bar a different shape on every link you open.
 *
 * On the right side of the north star: a shared hand is over. Nothing here is available inside a
 * live hand, and nothing here is knowledge the sharer did not already put in the link.
 */
export function StreetJump({
  record,
  step,
  onJump,
}: {
  record: HandRecord
  step: number
  onJump: (step: number) => void
}) {
  const cursors = streetCursors(record.events)
  const showing = streetAt(cursors, step)

  return (
    <section
      aria-labelledby="street-jump-heading"
      style={palette}
      className="ns-street-jump rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="street-jump-heading"
          className="text-2xs uppercase tracking-[0.2em] text-muted-foreground"
        >
          Jump to street
        </h2>
        {/* Neutral, and carrying the word: the signal colour belongs to the clock, and there is
            no clock on a hand that finished. */}
        <Badge>Showing {LABELS[showing]}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {STREETS.map((street) => {
          const cursor = cursors[street]
          const dealt = cursor !== null
          return (
            <Button
              key={street}
              type="button"
              disabled={!dealt}
              aria-current={street === showing ? 'true' : undefined}
              // Said in words, because the disabled look is a look. A screen reader hears why the
              // target is off, and so does anyone who reads the row below.
              aria-label={
                dealt
                  ? `Jump to ${LABELS[street]}`
                  : `${LABELS[street]} — not dealt in this hand, so there is nothing to jump to`
              }
              onClick={() => dealt && onJump(cursor)}
            >
              {LABELS[street]}
              {street === showing && <span className="sr-only"> (showing)</span>}
            </Button>
          )
        })}
      </div>

      {/* The board answers "what was out"; the pot answers "what was it worth". Rebuilt from the
          events (lib/replayStreets) because a shared hand carries no pot of its own. Chips, the
          way the design system's pot reads them — the money-display setting is the table's. */}
      <div className="mt-3">
        <PotDisplay amount={potAt(record, step)} showChips={false} />
      </div>
    </section>
  )
}
