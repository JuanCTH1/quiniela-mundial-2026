'use client'

import { getTheme, type Theme } from '@/lib/themes'

interface Props {
  theme: Theme
}

export function TestModeBanner({ theme }: Props) {
  const t = getTheme(theme)
  return (
    <div
      className="test-mode-banner"
      style={{
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--theme-secondary)',
        letterSpacing: '0.04em',
      }}
    >
      ⚗️ {t.texts.testMode}
    </div>
  )
}
