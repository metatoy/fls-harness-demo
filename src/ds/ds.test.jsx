import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { Button, Chip, Stat, TickRule } from './index.jsx'

describe('design system components', () => {
  it('a button carries its variant and stays a real button', () => {
    render(<Button variant="primary">Share result</Button>)
    const b = screen.getByRole('button', { name: 'Share result' })
    expect(b).toHaveClass('ds-btn', 'ds-btn--primary')
  })

  it('the tick rule announces the step for people who cannot see it', () => {
    render(<TickRule current={3} />)
    expect(screen.getByRole('img', { name: 'step 3 of 5' })).toBeInTheDocument()
  })

  it('the last tick is always the gate', () => {
    const { container } = render(<TickRule current={1} />)
    const ticks = container.querySelectorAll('.ds-tick')
    expect(ticks).toHaveLength(5)
    expect(ticks[4]).toHaveClass('ds-tick--gate')
  })

  it('a stat pairs its number with a label', () => {
    render(<Stat value="148" label="Played" />)
    expect(screen.getByText('148')).toBeInTheDocument()
    expect(screen.getByText('Played')).toBeInTheDocument()
  })

  it('a chip tone is a class, not a bare colour', () => {
    const { container } = render(<Chip tone="flag">gate</Chip>)
    expect(container.firstChild).toHaveClass('ds-chip--flag')
  })
})
