// Shareable spot links — the spot IS the link.
//
// Hole cards, board and opponent count packed into a URL fragment, so a player
// can hand someone the exact thing they are looking at. Nothing is written,
// nothing expires, nobody signs in: the same bet as handLink.ts, and a fragment
// rather than a query for the same reason — it never reaches a server log.
// 3 bits of card count, 3 bits of opponent count, 6 bits per card (0–51), then
// a checksum byte: seven bytes at most, ten base64url characters.
//
// Decoding is defensive: links arrive from the outside world and get truncated
// by every chat client that ever wrapped a line. A link that lost its tail must
// not decode to a *different* spot; it must refuse. That is the job of the
// length check and the checksum, and tests/spotLink.test.ts walks every prefix
// of a real link to prove it.

import { RANKS, SUITS, type Card } from '@/lib/poker/cards'
import { MAX_OPPONENTS } from '@/lib/poker/oddsQuote'

const SPOT_PATH = '/poker-odds-calculator'

/** The budget the format is designed to: token ≤ 20 chars, whole URL ≤ 100. */
export const MAX_TOKEN_CHARS = 20
export const MAX_URL_CHARS = 100

export interface Spot {
  /** Exactly two. */
  hole: readonly Card[]
  /** 0, 3, 4 or 5 — nothing, a flop, a turn or a river. */
  board: readonly Card[]
  opponents: number
}

const BOARD_SIZES = new Set([0, 3, 4, 5])
const cardIndex = (card: Card): number => RANKS.indexOf(card.rank) * 4 + SUITS.indexOf(card.suit)
const cardAt = (i: number): Card => ({ rank: RANKS[Math.floor(i / 4)], suit: SUITS[i % 4] })

function valid(spot: Spot): boolean {
  if (spot.hole.length !== 2 || !BOARD_SIZES.has(spot.board.length)) return false
  if (!Number.isInteger(spot.opponents)) return false
  if (spot.opponents < 1 || spot.opponents > MAX_OPPONENTS) return false
  const cards = [...spot.hole, ...spot.board]
  if (cards.some((c) => !RANKS.includes(c.rank) || !SUITS.includes(c.suit))) return false
  return new Set(cards.map(cardIndex)).size === cards.length
}

/** One byte over the payload. Not a hash: it only has to notice a link that
 *  lost its tail or bent a character, which it does 255 times in 256. */
function checksum(bytes: readonly number[]): number {
  let h = 0x5a
  for (const b of bytes) h = ((h ^ b) * 31 + 7) & 0xff
  return h
}

// Bytes an `n`-card payload occupies, before the checksum byte.
const bodyBytes = (n: number): number => Math.ceil((6 + 6 * n) / 8)

/** Encode a spot. Returns null rather than a link to something impossible. */
export function encodeSpot(spot: Spot): string | null {
  if (!valid(spot)) return null
  const cards = [...spot.hole, ...spot.board]
  const fields: [number, number][] = [
    [cards.length, 3],
    [spot.opponents - 1, 3],
    ...cards.map((c) => [cardIndex(c), 6] as [number, number]),
  ]

  const bytes: number[] = []
  let acc = 0
  let held = 0
  for (const [value, width] of fields) {
    acc = (acc << width) | value
    held += width
    while (held >= 8) {
      held -= 8
      bytes.push((acc >> held) & 0xff)
    }
  }
  if (held > 0) bytes.push((acc << (8 - held)) & 0xff)
  bytes.push(checksum(bytes))
  return toBase64Url(bytes)
}

/** Decode a token. Null on anything that is not exactly the spot encoded. */
export function decodeSpot(token: string): Spot | null {
  const bytes = fromBase64Url(token)
  if (!bytes || bytes.length < 2) return null

  let pos = 0
  const read = (width: number): number => {
    let value = 0
    for (let i = 0; i < width; i++, pos++) {
      value = (value << 1) | ((bytes[pos >> 3] >> (7 - (pos & 7))) & 1)
    }
    return value
  }

  // The field count is what makes truncation refuse rather than reinterpret: a
  // link that lost its tail is the wrong length for the count it claims.
  const count = read(3)
  if (count < 2 || count > 7 || bytes.length !== bodyBytes(count) + 1) return null
  if (checksum(bytes.slice(0, -1)) !== bytes[bytes.length - 1]) return null

  const opponents = read(3) + 1
  const cards = Array.from({ length: count }, () => cardAt(read(6)))
  const spot: Spot = { hole: cards.slice(0, 2), board: cards.slice(2), opponents }
  return valid(spot) ? spot : null
}

/** The spot a `#token` fragment carries, if it carries one. */
export function spotFromHash(hash: string): Spot | null {
  const token = hash.startsWith('#') ? hash.slice(1) : hash
  return token ? decodeSpot(token) : null
}

/** The whole link, for the clipboard. Null when the spot cannot be encoded. */
export function spotUrl(spot: Spot, origin: string): string | null {
  const token = encodeSpot(spot)
  return token === null ? null : `${origin}${SPOT_PATH}#${token}`
}

/** A seed from the spot itself, so a sampled answer is a function of the spot
 *  and nothing else: two people on the same link see the same number. */
export function spotSeed(spot: Spot): number {
  const token = encodeSpot(spot) ?? ''
  let h = 0x811c9dc5
  for (let i = 0; i < token.length; i++) h = Math.imul(h ^ token.charCodeAt(i), 0x01000193)
  return h >>> 0
}

const toBase64Url = (bytes: readonly number[]): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

function fromBase64Url(token: string): number[] | null {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null
  const padded = token.replace(/-/g, '+').replace(/_/g, '/')
  try {
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    return Array.from(binary, (ch) => ch.charCodeAt(0))
  } catch {
    return null
  }
}
