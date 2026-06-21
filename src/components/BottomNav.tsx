'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getTheme, type Theme } from '@/lib/themes'

interface Props {
  isAdmin: boolean
  theme?: Theme
}

export function BottomNav({ isAdmin, theme = 'mexico' }: Props) {
  const path = usePathname()
  const t = getTheme(theme)

  const NAV = [
    { href: '/partidos', label: t.texts.matches, icon: '⚽' },
    { href: '/ranking', label: t.texts.ranking, icon: '🏆' },
    { href: '/reglamento', label: t.texts.rules, icon: '📋' },
    { href: '/perfil', label: t.texts.profile, icon: '👤' },
  ]

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid var(--nav-border)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0 max(10px, env(safe-area-inset-bottom))',
        zIndex: 50,
      }}
    >
      {NAV.map(({ href, label, icon }) => {
        const active = path.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color 0.2s',
              minWidth: 56,
            }}
          >
            <span style={{ fontSize: 22 }}>{icon}</span>
            {label}
          </Link>
        )
      })}
      {isAdmin && (
        <Link
          href="/admin"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            fontSize: 10,
            color: path.startsWith('/admin') ? 'var(--danger)' : 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'color 0.2s',
            minWidth: 56,
          }}
        >
          <span style={{ fontSize: 22 }}>🛡️</span>
          Admin
        </Link>
      )}
    </nav>
  )
}
