'use client'

import { useState } from 'react'
// The design system itself, not a copy of it. The .jsx sources under design-system/night-shift/
// each carry their own CSS, so importing one is the only way to use Night Shift here without
// loading night-shift/styles.css — which would repaint the whole app in the night palette.
// Restating their rules locally is the drift this repo's design-system/README.md warns about.
import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import { Button } from '../../../design-system/night-shift/components/core/Button.jsx'
import { REACTIONS, type Reaction } from '@/lib/reactions'

/** A reaction and the tap that produced it. The counter re-keys the pop so it replays. */
export interface Fired {
  reaction: Reaction
  seq: number
}

/**
 * The player's own reactions. State lives here rather than in the game store: a reaction is
 * ephemeral presentation, it changes nothing about the hand, and a refresh is allowed to lose it.
 *
 * No effect and no timer. Firing bumps a counter, which re-keys the pop, which remounts and
 * replays its CSS animation; the animation's own `forwards` is what makes it disappear. That is
 * the `set-state-in-effect` pattern in docs/development.md applied to something that expires.
 */
export function useHeroReaction(): { fired: Fired | null; fire: (r: Reaction) => void } {
  const [fired, setFired] = useState<Fired | null>(null)
  return {
    fired,
    fire: (reaction) => setFired((prev) => ({ reaction, seq: (prev?.seq ?? 0) + 1 })),
  }
}

/**
 * The reserved slot above a portrait. Always occupies its height, so a reaction arriving or
 * leaving never nudges the seat it belongs to — the same reason the bet chip has a fixed row.
 *
 * `aria-live="polite"` announces the word once; the glyph is decorative and hidden, because a
 * screen reader saying "grinning face with smiling eyes" is not what the seat said.
 */
export function ReactionSlot({ fired }: { fired: Fired | null }) {
  return (
    <span
      className="pointer-events-none flex h-7 w-full items-end justify-center"
      aria-live="polite"
    >
      {fired && (
        <span key={fired.seq} className="ns-reaction-pop">
          <Badge>
            <span aria-hidden="true">{fired.reaction.emoji}</span> {fired.reaction.word}
          </Badge>
        </span>
      )}
    </span>
  )
}

/**
 * The dock: one tap, one reaction, docked under the player's own seat so every reaction on the
 * table is attributed by position and nothing has to float free of a face.
 *
 * These are quiet buttons by design. The accented variant belongs to the thing the clock is
 * waiting on — which on this screen is a call or a raise on the action bar, never this.
 */
export function ReactionDock({ onFire }: { onFire: (r: Reaction) => void }) {
  return (
    <div
      className="ns-reaction-dock flex items-center justify-center gap-1.5"
      role="toolbar"
      aria-label="React"
    >
      {REACTIONS.map((r) => (
        <Button key={r.key} type="button" aria-label={`React: ${r.word}`} onClick={() => onFire(r)}>
          <span aria-hidden="true">{r.emoji}</span>
          <span className="sr-only">{r.word}</span>
        </Button>
      ))}
    </div>
  )
}
