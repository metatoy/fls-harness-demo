import React from 'react'

/** Denominations, largest first. Colour is the fast read; the printed value is the true one. */
export const DENOMS = [
  { v: 1000, label: '1K', bg: 'var(--ns-chip-1k)',  ink: '#241703' },
  { v: 500,  label: '500', bg: 'var(--ns-chip-500)', ink: '#140F2E' },
  { v: 100,  label: '100', bg: 'var(--ns-chip-100)', ink: 'var(--ns-text)' },
  { v: 25,   label: '25',  bg: 'var(--ns-chip-25)',  ink: '#0C1F14' },
  { v: 5,    label: '5',   bg: 'var(--ns-chip-5)',   ink: '#FFFFFF' },
  { v: 1,    label: '1',   bg: 'var(--ns-chip-1)',   ink: '#15130F' },
]

/** Break an amount into discs, largest first, capped so a huge bet does not become a wall. */
export function toChips(amount, max = 6) {
  const out = []
  let left = Math.max(0, Math.floor(amount))
  for (const d of DENOMS) {
    while (left >= d.v && out.length < max) { out.push(d); left -= d.v }
  }
  return out
}

/**
 * ChipStack — a bet, as objects.
 *
 * Flat discs that overlap, never a bar chart and never a 3D render. The value is printed on every
 * disc as well as coloured, because colour alone is not a label and a player with a colour vision
 * difference still has to know what they are pushing in.
 *
 * The amount is the accessible name of the whole stack, so a screen reader gets "4,000 in chips"
 * rather than six unlabelled circles.
 *
 * @param {{ amount: number, max?: number }} props
 */
export function ChipStack({ amount, max = 6 }) {
  const chips = toChips(amount, max)
  const text = new Intl.NumberFormat('en-US').format(amount)
  return (
    <div className="ns-stack" role="img" aria-label={`${text} in chips`}>
      {chips.map((c, i) => (
        <span key={i} className="ns-chip" style={{ background: c.bg, color: c.ink, marginLeft: i ? 'var(--ns-chip-overlap)' : 0 }} aria-hidden="true">
          {c.label}
        </span>
      ))}
      <style>{`
        .ns-stack { display: inline-flex; align-items: center; }
        .ns-chip {
          width: var(--ns-chip);
          height: var(--ns-chip);
          border-radius: var(--ns-r-full);
          display: grid;
          place-items: center;
          font: 600 11px var(--ns-figure);
          box-shadow: 0 0 0 3px var(--ns-chip-edge) inset, 0 2px 6px rgba(0,0,0,.4);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
