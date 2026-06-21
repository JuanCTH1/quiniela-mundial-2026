'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function savePrediction(matchId: string, home: number, away: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('predictions')
    .upsert(
      { match_id: matchId, user_id: user.id, home_score: home, away_score: away },
      { onConflict: 'match_id,user_id' }
    )

  if (error) throw new Error(error.message)

  revalidatePath('/partidos')
  revalidatePath(`/partido/${matchId}`)
}

export async function updateProfile(displayName: string, timezone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, timezone })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/perfil')
}
