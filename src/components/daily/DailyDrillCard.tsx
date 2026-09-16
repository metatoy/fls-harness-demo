'use client'

import { type CSSProperties, useEffect, useState } from 'react'
// The design system itself, not a copy of it (see profile/WeakSpotCard.tsx). This card sits
// outside components/drills/ because that folder may not read the clock (tests/drills.test.ts).
import { Badge } from '../../../design-system/night-shift/components/core/Badge.jsx'
import { Button } from '../../../design-system/night-shift/components/core/Button.jsx'
import { PlayingCard } from '@/components/PlayingCard'
import type { DailyAttempt, DailyView } from '@/lib/dailyDrill'
import { dailyDrill, localDateKey, resolveDaily } from '@/lib/dailyDrill'
import { fetchDailyAttempts, submitDailyAttempt } from '@/lib/dailyDrillRecords'
import type { Drill } from '@/lib/drills/types'
import { cardName } from '@/lib/poker/cards'
import { useSync } from '@/store/sync'
import { cardKey } from '@/components/drills/parts'

const palette = {
  '--ns-text': 'var(--color-foreground)',
  '--ns-text-2': 'var(--color-muted-foreground)',
  '--ns-muted': 'var(--color-muted-foreground)',
  '--ns-line': 'var(--color-border)',
} as CSSProperties

const labelOf = (d: Drill, id: string): string => d.choices.find((c) => c.id === id)?.label ?? id
/** The IANA zone this browser is in; the server resolves the date from it. */
const tz = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const won = (a: DailyAttempt): boolean => a.answer === a.correct_answer

/**
 * The Daily Drill — one shared question a day, then nothing else asks for your attention. The card
 * mutates in place, rendered from the stored row and not from anything on this device: a reload, a
 * second tab and a new phone show the same card, and the database refuses the second answer.
 */
export function DailyDrillCard() {
  const signedIn = useSync((s) => s.status === 'signed-in')
  const [view, setView] = useState<DailyView | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!signedIn) return
    let live = true
    void fetchDailyAttempts(tz()).then((rows) => {
      if (live) setView(resolveDaily(localDateKey(new Date(), tz()), rows ?? []))
    })
    return () => {
      live = false
    }
  }, [signedIn])

  const attempt = view?.today.attempt ?? null
  const drill = view?.today.drill ?? null

  const submit = async () => {
    if (!view || !drill || !picked || busy) return
    setBusy(true)
    const stored = await submitDailyAttempt(tz(), picked, drill.answer)
    setBusy(false)
    if (stored) setView({ ...view, today: { ...view.today, attempt: stored } })
  }

  return (
    <section
      aria-labelledby="daily-drill-heading"
      className="mb-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5"
    >
      <div style={palette} className="flex items-baseline justify-between gap-4">
        <h2 id="daily-drill-heading" className="text-lg font-semibold tracking-tight">
          Daily drill
        </h2>
        {/* `turn` is the only tone allowed the signal, and it means exactly: unanswered. */}
        <Badge tone={attempt ? 'neutral' : 'turn'}>{attempt ? 'Answered' : 'Your turn'}</Badge>
      </div>

      {!drill ? (
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          {signedIn
            ? 'Fetching today’s spot…'
            : 'The daily drill needs an account: the answer is kept on the server, so it is there on a phone you have never opened it on.'}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Two hands, one board. Which one wins at showdown?
          </p>
          <span className="sr-only">{`Board: ${drill.board.map(cardName).join(', ')}.`}</span>
          <span className="mt-4 flex justify-center gap-1.5" aria-hidden>
            {drill.board.map((card) => (
              <PlayingCard key={cardKey(card)} card={card} size="md" />
            ))}
          </span>
          {/* Pickable until the date has a record. The ring never says it alone: the sentence
              below and each aria-label name the winning hand. */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            {drill.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                aria-pressed={choice.id === (attempt?.answer ?? picked)}
                disabled={attempt !== null}
                onClick={() => setPicked(choice.id)}
                aria-label={`${choice.label}: ${choice.cards.map(cardName).join(' and ')}${
                  choice.id === attempt?.correct_answer ? ', the winning hand' : ''
                }`}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl border p-3 text-left disabled:opacity-100 ${
                  [attempt?.answer, attempt?.correct_answer, picked].includes(choice.id)
                    ? 'border-foreground/40 bg-foreground/[0.06]'
                    : 'border-foreground/10'
                }`}
              >
                <span className="flex gap-1.5" aria-hidden>
                  {choice.cards.map((card) => (
                    <PlayingCard key={cardKey(card)} card={card} size="sm" />
                  ))}
                </span>
                <span className="text-sm font-medium" aria-hidden>
                  {choice.label}
                </span>
              </button>
            ))}
          </div>
          {attempt ? (
            <div style={palette} className="mt-4 border-t border-foreground/10 pt-4">
              <Badge tone={won(attempt) ? 'win' : 'lose'}>
                {won(attempt) ? 'Correct' : 'Not this one'}
              </Badge>
              <Said drill={drill} attempt={attempt} />
            </div>
          ) : (
            <div style={palette} className="mt-4">
              <Button variant="act" disabled={!picked || busy} onClick={submit}>
                {picked ? `Lock in ${labelOf(drill, picked)}` : 'Pick a hand'}
              </Button>
            </div>
          )}
        </>
      )}

      {view?.yesterday && <Yesterday attempt={view.yesterday} />}
    </section>
  )
}

function Said({ drill, attempt }: { drill: Drill; attempt: DailyAttempt }) {
  return (
    <p className="mt-3 text-sm leading-snug">
      You said {labelOf(drill, attempt.answer)}. {labelOf(drill, attempt.correct_answer)} wins it:{' '}
      {drill.explanation}
    </p>
  )
}

/** Yesterday, demoted to a line you can open. Nothing older is behind it: there is no archive. */
function Yesterday({ attempt }: { attempt: DailyAttempt }) {
  return (
    <details className="mt-5 border-t border-foreground/10 pt-4">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground">
        Yesterday — {won(attempt) ? 'you had it' : 'you missed it'}
      </summary>
      <Said drill={dailyDrill(attempt.local_date)} attempt={attempt} />
    </details>
  )
}
