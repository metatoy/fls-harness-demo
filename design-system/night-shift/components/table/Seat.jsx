import React from 'react'

import { Badge } from '../core/Badge.jsx'

/**
 * Seat — a player at the table.
 *
 * When the clock is on this seat it is the only lit thing on the table, and the state is carried
 * three ways at once: a ring, a glow, and the words "your turn". Colour alone would fail a player
 * with a colour vision difference, a dimmed screen, or a glance from across the room — and this is
 * the single most important state in the product.
 *
 * The stack is a tabular figure so it does not shift the row while it counts down.
 *
 * @param {{
 *   name: string,
 *   stack: number,
 *   onClock?: boolean,
 *   status?: string,
 *   statusTone?: 'neutral'|'win'|'lose'|'warn',
 *   isYou?: boolean,
 * }} props
 */
export function Seat({ name, stack, onClock = false, status, statusTone = 'neutral', isYou = false }) {
  const initials = isYou ? 'YOU' : name.slice(0, 2).toUpperCase()
  return (
    <div className={`ns-seat${onClock ? ' ns-seat--turn' : ''}`}>
      <div className="ns-seat__av" style={onClock ? { color: 'var(--ns-signal)' } : undefined} aria-hidden="true">{initials}</div>
      <div className="ns-seat__body">
        <div className="ns-seat__n">{name}</div>
        <div className="ns-seat__s">{new Intl.NumberFormat('en-US').format(stack)}</div>
      </div>
      {onClock ? <Badge tone="turn">Your turn</Badge> : status ? <Badge tone={statusTone}>{status}</Badge> : null}
      <style>{`
        .ns-seat {
          display: flex;
          gap: var(--ns-s-3);
          align-items: center;
          background: var(--ns-raised);
          border: var(--ns-border) solid var(--ns-line);
          border-radius: var(--ns-r-md);
          padding: 10px 14px;
          min-width: 224px;
          transition: border-color var(--ns-m-state) var(--ns-m-ease),
                      box-shadow var(--ns-m-state) var(--ns-m-ease);
        }
        .ns-seat--turn {
          border-color: var(--ns-signal-dim);
          box-shadow: 0 0 0 1px var(--ns-signal-dim), 0 0 24px var(--ns-signal-glow);
        }
        .ns-seat__av {
          width: 36px; height: 36px;
          border-radius: var(--ns-r-full);
          background: var(--ns-raised-2);
          display: grid; place-items: center;
          font: 600 13px var(--ns-ui);
          color: var(--ns-text-2);
          flex-shrink: 0;
        }
        .ns-seat__body { flex: 1; min-width: 0; }
        .ns-seat__n { font: 500 14px var(--ns-ui); }
        .ns-seat__s {
          font: var(--ns-t-figure);
          font-variant-numeric: tabular-nums;
          color: var(--ns-text-2);
        }
      `}</style>
    </div>
  )
}
