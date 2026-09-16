'use client'

// The design system itself, not a copy of it — see the note in Reactions.tsx.
import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import { Button } from '../../../design-system/night-shift/components/core/Button.jsx'
import type { HandState } from '@/lib/poker/engine'
import { preActionKind, preActionToken } from '@/lib/preAction'
import { useGame } from '@/store/game'

const HERO = 'hero'
const WORD = { check: 'Check', fold: 'Fold' } as const

/** Full width, and a dashed edge while the decision is only armed rather than taken. */
const armStyle = { width: '100%', borderStyle: 'dashed' }
const armedStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--ns-s-2)',
}

/**
 * The pre-action strip: one control between the hero's hand and the action row, holding the
 * decision they had already made while somebody else is still thinking.
 *
 * The strip is permanent — it keeps its height whether or not there is anything in it — because a
 * control that appears and disappears above the action row would move the buttons under a thumb
 * that is already reaching for them.
 *
 * The word resolves when the player taps, never later: **Fold** if there is a bet to answer,
 * **Check** if there is not. It is the word on the chip because it is the action that will be
 * submitted, and if the situation changes underneath it the arm is dropped rather than
 * reinterpreted (lib/preAction).
 */
export function PreActionBar({ hand }: { hand: HandState }) {
  const armed = useGame((s) => s.preAction)
  const missed = useGame((s) => s.preActionMissed)
  const arm = useGame((s) => s.armPreAction)
  const handNo = useGame((s) => s.handIndex)

  const hero = hand.players.find((p) => p.id === HERO)
  const heroToAct = hand.players[hand.toActIndex]?.id === HERO
  // Arming is only meaningful while somebody else is on the clock and the hero still has a
  // decision coming: folded, all in, or already on the clock, there is nothing to arm.
  const canArm = hero?.status === 'active' && !heroToAct && hand.toActIndex >= 0
  const kind = preActionKind(hand, HERO)

  return (
    <div className="ns-preaction mb-2 flex min-h-[var(--ns-tap)] items-center">
      {missed ? (
        // Never a silent fold. The turn is the hero's, whole, and the bar says why it is.
        <p role="status" className="flex items-center gap-2 text-2xs text-muted-foreground">
          <Badge tone="warn">Pre-action didn&rsquo;t apply</Badge>
          <span>Your turn, with all of it left.</span>
        </p>
      ) : armed ? (
        <Button
          type="button"
          variant="quiet"
          style={armedStyle}
          aria-label={`Armed: ${WORD[armed.kind]}. Tap to disarm.`}
          onClick={() => arm(null)}
        >
          <span aria-hidden="true">Armed</span>
          {/* Neutral, not tone=turn: the signal colour means the clock is waiting on you, and
              while this chip is showing it is waiting on somebody else. */}
          <Badge>{WORD[armed.kind]}</Badge>
        </Button>
      ) : canArm ? (
        <Button
          type="button"
          // fold is the quietest control on the bar on purpose — a product that shouts fold is
          // steering the player — so arming one is quieter still.
          variant={kind === 'fold' ? 'fold' : 'quiet'}
          style={armStyle}
          onClick={() => arm({ kind, token: preActionToken(handNo, hand) })}
        >
          Pre-action: {WORD[kind]}
        </Button>
      ) : null}
    </div>
  )
}
