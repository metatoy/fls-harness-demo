import React from 'react'

/**
 * Figure — money as information.
 *
 * Always tabular, so a stack counting down never shifts the row it lives in. Grouped with commas,
 * because a player reads "128,400" faster than "128400" and misreads it less. `size="lg"` is for
 * the pot and the Roll, the two numbers a player looks for without being told where they are.
 *
 * There is no celebratory variant on purpose. A number that grows is information, not an event.
 *
 * @param {{ value: number, size?: 'md'|'lg', label?: string, tone?: 'default'|'win'|'lose' }} props
 */
export function Figure({ value, size = 'md', label, tone = 'default' }) {
  const text = new Intl.NumberFormat('en-US').format(value)
  return (
    <div className="ns-fig">
      {label ? <div className="ns-fig__label">{label}</div> : null}
      <div className={`ns-fig__v ns-fig__v--${size} ns-fig__v--${tone}`}>{text}</div>
      <style>{`
        .ns-fig__label {
          font: var(--ns-t-label);
          letter-spacing: var(--ns-track);
          text-transform: uppercase;
          color: var(--ns-muted);
        }
        .ns-fig__v {
          font: var(--ns-t-figure);
          font-variant-numeric: tabular-nums;
          color: var(--ns-text);
          margin-top: 4px;
        }
        .ns-fig__v--lg { font: var(--ns-t-figure-l); font-variant-numeric: tabular-nums; }
        .ns-fig__v--win  { color: var(--ns-win); }
        .ns-fig__v--lose { color: var(--ns-lose); }
      `}</style>
    </div>
  )
}
