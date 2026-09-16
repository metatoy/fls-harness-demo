import { ALL_VENUES, type Venue } from '@/config/venues'

/**
 * The next venue up, and how far short of it the Roll is.
 *
 * The arithmetic a player does at the bottom of every session — "what's the next room, and how
 * many of these do I have to win to sit in it?" — done once, in one place, from the same Roll the
 * screen is already showing. It is public information end to end: every buy-in is printed on its
 * own tile and the Roll is in the header, so this says nothing to a player that the tile next to
 * it did not. It is also entirely outside a hand, which is the side of the north star it sits on.
 *
 * Pure and unmemoised, so the figure cannot lag the Roll it sits under: the caller passes the Roll
 * it renders and gets the gap for exactly that Roll.
 */
export interface VenueGap {
  /** The cheapest candidate venue the Roll cannot cover yet. */
  venue: Venue
  /** Chips still needed to sit down there, whole chips, never rounded down. */
  shortfall: number
  /** The venue the shortfall is measured in buy-ins of. */
  anchor: Venue
  /** `shortfall / anchor.buyIn` to one decimal, or `null` when the anchor is free to enter. */
  buyIns: number | null
}

/**
 * The venues a player could enter today if the Roll were enough — the ladder, the side tables and
 * the Rail.
 *
 * Everything else in `ALL_VENUES` is gated on something other than chips and so can never be the
 * answer to "what can I buy into next": the challenge tables open only for the challenge the
 * player currently has standing (`lib/challenge`), the Kitchen Table opens only while the Roll
 * cannot reach the bottom rung, and the Daily is one deal a day. Naming a room a player cannot
 * walk into, however rich they get, would make the indicator a tease rather than a target.
 *
 * There is no region gate in this app today. If one arrives it belongs here, as another reason a
 * venue is not a candidate, and every caller inherits it.
 */
export function openVenues(): readonly Venue[] {
  return ALL_VENUES.filter((v) => !v.freeroll && !v.daily && !v.id.startsWith('challenge-'))
}

/**
 * The gap between `roll` and the next venue up, or `null` when the Roll covers every candidate —
 * at which point there is nothing to be short of and the strip does not appear at all.
 *
 * `current` is the venue in play, which is what the shortfall is expressed in buy-ins of. On the
 * picker there is none, so the anchor falls back to the dearest venue the Roll does cover (the
 * stake the player is playing at), and below the cheapest candidate to that candidate itself.
 * The anchor is always named on screen, so the multiple is never a number against an unstated
 * denominator.
 */
export function nextVenueGap(
  roll: number,
  current: Venue | null,
  candidates: readonly Venue[] = openVenues(),
): VenueGap | null {
  if (!Number.isFinite(roll) || roll < 0) return null
  // Ties go to display order: `candidates` is already in it and the sort below is stable.
  const affordable = candidates.filter((v) => v.buyIn <= roll)
  const above = [...candidates].filter((v) => v.buyIn > roll).sort((a, b) => a.buyIn - b.buyIn)
  const venue = above[0]
  if (!venue) return null

  const anchor =
    current ??
    affordable.reduce<Venue | null>(
      (best, v) => (!best || v.buyIn >= best.buyIn ? v : best),
      null,
    ) ??
    venue
  const shortfall = Math.ceil(venue.buyIn - roll)
  const buyIns = anchor.buyIn > 0 ? Math.round((shortfall / anchor.buyIn) * 10) / 10 : null
  return { venue, shortfall, anchor, buyIns }
}
