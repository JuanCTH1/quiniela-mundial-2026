import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/Avatar'
import { SorteoRanking } from '@/components/SorteoRanking'
import { RANK_TITLES } from '@/lib/utils'
import { getTheme, type Theme } from '@/lib/themes'

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const isSorteo = tab === 'sorteo'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profileRes = await supabase
    .from('profiles')
    .select('theme')
    .eq('id', user!.id)
    .single()

  const theme = (profileRes.data?.theme as Theme) ?? 'mexico'
  const t = getTheme(theme)

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
        {isSorteo ? 'Sorteo' : t.texts.rankingTitle}
      </h1>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>
        {isSorteo ? '% de que tu campeón esté en tus grupos' : t.texts.rankingSubtitle}
      </p>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { label: '🏆 Puntos',  href: '/ranking',          active: !isSorteo },
          { label: '🎯 Sorteo',  href: '/ranking?tab=sorteo', active: isSorteo  },
        ].map(({ label, href, active }) => (
          <Link
            key={href}
            href={href}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              textDecoration: 'none',
              background: active
                ? 'var(--theme-primary)'
                : 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
              color: active ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${active ? 'transparent' : 'var(--glass-border)'}`,
              transition: 'all 0.2s',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {isSorteo ? (
        <SorteoRanking currentUserId={user!.id} theme={theme} />
      ) : (
        <QuinielaRanking userId={user!.id} theme={theme} />
      )}
    </div>
  )
}

async function QuinielaRanking({ userId, theme }: { userId: string; theme: Theme }) {
  const supabase = await createClient()
  const t = getTheme(theme)

  const q = supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false })
    .order('exact_count', { ascending: false })
    .order('diff_count', { ascending: false })

  const { data: rows } = process.env.NEXT_PUBLIC_APP_ENV === 'production'
    ? await q.eq('is_test', false)
    : await q

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(rows ?? []).map((row, i) => {
        const rank = i + 1
        const title = RANK_TITLES[i]
        const isMe   = row.user_id === userId
        const isFirst = rank === 1
        const isLast  = rank === (rows?.length ?? 0) && rank > 1

        return (
          <div
            key={row.user_id}
            className={`glass-card ${isFirst ? 'rank-first' : isLast ? 'rank-last' : ''}`}
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: isMe
                ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'
                : undefined,
            }}
          >
            <div style={{
              fontSize: 14, fontWeight: 700, minWidth: 24,
              color: isFirst ? 'var(--gold)' : isLast ? 'var(--shame-red)' : 'var(--text-muted)',
            }}>
              {rank}
            </div>

            <Avatar
              name={row.display_name ?? '?'}
              avatarUrl={row.avatar_url}
              size={40}
              rank={rank}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isFirst && <span style={{ fontSize: 14 }}>👑</span>}
                <span style={{
                  fontSize: 15, fontWeight: isMe ? 700 : 500,
                  color: 'var(--text-main)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.display_name ?? 'Sin nombre'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: title?.color ?? 'var(--text-muted)', marginTop: 1 }}>
                {title?.title} · {row.exact_count ?? 0} exactos · {row.diff_count ?? 0} dif.
              </div>
            </div>

            <div style={{
              fontSize: 22, fontWeight: 800, minWidth: 48, textAlign: 'right',
              color: isFirst ? 'var(--gold)' : isLast ? 'var(--shame-red)' : 'var(--text-main)',
            }}>
              {row.total_points ?? 0}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>pts</span>
            </div>
          </div>
        )
      })}

      {(!rows || rows.length === 0) && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          {t.texts.noPoints}
        </p>
      )}
    </div>
  )
}
