import { createClient } from '@/lib/supabase/server'
import { PLAYER_GROUPS, GROUP_TEAMS } from '@/lib/player-groups'
import { SorteoCard } from '@/components/SorteoCard'
import type { Theme } from '@/lib/themes'

interface Props {
  currentUserId: string
  theme: Theme
}

export async function SorteoRanking({ currentUserId }: Props) {
  const supabase = await createClient()

  const [oddsRes, profilesRes] = await Promise.all([
    supabase.from('team_odds').select('team_name, probability, updated_at'),
    (() => {
      const q = supabase.from('profiles').select('id, display_name, avatar_url')
      return process.env.NEXT_PUBLIC_APP_ENV === 'production' ? q.eq('is_test', false) : q
    })(),
  ])

  const oddsMap = new Map(
    (oddsRes.data ?? []).map(o => [o.team_name, Number(o.probability)])
  )
  const profileMap = new Map(
    (profilesRes.data ?? []).map(p => [p.id, p])
  )

  const noData = oddsMap.size === 0

  const scores = Object.entries(PLAYER_GROUPS).map(([uid, { groups, flagships }]) => {
    const teams = groups.flatMap(g =>
      (GROUP_TEAMS[g] ?? []).map(team => ({
        team,
        prob: oddsMap.get(team) ?? 0,
      }))
    )

    const totalProb = teams.reduce((sum, t) => sum + t.prob, 0)

    return {
      uid,
      profile: profileMap.get(uid),
      flagships,
      teams,
      totalProb,
      eliminated: !noData && totalProb === 0,
    }
  })

  scores.sort((a, b) => b.totalProb - a.totalProb)

  const updatedAt = oddsRes.data?.[0]?.updated_at
    ? new Date(oddsRes.data[0].updated_at).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  if (noData) {
    return (
      <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-muted)', fontSize: 14 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        Actualizando cuotas por primera vez…
        <br />
        <span style={{ fontSize: 12 }}>Vuelve en unos minutos</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {scores.map((row, i) => {
        const rank = i + 1
        return (
          <SorteoCard
            key={row.uid}
            rank={rank}
            isFirst={rank === 1}
            isLast={rank === scores.length && rank > 1}
            isMe={row.uid === currentUserId}
            displayName={row.profile?.display_name ?? 'Sin nombre'}
            avatarUrl={row.profile?.avatar_url ?? null}
            totalProb={row.totalProb}
            eliminated={row.eliminated}
            flagships={row.flagships}
            teams={row.teams}
          />
        )
      })}

      {updatedAt && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
          Cuotas: {updatedAt}
        </p>
      )}
    </div>
  )
}
