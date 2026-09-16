/**
 * Recent Hands — the last twenty completed hands, so a hand you didn't think to save is still
 * findable. Pure and deterministic: the list is a value, the store just holds the latest one.
 *
 * Every entry carries the replay payload it was recorded with, which is what makes opening one a
 * private act. The player's own device already holds the hand; the row hands it back by hand id
 * and nothing is minted, copied or published. Sharing stays the separate, explicit button on the
 * hand dialog. Retention is the window by construction — a hand leaves the list and its payload at
 * the same moment, so a listed hand is never a broken route.
 *
 * Outside a live hand by definition (an entry exists only once the hand is over), so it sits on the
 * study side of the north star: it can tell you nothing your opponents could not also know.
 */

/** The window. A newer hand evicts the oldest. */
export const RECENT_HANDS_CAP = 20

export interface RecentHand {
  /** Stable per completed hand, so recording the same hand twice replaces rather than repeats. */
  id: string
  handNo: number
  /** Where it was played — venue name plus the blinds in force. */
  table: string
  smallBlind: number
  bigBlind: number
  /** Epoch ms at completion. The sort key. */
  completedAt: number
  /** The store's one-line summary ("Alex wins 1,240 with a flush"). */
  summary: string
  /** Did the hero take the pot? Said in words on the row as well as in colour. */
  won: boolean
  /** The replay payload (a handLink token), or null when the hand could not be encoded. */
  token: string | null
}

/** The id a completed hand gets. Deterministic, so the same hand recorded twice is one entry. */
export function handIdFor(handNo: number, completedAt: number): string {
  return `${completedAt.toString(36)}-${handNo}`
}

/**
 * The list after recording one hand: deduped by id, newest completion first, capped at the window.
 *
 * Ties are real — two hands can finish inside the same millisecond — so they fall back to the hand
 * number (later hand first) and then to what was recorded last, rather than to sort luck.
 */
export function addRecentHand(list: readonly RecentHand[], entry: RecentHand): RecentHand[] {
  const deduped = list.filter((h) => h.id !== entry.id)
  return [entry, ...deduped]
    .map((h, i) => ({ h, i }))
    .sort((a, b) => b.h.completedAt - a.h.completedAt || b.h.handNo - a.h.handNo || a.i - b.i)
    .map(({ h }) => h)
    .slice(0, RECENT_HANDS_CAP)
}

/**
 * Why this hand cannot be replayed, or null when it can. A row that says why it is closed is the
 * honest version of a row that opens a route with nothing behind it.
 */
export function unavailableReason(entry: RecentHand): string | null {
  return entry.token ? null : 'Replay wasn’t saved for this hand'
}

/** The route that replays one of your own hands: the shared-replay screen, addressed by hand id. */
export function replayHref(entry: RecentHand): string {
  return `/hand?h=${encodeURIComponent(entry.id)}`
}
