import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it } from 'vitest'

import App from './App.jsx'

const solve = async (user) => {
  for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Make a guess' }))
}

describe('the app', () => {
  it('opens on the puzzle screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Guess the word' })).toBeInTheDocument()
  })

  it('reaches the results screen after four guesses', async () => {
    const user = userEvent.setup()
    render(<App />)
    await solve(user)
    expect(screen.getByRole('heading', { name: 'Solved in 4 guesses' })).toBeInTheDocument()
    expect(screen.getByText('Win rate')).toBeInTheDocument()
  })

  it('goes back to the puzzle from results', async () => {
    const user = userEvent.setup()
    render(<App />)
    await solve(user)
    await user.click(screen.getByRole('button', { name: 'Play again tomorrow' }))
    expect(screen.getByRole('heading', { name: 'Guess the word' })).toBeInTheDocument()
  })
})
