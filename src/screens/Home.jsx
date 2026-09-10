import React from 'react'

import { Button, Label, TickRule } from '../ds/index.jsx'

/**
 * The puzzle screen. Guessing is simulated: this app exists to be modified, not to be a game.
 * @param {{onSolve: (guesses: number) => void}} props
 */
export default function Home({ onSolve }) {
  const [guesses, setGuesses] = React.useState(0)
  const total = 5
  const guess = () => {
    const n = guesses + 1
    setGuesses(n)
    if (n >= 4) onSolve(n)
  }
  return (
    <main className="screen">
      <Label>Daily puzzle · Sep 10</Label>
      <h1 className="screen__title">Guess the word</h1>
      <p className="screen__lede">Five tries. The fourth is where most people land.</p>

      <div className="board" aria-label={`${guesses} of ${total} guesses used`}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`board__row${i < guesses ? ' board__row--used' : ''}`} />
        ))}
      </div>

      <TickRule current={Math.max(1, guesses)} total={total} />

      <div className="screen__actions">
        <Button variant="primary" onClick={guess} disabled={guesses >= total}>
          Make a guess
        </Button>
      </div>
    </main>
  )
}
