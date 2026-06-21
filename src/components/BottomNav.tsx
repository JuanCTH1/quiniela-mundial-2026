'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  isAdmin: boolean
}

const NAV = [
  { href: '/partidos', label: 'Partidos', icon: '⚽' },
  { href: '/ranking', label: 'Ranking', icon: '🏆' },
  { href: '/reglamento', label: 'Reglas', icon: '📋' },
  { href: '/perfil', label: 'Perfil', icon: '👤' },
]

export function BottomNav({ isAdmin }: Props) {
  const path = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(6,12,10,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
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
              color: active ? 'var(--mx-green)' : 'var(--text-muted)',
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
            color: path.startsWith('/admin') ? 'var(--mx-red)' : 'var(--text-muted)',
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
