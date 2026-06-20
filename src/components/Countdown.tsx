'use client'

import { useEffect, useState } from 'react'

interface Props {
  target: string
  label?: string
  className?: string
}

function diff(target: Date) {
  const ms = target.getTime() - Date.now()
  if (ms <= 0) return null
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function Countdown({ target, label = '', className = '' }: Props) {
  const date = new Date(target)
  const [text, setText] = useState(() => diff(date))

  useEffect(() => {
    const tick = () => setText(diff(date))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  if (!text) return null

  return (
    <span className={className} style={{ fontSize: '12px', color: 'var(--warning)' }}>
      {label && `${label} `}{text}
    </span>
  )
}
