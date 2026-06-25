import type { GoalEntry } from '@/lib/football-data'

interface Props {
  goals: GoalEntry[]
  side: 'home' | 'away'
  align?: 'left' | 'right'
}

export function GoalList({ goals, side, align = 'left' }: Props) {
  const sideGoals = goals.filter(g => g.side === side)
  if (sideGoals.length === 0) return null

  return (
    <div style={{
      fontSize: 9, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5,
      textAlign: align,
    }}>
      {sideGoals.map((g, i) => {
        const min = g.injuryTime ? `${g.minute}+${g.injuryTime}'` : `${g.minute}'`
        const suffix = g.type === 'OWN_GOAL' ? ' (og)' : g.type === 'PENALTY' ? ' (p)' : ''
        return (
          <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ⚽ {min} {g.scorer}{suffix}
          </div>
        )
      })}
    </div>
  )
}
