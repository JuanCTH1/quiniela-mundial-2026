'use client'

export function NextMatchButton() {
  return (
    <button
      onClick={() => {
        const header = document.querySelector('[data-sticky-header]')
        const headerH = header ? header.getBoundingClientRect().height : 80
        const el = document.getElementById('next-match')
        if (!el) return
        const y = el.getBoundingClientRect().top + window.scrollY - headerH - 8
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
      }}
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
