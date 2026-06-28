'use client'

export function NextMatchButton() {
  return (
    <button
      onClick={() => document.getElementById('next-match')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 16,
        background: 'color-mix(in srgb, var(--theme-primary) 14%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)',
        color: 'var(--theme-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      ↓ Siguiente partido
    </button>
  )
}
