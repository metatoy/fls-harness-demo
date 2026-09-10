import React from 'react'

import Home from './screens/Home.jsx'
import Results from './screens/Results.jsx'

/** Two screens, one piece of state. Deliberately small — this app exists to be modified. */
export default function App() {
  const [solvedIn, setSolvedIn] = React.useState(/** @type {number|null} */ (null))
  return solvedIn === null
    ? <Home onSolve={setSolvedIn} />
    : <Results guesses={solvedIn} onPlayAgain={() => setSolvedIn(null)} />
}
