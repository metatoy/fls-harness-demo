/**
 * Street jump targets for the shared-hand replay.
 *
 * Someone opens a link to talk about the river and should not have to watch the pre-flop back
 * first. This turns a hand's event list into the handful of places worth jumping to — one per
 * street whose cards were actually dealt — expressed in the same step index the transport
 * already runs on, so jumping and stepping are the same motion.
 *
 * Read-only, public information: everything here is in the shared link already, visible to
 * anyone holding it. Nothing in this module runs while a hand is live, so it cannot give a
 * player an edge inside one — it is study after the fact, which is the point of the product.
 */

import type { HandEvent } from '@/store/game'

/** How many community cards are out once a street has been dealt. */
const STREETS = [
  { label: 'Flop', dealt: 3 },
  { label: 'Turn', dealt: 4 },
  { label: 'River', dealt: 5 },
] as const

export interface StreetMarker {
  label: (typeof STREETS)[number]['label']
  /**
   * The replay step to jump to: the number of events shown, chosen so the board event is the
   * last one applied. The cards are out, the money is as it stood entering the street, and the
   * street's first action is the next beat rather than an already-spent one.
   */
  step: number
  /** The pot entering the street, when the link carries it. Absent on older links. */
  pot?: number
}

/**
 * The streets this hand reached, in order.
 *
 * A street is reached when its cards were dealt — never when the hand merely could have got
 * there — so a hand that ended pre-flop yields nothing at all.
 *
 * An all-in run-out deals several streets as one beat, and this reports each of them pointing
 * at that single beat. There is no four-card state in such a hand: showing a turn chip that
 * lands on the finished board is truthful, while synthesising a state the hand never held would
 * put a board and a pot on screen that never stood together.
 */
export function streetMarkers(events: readonly HandEvent[]): StreetMarker[] {
  const markers: StreetMarker[] = []
  events.forEach((event, i) => {
    if (event.kind !== 'board') return
    for (const street of STREETS) {
      if (event.cards.length < street.dealt) continue
      if (markers.some((m) => m.label === street.label)) continue
      markers.push({
        label: street.label,
        step: i + 1,
        ...(typeof event.pot === 'number' ? { pot: event.pot } : {}),
      })
    }
  })
  return markers
}
