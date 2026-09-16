'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NextVenueGap } from '@/components/NextVenueGap'
import { Splash } from '@/components/Splash'
import { sound } from '@/lib/sound'
import { useSpendableRoll } from '@/lib/useSpendableRoll'
import { useGame } from '@/store/game'
import type { Venue } from '@/config/venues'
import { SectionScreen } from './SectionScreen'
import { VenueInfoDialog } from './VenueInfoDialog'
import { VenueTile, type VenueVM } from './venueCard'
import { useRequireProfile } from './useRequireProfile'

/**
 * A full page of venues — the ladder (tiered) or the side tables. Desktop shows
 * a responsive grid, mobile a vertical list; tapping any card opens the info
 * dialog, which is where the buy-in is confirmed and play begins.
 */
export function VenueBrowser({
  title,
  subtitle,
  venues,
  tiered = false,
}: {
  title: string
  subtitle?: string
  venues: readonly Venue[]
  tiered?: boolean
}) {
  const ready = useRequireProfile()
  const router = useRouter()
  const spendable = useSpendableRoll()
  // Normally null here — the picker is reached from the menu — but a table left open behind this
  // page is still the venue in play, and it is the honest anchor for the buy-in multiple.
  const playing = useGame((s) => s.venue)
  const [infoVenue, setInfoVenue] = useState<Venue | null>(null)

  const models: VenueVM[] = useMemo(
    () =>
      venues.map((venue, index) => ({
        venue,
        index,
        tier: tiered ? index + 1 : undefined,
        playable: spendable >= venue.buyIn,
        onOpen: () => {
          sound.play('tap')
          setInfoVenue(venue)
        },
      })),
    [venues, tiered, spendable],
  )

  if (!ready) return <Splash />

  return (
    <SectionScreen title={title} subtitle={subtitle}>
      {/* Recomputed on every entry to the screen, because it is derived here and nothing caches
          it: the picker is remounted by the route and `spendable` is the Roll it renders from. */}
      <NextVenueGap roll={spendable} current={playing} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {models.map((m) => (
          <VenueTile key={m.venue.id} model={m} />
        ))}
      </div>

      <VenueInfoDialog
        venue={infoVenue}
        playable={infoVenue ? spendable >= infoVenue.buyIn : false}
        onOpenChange={(o) => !o && setInfoVenue(null)}
        onPlay={(venue) => {
          sound.play('call')
          router.push(`/play/${venue.id}`)
        }}
      />
    </SectionScreen>
  )
}
