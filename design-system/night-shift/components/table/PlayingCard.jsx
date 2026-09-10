import React from 'react'

const SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' }
const NAMES = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }

/**
 * PlayingCard — the one bright surface in the room.
 *
 * A clean face, not a rendering of a card: rank top-left, suit bottom-right, nothing else. No
 * flourish, no border art, no flip skeuomorphism. The rank has to be readable at the full 62px and
 * at half that, because a phone shows six of these at once.
 *
 * The four-colour deck is a setting, not a default — it helps some players and confuses others.
 * A face-down card carries no rank at all, so the DOM cannot leak what the player cannot see.
 *
 * @param {{
 *   rank?: string,
 *   suit?: 's'|'h'|'d'|'c',
 *   faceDown?: boolean,
 *   fourColour?: boolean,
 * }} props
 */
export function PlayingCard({ rank, suit = 's', faceDown = false, fourColour = false }) {
  if (faceDown) return (
    <div className="ns-card ns-card--back" role="img" aria-label="face-down card">
      <style>{CARD_CSS}</style>
    </div>
  )
  const colour = fourColour
    ? { s: 'var(--ns-suit-black)', h: 'var(--ns-suit-red)', d: 'var(--ns-suit-blue)', c: 'var(--ns-suit-green)' }[suit]
    : (suit === 'h' || suit === 'd' ? 'var(--ns-suit-red)' : 'var(--ns-suit-black)')
  return (
    <div className="ns-card" style={{ color: colour }} role="img" aria-label={`${rank} of ${NAMES[suit]}`}>
      <div className="ns-card__r" aria-hidden="true">{rank}</div>
      <div className="ns-card__s" aria-hidden="true">{SUITS[suit]}</div>
      <style>{CARD_CSS}</style>
    </div>
  )
}

const CARD_CSS = `
  .ns-card {
    width: var(--ns-card-w);
    height: var(--ns-card-h);
    border-radius: var(--ns-r-sm);
    background: var(--ns-cardface);
    box-shadow: var(--ns-lift-card);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 7px 8px;
    box-sizing: border-box;
    flex-shrink: 0;
  }
  .ns-card__r { font: 600 19px/1 var(--ns-ui); }
  .ns-card__s { font: 16px/1 var(--ns-ui); text-align: right; }
  .ns-card--back {
    background: var(--ns-card-back);
    background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.045) 0 6px, transparent 6px 12px);
  }
`
