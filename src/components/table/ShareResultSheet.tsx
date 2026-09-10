'use client'

/**
 * The share sheet on the end-of-tournament results screen. One step: the exact
 * text that will be shared, the places it can go, and nothing to answer
 * afterwards. Closing it is the only way out and it costs nothing.
 *
 * Behind the `share-result` flag (`flags.json`), off in both environments until
 * a human turns it on. `RunRecap` is the only caller.
 *
 * Composed from Night Shift (`design-system/pack.json`): the buttons and the
 * badge are the system's own components, imported from the system rather than
 * restated here, so they cannot drift from it. Every value below is a
 * `var(--ns-*)`. The signal colour appears once, on `Copy result`, because the
 * copy is the one thing this sheet is waiting on — every other control is
 * quiet, and the platform's own share sheet is a destination, not the point.
 *
 * The finish is said in a word on the badge as well as in its tone, so nothing
 * here is carried by colour alone. Escape closes and focus is trapped: both
 * come from the app's Dialog, which is Base UI underneath.
 *
 * One gap, stated rather than papered over: focus here is the browser's own
 * ring, not Night Shift's signal outline. That outline lives in
 * `night-shift/styles.css`, and the app imports only the generated token layer
 * (`tokens.app.css`) — importing the system's whole stylesheet would restyle
 * every page, and restating the rule locally is the drift its README warns
 * about. Wiring that stylesheet in is its own change.
 */

import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import { Button } from '../../../design-system/night-shift/components/core/Button.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Recap } from '@/lib/recap'
import { buildShareText, shareBadge } from '@/lib/shareResult'
import { sound } from '@/lib/sound'
import { useCopied } from '@/lib/useCopied'
import { useHydrated } from '@/lib/useHydrated'

export function ShareResultSheet({
  recap,
  open,
  onOpenChange,
}: {
  recap: Recap
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [copied, copy] = useCopied()
  const hydrated = useHydrated()
  // Client-only, and read after mount so the server and the first paint agree.
  const canShare = hydrated && typeof navigator !== 'undefined' && 'share' in navigator
  const text = buildShareText(recap, hydrated ? location.origin : '')
  const badge = shareBadge(recap)

  const copyText = () => {
    sound.play('tap')
    void navigator.clipboard?.writeText(text).then(() => copy())
  }

  const shareToDevice = () => {
    sound.play('tap')
    // A share the player cancels is not an error, and there is nothing to say
    // about one: the sheet is still open behind it.
    void navigator.share?.({ text }).catch(() => {})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-auto bottom-0 max-h-[calc(100dvh-4rem)] translate-y-0 rounded-b-none bg-[var(--ns-ground)] text-[var(--ns-text)] ring-[var(--ns-line)] sm:max-w-md"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-[var(--ns-text)]">Share your result</DialogTitle>
          <DialogDescription className="text-[var(--ns-text-2)]">
            This is exactly what gets shared. Nothing else leaves the table.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <Badge tone={badge.tone}>{badge.word}</Badge>
          </div>
          <pre className="m-0 max-h-[40vh] min-h-0 overflow-y-auto rounded-[var(--ns-r-md)] border border-[var(--ns-line)] bg-[var(--ns-raised)] p-3 font-[family-name:var(--ns-figure)] text-[var(--ns-text-2)] text-xs whitespace-pre-wrap tabular-nums">
            {text}
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="act" onClick={copyText}>
              Copy result
            </Button>
            {canShare && (
              <Button variant="quiet" onClick={shareToDevice}>
                Share to your device
              </Button>
            )}
          </div>
          {/* The confirmation is a word, not a colour change, and it puts
              itself away (lib/useCopied). Announced rather than only seen. */}
          <p aria-live="polite" className="min-h-5 text-[var(--ns-muted)] text-xs">
            {copied ? 'Copied ✓' : ''}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
