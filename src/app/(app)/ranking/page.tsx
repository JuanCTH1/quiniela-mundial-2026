import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/Avatar'
import { RANK_TITLES } from '@/lib/utils'

export default async function RankingPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false })
    .order('exact_count', { ascending: false })
    .order('diff_count', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
        El Ranking
      </h1>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
        Desempate: exactos → diferencias → sorteo
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(rows ?? []).map((row, i) => {
          const rank = i + 1
          const title = RANK_TITLES[i]
          const isMe = row.user_id === user?.id
          const isFirst = rank === 1
          const isLast = rank === (rows?.length ?? 0) && rank > 1

          return (
            <div
              key={row.user_id}
              className={`glass-card ${isFirst ? 'rank-first' : isLast ? 'rank-last' : ''}`}
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: isMe ? 'rgba(0,104,71,0.12)' : undefined,
              }}
            >
              {/* Rank number */}
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                minWidth: 24,
                color: isFirst ? 'var(--gold)' : isLast ? 'var(--shame-red)' : 'var(--text-muted)',
              }}>
                {rank}
              </div>

              {/* Avatar */}
              <Avatar
                name={row.display_name ?? '?'}
                avatarUrl={row.avatar_url}
                size={40}
                rank={rank}
              />

              {/* Name + title */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isFirst && <span style={{ fontSize: 14 }}>👑</span>}
                  <span style={{
                    fontSize: 15,
                    fontWeight: isMe ? 700 : 500,
                    color: 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {row.display_name ?? 'Sin nombre'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: title?.color ?? 'var(--text-muted)', marginTop: 1 }}>
                  {title?.title} · {row.exact_count ?? 0} exactos · {row.diff_count ?? 0} dif.
                </div>
              </div>

              {/* Points */}
              <div style={{
                fontSize: 22,
                fontWeight: 800,
                color: isFirst ? 'var(--gold)' : isLast ? 'var(--shame-red)' : 'var(--text-main)',
                minWidth: 48,
                textAlign: 'right',
              }}>
                {row.total_points ?? 0}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>pts</span>
              </div>
            </div>
          )
        })}
      </div>

      {(!rows || rows.length === 0) && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          Aún no hay puntos registrados
        </p>
      )}
    </div>
  )
}
