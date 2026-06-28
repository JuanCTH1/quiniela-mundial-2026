'use client'

export function NextMatchButton() {
  return (
    <button
      onClick={() => document.getElementById('next-match')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', marginBottom: 12, borderRadius: 20,
        background: 'color-mix(in srgb, var(--theme-primary) 14%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)',
        color: 'var(--theme-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}
    >
      ↓ Siguiente partido
    </button>
  )
}
