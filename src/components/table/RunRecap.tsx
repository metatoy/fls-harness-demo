'use client'

/**
 * The recap card on the end-of-tournament overlay. Presentation only: every
 * number and every sentence is built by `lib/recap` at the moment the run
 * ended, and this renders what it was given.
 *
 * Deliberately quiet. No "play again", nothing asking for tomorrow. The buttons
 * underneath already offer the only two things to do.
 *
 * The one exception, on Will's call (#97): the account offer, for a player who
 * has not made one. This is the moment the run they just finished is worth
 * keeping, so it is the moment the offer means something. It is a static line
 * at the foot of the card, not a step, and closing the overlay is the only
 * thing anyone has to do about it.
 */

import { useState } from 'react'
import { Button } from '../../../design-system/night-shift/components/core/Button.jsx'
import type { Recap } from '@/lib/recap'
import { AccountOffer } from '@/components/settings/AccountOffer'
import { ShareResultSheet } from './ShareResultSheet'
import { isEnabled } from '@/lib/flags'

/**
 * The share sheet hangs off this card because this card is the result: both
 * end-of-tournament overlays (knocked out, champion) render it, so one line
 * here covers both. It is behind `share-result` and invisible until a human
 * turns that flag on.
 */
const SHARE_FLAG = 'share-result'

export function RunRecap({ recap }: { recap: Recap }) {
  const [sharing, setSharing] = useState(false)
  return (
    <div className="mx-auto mt-6 w-full max-w-sm rounded-3xl bg-white/5 p-5">
      {/* The overlay is always dark, so this block is on white alphas rather
          than theme tokens, matching the buttons and copy around it. */}
      <div className="grid grid-cols-3 gap-2">
        {recap.stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xs uppercase tracking-wider text-white/40">{s.label}</div>
            <div className="mt-1 font-semibold text-white">{s.value}</div>
          </div>
        ))}
      </div>
      {recap.lines.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
          {recap.lines.map((line) => (
            <p key={line.id} className="text-left text-xs leading-relaxed text-white/70">
              {line.text}
            </p>
          ))}
        </div>
      )}
      {isEnabled(SHARE_FLAG) && (
        <div className="mt-4 flex justify-center border-white/10 border-t pt-4">
          <Button variant="quiet" onClick={() => setSharing(true)}>
            Share this result
          </Button>
        </div>
      )}
      <AccountOffer variant="overlay" />
      {isEnabled(SHARE_FLAG) && (
        <ShareResultSheet recap={recap} open={sharing} onOpenChange={setSharing} />
      )}
    </div>
  )
}
