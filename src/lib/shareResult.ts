/**
 * The text a player shares when a run ends.
 *
 * Pure and derived entirely from the `Recap` the results screen is already
 * showing, so what gets copied is what was on screen — no second reading of the
 * run, nothing the player did not see, and nothing new persisted.
 *
 * Deterministic on purpose: no clock, no random, no `location`. The origin is
 * passed in by the caller, which is what makes this testable and what keeps the
 * component free of anything but the click.
 *
 * The brand rules apply to the shared line as much as to the screen it came
 * from: chips, never a currency symbol, and no boast the numbers do not carry.
 */

import type { Recap } from './recap'

/** Names the game without selling it. */
export const SHARE_HEADLINE = 'Pip — play-money hold’em'

/** The word a badge says next to the preview, and the tone it wears. */
export interface ShareBadge {
  word: string
  tone: 'win' | 'neutral'
}

/**
 * The finish, said in a word. Colour never carries this alone: the word is the
 * label and the tone only agrees with it.
 */
export function shareBadge(recap: Recap): ShareBadge {
  const finish = recap.stats.find((s) => s.label === 'Finish')?.value ?? 'Played'
  return { word: finish, tone: finish === 'Won it' ? 'win' : 'neutral' }
}

/**
 * The whole share, as plain text: headline, the three headline stats, the
 * recap's own sentences, then where to play. One block, copied or handed to the
 * platform share sheet unchanged.
 */
export function buildShareText(recap: Recap, origin: string): string {
  const stats = recap.stats.map((s) => `${s.label} ${s.value}`).join(' · ')
  const lines = recap.lines.map((l) => l.text)
  return [SHARE_HEADLINE, stats, ...lines, shareUrl(origin)]
    .filter((line) => line.length > 0)
    .join('\n')
}

/** The origin as a bare link, with any trailing slash taken off. */
export function shareUrl(origin: string): string {
  return origin.replace(/\/+$/, '')
}
