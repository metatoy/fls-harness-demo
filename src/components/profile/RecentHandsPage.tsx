'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
// The design system itself, not a copy of it (see profile/WeakSpotCard.tsx): each .jsx source
// carries its own CSS, which is how Night Shift is used here without loading night-shift/styles.css.
import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import { PageShell } from '@/components/PageShell'
import { useProfile } from '@/store/profile'
import { RECENT_HANDS_CAP, type RecentHand, replayHref, unavailableReason } from '@/lib/recentHands'
import { sound } from '@/lib/sound'

/** The app's own colour tokens, handed to Night Shift through the properties it already reads. */
const palette = {
  '--ns-text': 'var(--color-foreground)',
  '--ns-text-2': 'var(--color-muted-foreground)',
  '--ns-muted': 'var(--color-muted-foreground)',
  '--ns-line': 'var(--color-border)',
} as CSSProperties

const when = (t: number): string =>
  new Date(t).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/**
 * Recent Hands — one flat list, newest first, where the whole row is the link. No step between
 * seeing a hand and watching it back, and no shelf to file it on first: the hands are here because
 * they finished, not because anyone remembered to save them.
 */
export function RecentHandsPage() {
  const hands = useProfile((s) => s.recentHands)
  return (
    <PageShell backLabel="Menu" title="Recent hands">
      <div style={palette} className="mx-auto w-full max-w-2xl">
        <p className="mb-4 text-sm text-muted-foreground">
          Your last {RECENT_HANDS_CAP} completed hands, newest first. Opening one replays it for you
          alone — sharing is still the link button on the hand itself.
        </p>
        {hands.length === 0 ? (
          <p className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 text-sm text-muted-foreground">
            Nothing here yet. Play a hand to the end and it lands on this list by itself.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {hands.map((hand) => (
              <li key={hand.id}>
                <HandRow hand={hand} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}

/** One hand: id, table and stakes, when it finished, how it went. The row is the tap target. */
function HandRow({ hand }: { hand: RecentHand }) {
  const reason = unavailableReason(hand)
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 text-sm font-medium">
          <span className="ns-figure tabular-nums">Hand #{hand.handNo}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{hand.table}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <time dateTime={new Date(hand.completedAt).toISOString()}>{when(hand.completedAt)}</time>
          {' · '}
          {hand.summary || 'No showdown'}
        </p>
        {reason && <p className="mt-1 text-xs text-muted-foreground">{reason}</p>}
      </div>
      {/* The word as well as the colour — the result never rests on the colour alone. */}
      <Badge tone={hand.won ? 'win' : 'lose'}>{hand.won ? 'Won' : 'Lost'}</Badge>
    </>
  )

  const shell =
    'flex min-h-11 w-full items-center gap-3 rounded-2xl border border-foreground/10 px-4 py-3 text-left'

  // No replay behind it, so no route to it: a row that says why beats a link that breaks.
  if (reason) {
    return (
      <div className={`${shell} bg-foreground/[0.01] opacity-70`} aria-disabled="true">
        {body}
      </div>
    )
  }

  return (
    <Link
      href={replayHref(hand)}
      onClick={() => sound.play('tap')}
      aria-label={`Replay hand ${hand.handNo}, ${hand.table}, ${when(hand.completedAt)}, ${
        hand.won ? 'won' : 'lost'
      }`}
      className={`${shell} bg-foreground/[0.02] transition-colors hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
    >
      {body}
    </Link>
  )
}
