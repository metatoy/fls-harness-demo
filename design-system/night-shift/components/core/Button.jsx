import React from 'react'

/**
 * Button — the vocabulary of action.
 *
 * `act` is the accented one and there is at most ONE per screen: the thing the clock is waiting
 * on. Everything else is quiet. `fold` is deliberately the least loud control on a bar, because a
 * product that shouts "fold" is steering the player, and steering is what this brand refuses.
 *
 * The label always says what happens, including the amount. "Call 4,000" tells a player what it
 * costs before they commit; "OK" makes them find out afterwards.
 *
 * @param {{
 *   variant?: 'quiet'|'act'|'fold'|'danger',
 *   children: React.ReactNode,
 * } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({ variant = 'quiet', children, ...rest }) {
  return (
    <button className={`ns-btn ns-btn--${variant}`} {...rest}>
      {children}
      <style>{`
        .ns-btn {
          font: 500 14px var(--ns-ui);
          min-height: var(--ns-tap);
          padding: 0 18px;
          border-radius: var(--ns-r-sm);
          border: var(--ns-border) solid var(--ns-line);
          background: var(--ns-raised-2);
          color: var(--ns-text);
          cursor: pointer;
          transition: background var(--ns-m-state) var(--ns-m-ease),
                      transform var(--ns-m-state) var(--ns-m-ease);
        }
        .ns-btn:hover:not(:disabled) { background: #383433; }
        .ns-btn:active:not(:disabled) { transform: scale(.985); }
        .ns-btn:disabled { opacity: .45; cursor: not-allowed; }
        .ns-btn--act {
          background: var(--ns-signal);
          border-color: var(--ns-signal);
          color: var(--ns-signal-ink);
          font-weight: 600;
        }
        .ns-btn--act:hover:not(:disabled) { background: #4ADAF0; }
        .ns-btn--fold { background: transparent; color: var(--ns-text-2); }
        .ns-btn--fold:hover:not(:disabled) { background: var(--ns-raised); }
        .ns-btn--danger { background: transparent; border-color: #5A2325; color: var(--ns-lose); }
      `}</style>
    </button>
  )
}
