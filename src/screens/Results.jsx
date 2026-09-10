import React from 'react'

import { Button, Card, Label, Stat } from '../ds/index.jsx'

/**
 * The results screen. This is the surface the demo request targets, so keep it simple and
 * obvious: the outcome, the numbers behind it, and one way back.
 * @param {{guesses: number, onPlayAgain: () => void, children?: React.ReactNode}} props
 */
export default function Results({ guesses, onPlayAgain, children }) {
  return (
    <main className="screen">
      <Label>Daily puzzle · Sep 10</Label>
      <h1 className="screen__title">Solved in {guesses} guesses</h1>
      <p className="screen__lede">Faster than 76% of players today.</p>

      <Card>
        <div className="results__grid" aria-label="your result grid">
          {['⬛🟨⬛⬛⬛', '⬛🟩🟨⬛⬛', '🟩🟩⬛🟨⬛', '🟩🟩🟩🟩🟩'].slice(0, guesses).map((row, i) => (
            <div key={i} className="results__row">{row}</div>
          ))}
        </div>
      </Card>

      <div className="results__stats">
        <Stat value="148" label="Played" />
        <Stat value="92%" label="Win rate" />
        <Stat value="12" label="Streak" />
      </div>

      {children}

      <div className="screen__actions">
        <Button onClick={onPlayAgain}>Play again tomorrow</Button>
      </div>
    </main>
  )
}
