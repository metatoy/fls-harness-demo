'use client'

import { type ReactNode, useState } from 'react'
// The design system itself, not a copy of it (see table/Reactions.tsx): the .jsx source carries
// its own CSS, which is how Night Shift is used here without loading night-shift/styles.css.
import { Button } from '../../../design-system/night-shift/components/core/Button.jsx'
import { RunRecap } from '@/components/table/RunRecap'
import { isEnabled } from '@/lib/flags'
import { buildSittingRecap, clearSitting, loadSitting } from '@/lib/sitting'

/**
 * The recap owed to a player who stood up from a cash table, shown as its own screen the next time
 * they open the lobby — which is usually the moment they stand up, and is the *only* moment when
 * the sitting ended without them (the tab died, the seat timed out). One sitting, one screen, and
 * it replaces the lobby rather than floating over it: there is nothing behind it to tab into, so
 * it needs no focus trap, and the one control on it goes back to where they were headed anyway.
 *
 * The card inside is the tournament summary's (`RunRecap`), unchanged — the same three-figure
 * layout, given a sitting's three figures. Nothing here is aggregated across sittings.
 *
 * Renders its children (the lobby) when there is nothing owed, so the caller has one branch.
 */
export function SittingRecap({ children }: { children: ReactNode }) {
  // Read once, on mount: this only ever renders on the client (the page shows the splash until
  // the profile has hydrated), and re-reading on every render would fight the dismissal below.
  const [sitting, setSitting] = useState(loadSitting)

  if (!sitting || !isEnabled('session-recap')) return <>{children}</>

  const dismiss = () => {
    clearSitting()
    setSitting(null)
  }

  return (
    // The recap card is built for a dark ground, so the screen supplies one from the design
    // system's own room tokens rather than following the app's light/dark theme.
    <section
      aria-labelledby="sitting-recap-heading"
      className="ns-sitting-recap flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10"
      style={{ background: 'var(--ns-ground)' }}
    >
      <div className="w-full max-w-md text-center">
        <h1 id="sitting-recap-heading" className="text-4xl font-semibold tracking-tight text-white">
          You stood up
        </h1>
        <p className="mt-3 text-white/60">{sitting.venueName} — how that sitting went.</p>
        <RunRecap recap={buildSittingRecap(sitting)} />
      </div>
      {/* Quiet, never the signal: nothing here is waiting on a clock. The label says where the
          button goes, not "OK". */}
      <Button onClick={dismiss}>Back to the lobby</Button>
    </section>
  )
}
