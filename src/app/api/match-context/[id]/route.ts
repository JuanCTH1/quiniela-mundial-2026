import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMatchContext } from '@/lib/match-context'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('home_team, away_team')
    .eq('id', id)
    .single()

  if (!match) return NextResponse.json(null)

  const context = await getMatchContext(id, match.home_team, match.away_team)
  return NextResponse.json(context)
}
