import React from 'react'

import { Button } from '../core/Button.jsx'

/**
 * ActionBar — what the clock is waiting on.
 *
 * Exactly one accented button: the call or the check, whichever is live. Fold sits at the quiet
 * end. Every amount is written into its label, so a player never commits chips to find out the
 * price afterwards.
 *
 * Unavailable actions are dimmed rather than removed, because a bar whose buttons move between
 * hands makes a player misclick under a clock.
 *
 * @param {{
 *   toCall?: number,
 *   canCheck?: boolean,
 *   minRaise?: number,
 *   disabled?: boolean,
 *   onFold?: () => void,
 *   onCheckCall?: () => void,
 *   onRaise?: () => void,
 * }} props
 */
export function ActionBar({ toCall = 0, canCheck = false, minRaise = 0, disabled = false, onFold, onCheckCall, onRaise }) {
  const money = (n) => new Intl.NumberFormat('en-US').format(n)
  return (
    <div className="ns-actions">
      <Button variant="act" onClick={onCheckCall} disabled={disabled}>
        {canCheck ? 'Check' : `Call ${money(toCall)}`}
      </Button>
      <Button onClick={onRaise} disabled={disabled || !minRaise}>
        {minRaise ? `Raise to ${money(minRaise)}` : 'Raise'}
      </Button>
      <Button variant="fold" onClick={onFold} disabled={disabled}>Fold</Button>
      <style>{`
        .ns-actions {
          display: flex;
          gap: var(--ns-s-3);
          flex-wrap: wrap;
          align-items: center;
        }
      `}</style>
    </div>
  )
}
