'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  hasLiveMatches: boolean
  intervalMs?: number
}

// Refresca el server component padre cada N segundos cuando hay partidos en vivo,
// para que los MatchCards muestren el marcador y goles actualizados.
export function LiveRefresher({ hasLiveMatches, intervalMs = 20_000 }: Props) {
  const router = useRouter()
  useEffect(() => {
    if (!hasLiveMatches) return
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [hasLiveMatches, intervalMs, router])
  return null
}
