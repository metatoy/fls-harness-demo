// The design system, as components. Every value here traces to design-system/pack.json —
// when the pack changes, these change with it. Compose screens from these; do not hand-roll UI.
import React from 'react'

/**
 * @param {{variant?: 'default'|'primary'|'danger', children: React.ReactNode} & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({ variant = 'default', children, ...rest }) {
  return (
    <button className={`ds-btn ds-btn--${variant}`} {...rest}>
      {children}
    </button>
  )
}

/**
 * One piece of inline evidence.
 * @param {{tone?: 'default'|'ok'|'route'|'await'|'flag', children: React.ReactNode}} props
 */
export function Chip({ tone = 'default', children }) {
  return <span className={`ds-chip ds-chip--${tone}`}>{children}</span>
}

/** @param {{tone?: 'default'|'flagged', children: React.ReactNode}} props */
export function Card({ tone = 'default', children }) {
  return <article className={`ds-card ds-card--${tone}`}>{children}</article>
}

/**
 * The five-rung ratchet. Discrete and one-way — never render as a progress bar.
 * @param {{current: number, total?: number}} props
 */
export function TickRule({ current, total = 5 }) {
  return (
    <div className="ds-tickrule" role="img" aria-label={`step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const state = n === total ? 'gate' : n < current ? 'done' : n === current ? 'current' : 'todo'
        return <span key={n} className={`ds-tick ds-tick--${state}`} />
      })}
    </div>
  )
}

/** A labelled figure. Digits line up; the label says what the number means. */
export function Stat({ value, label }) {
  return (
    <div className="ds-stat">
      <div className="ds-stat__value">{value}</div>
      <div className="ds-stat__label">{label}</div>
    </div>
  )
}

/** @param {{children: React.ReactNode}} props */
export function Label({ children }) {
  return <div className="ds-label">{children}</div>
}
