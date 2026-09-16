'use client'

import type { CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
// The design system itself, not a copy of it (see table/Reactions.tsx): each .jsx source carries
// its own CSS, which is the only way to use Night Shift here without loading night-shift/styles.css.
import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import type { HandVerdict } from '@/lib/handResult'

/**
 * The --ns-* colours are the night palette at every hour, while the table follows the app's own
 * light and dark themes. So the Night Shift component is handed the app's colour tokens through
 * the properties it already reads: token to token, no literal colour, legible in both themes.
 */
const palette = {
  '--ns-text': 'var(--color-foreground)',
  '--ns-text-2': 'var(--color-muted-foreground)',
  '--ns-line': 'var(--color-border)',
} as CSSProperties

/**
 * The verdict on the hand just finished, in its own lane above the board.
 *
 * The lane is always in the layout and always the same height, empty between verdicts — a bar
 * that appears would shove the community cards down at the exact moment a player is reading
 * them, so the space is reserved rather than found. It sits above the board row at every width,
 * which is what keeps it clear of both the community cards and the hole cards.
 *
 * The verdict is a sentence, not a colour: `Badge` carries the words and only tints them, so the
 * outcome survives a monochrome screen, a colour-blind player and a screenshot. The signal colour
 * is never one of the tints — that one means the clock is waiting on you, and this hand is over.
 */
export function HandResultBanner({ verdict }: { verdict: HandVerdict | null }) {
  const reduced = useReducedMotion()
  return (
    <div
      // The lane, reserved. `min-h` rather than `h` so a wrapped verdict at 320px grows the lane
      // downward instead of spilling over the cards under it.
      className="flex min-h-16 w-full shrink-0 items-center justify-center px-3"
      style={palette}
    >
      <AnimatePresence mode="wait">
        {verdict && (
          <motion.p
            key={verdict.text}
            // One live region, announced once. The hand is over, so this interrupts nothing.
            role="status"
            aria-live="polite"
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="flex w-full items-center justify-center rounded-2xl border border-foreground/10 bg-foreground/[0.03] py-3 text-center"
          >
            <Badge tone={verdict.tone}>{verdict.text}</Badge>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
