import React from 'react'

/**
 * Badge — a state, said in a word.
 *
 * Every badge carries text, never colour alone. `turn` is the only one allowed the signal colour;
 * win, lose and warn have their own semantic colours so the accent never shares duty.
 *
 * @param {{ tone?: 'neutral'|'turn'|'win'|'lose'|'warn', children: React.ReactNode }} props
 */
export function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`ns-badge ns-badge--${tone}`}>
      {children}
      <style>{`
        .ns-badge {
          display: inline-block;
          font: var(--ns-t-label);
          letter-spacing: var(--ns-track);
          text-transform: uppercase;
          padding: 4px 9px;
          border-radius: var(--ns-r-full);
          border: var(--ns-border) solid var(--ns-line);
          color: var(--ns-text-2);
          white-space: nowrap;
        }
        .ns-badge--turn { background: var(--ns-signal-glow); border-color: var(--ns-signal-dim); color: var(--ns-signal); }
        .ns-badge--win  { background: rgba(95,208,138,.14);  border-color: #2C5C41; color: var(--ns-win); }
        .ns-badge--lose { background: rgba(229,72,77,.14);   border-color: #5A2325; color: var(--ns-lose); }
        .ns-badge--warn { background: rgba(245,165,36,.14);  border-color: #5C441A; color: var(--ns-warn); }
      `}</style>
    </span>
  )
}
