'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RecentHandsPage } from '@/components/profile/RecentHandsPage'
import { isEnabled } from '@/lib/flags'
import { useHydrated } from '@/lib/useHydrated'

export default function Page() {
  const router = useRouter()
  const hydrated = useHydrated()
  const on = hydrated && isEnabled('recent-hands')

  // Flag off (or nothing to show yet) → the surface does not exist; back to the app.
  useEffect(() => {
    if (hydrated && !on) router.replace('/game')
  }, [hydrated, on, router])

  if (!on) return <div className="min-h-dvh" />
  return <RecentHandsPage />
}
