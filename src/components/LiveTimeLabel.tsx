'use client'

import { useEffect, useState } from 'react'
import { formatLivePeriod, approxLiveMinute } from '@/lib/utils'

interface Props {
  period: string | null
  minute: number | null
  actualStartTime?: string | null
  secondHalfStartTime?: string | null
  extraTimeStartTime?: string | null
  style?: React.CSSProperties
}

function computeLabel(
  period: string | null,
  minute: number | null,
  actualStartTime?: string | null,
  secondHalfStartTime?: string | null,
  extraTimeStartTime?: string | null,
): string | null {
  if (minute != null) return formatLivePeriod(period, minute)
  const fixed = formatLivePeriod(period, null)
  if (fixed === 'MT' || fixed === 'MTE' || fixed === 'PEN') return fixed
  const approx = approxLiveMinute(actualStartTime, period, secondHalfStartTime, extraTimeStartTime)
  if (approx != null) {
    const minuteStr = formatLivePeriod(period, approx) ?? `${approx}'`
    return `~${minuteStr} · ${period}`
  }
  return fixed
}

export function LiveTimeLabel({ period, minute, actualStartTime, secondHalfStartTime, extraTimeStartTime, style }: Props) {
  const [label, setLabel] = useState(() =>
    computeLabel(period, minute, actualStartTime, secondHalfStartTime, extraTimeStartTime)
  )

  const needsTick = minute == null && period !== 'MT' && period !== 'MTE' && period !== 'PEN' && !!actualStartTime

  useEffect(() => {
    setLabel(computeLabel(period, minute, actualStartTime, secondHalfStartTime, extraTimeStartTime))
    if (!needsTick) return
    const id = setInterval(() => {
      setLabel(computeLabel(period, minute, actualStartTime, secondHalfStartTime, extraTimeStartTime))
    }, 30_000)
    return () => clearInterval(id)
  }, [period, minute, actualStartTime, secondHalfStartTime, extraTimeStartTime, needsTick])

  if (!label) return null
  return <span style={style}>{label}</span>
}
