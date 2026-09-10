import React from 'react'

import { ChipStack } from './ChipStack.jsx'

/**
 * PotDisplay — the number everyone is playing for.
 *
 * It counts. It does not scale, bounce, flash or shower. A pot that performs is the product
 * celebrating at the player, and this brand does not do that: the figure going up is already the
 * good news.
 *
 * Counting is genuinely animated because the change is information, so it collapses to an instant
 * set under reduced motion rather than being decorative.
 *
 * @param {{ amount: number, showChips?: boolean }} props
 */
export function PotDisplay({ amount, showChips = true }) {
  const [shown, setShown] = React.useState(amount)
  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  React.useEffect(() => {
    if (reduce || shown === amount) { setShown(amount); return }
    const from = shown
    const start = performance.now()
    const dur = 320
    let raf = 0
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur)
      setShown(Math.round(from + (amount - from) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, reduce])

  return (
    <div className="ns-pot">
      <div className="ns-pot__label">Pot</div>
      <div className="ns-pot__v" aria-live="polite">{new Intl.NumberFormat('en-US').format(shown)}</div>
      {showChips ? <div className="ns-pot__chips"><ChipStack amount={amount} max={5} /></div> : null}
      <style>{`
        .ns-pot { text-align: center; }
        .ns-pot__label {
          font: var(--ns-t-label);
          letter-spacing: var(--ns-track);
          text-transform: uppercase;
          color: var(--ns-muted);
        }
        .ns-pot__v {
          font: var(--ns-t-figure-l);
          font-variant-numeric: tabular-nums;
          color: var(--ns-text);
          margin-top: 4px;
        }
        .ns-pot__chips { margin-top: var(--ns-s-2); }
      `}</style>
    </div>
  )
}
