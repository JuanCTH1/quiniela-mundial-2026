'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ── Verificación de admin — doble capa: sesión + is_admin en DB ──────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Sin permisos de administrador')

  return { userId: user.id, adminClient: createAdminClient() }
}

// ── Modo Dios: actualizar resultado de un partido ────────────────────────────
// Alcance limitado explícitamente: solo home_score_quiniela/away_score_quiniela.
// Nunca toca predicciones.
export async function adminUpdateMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  notes?: string
) {
  const { userId, adminClient } = await requireAdmin()

  // Leer valores actuales para el audit log
  const { data: current } = await adminClient
    .from('matches')
    .select('home_score_quiniela, away_score_quiniela, result_source')
    .eq('id', matchId)
    .single()

  const { error } = await adminClient
    .from('matches')
    .update({
      home_score_quiniela: homeScore,
      away_score_quiniela: awayScore,
      result_source: 'MANUAL_OVERRIDE',
    })
    .eq('id', matchId)

  if (error) throw new Error(`Error actualizando resultado: ${error.message}`)

  await adminClient.from('audit_log').insert({
    actor_id: userId,
    action_type: 'MANUAL_RESULT_OVERRIDE',
    match_id: matchId,
    old_value: current ?? null,
    new_value: { home_score_quiniela: homeScore, away_score_quiniela: awayScore, result_source: 'MANUAL_OVERRIDE' },
    notes: notes ?? null,
  })

  revalidatePath('/')
}

// ── Liberación manual anticipada (6/6 de pronósticos enviados) ────────────────
export async function adminEarlyUnlock(matchId: string, notes?: string) {
  const { userId, adminClient } = await requireAdmin()

  // Validación server-side del conteo: si no hay 6/6, rechazar
  const { data: countResult } = await adminClient
    .rpc('prediction_count', { p_match_id: matchId })

  const count = countResult as number
  if (count < 6) {
    throw new Error(`Solo ${count}/6 pronósticos enviados. Se necesitan los 6 para liberar.`)
  }

  const { error } = await adminClient
    .from('matches')
    .update({ early_unlock_at: new Date().toISOString() })
    .eq('id', matchId)

  if (error) throw new Error(`Error liberando partido: ${error.message}`)

  await adminClient.from('audit_log').insert({
    actor_id: userId,
    action_type: 'EARLY_UNLOCK',
    match_id: matchId,
    new_value: { prediction_count: count },
    notes: notes ?? null,
  })

  revalidatePath('/')
}

// ── Actualizar equipo placeholder (cuando se confirman clasificados) ───────────
export async function adminUpdatePlaceholderTeam(
  matchId: string,
  field: 'home_team' | 'away_team',
  teamName: string
) {
  const { userId, adminClient } = await requireAdmin()

  const { data: current } = await adminClient
    .from('matches')
    .select('home_team, away_team, is_placeholder')
    .eq('id', matchId)
    .single()

  const updatePayload = field === 'home_team'
    ? { home_team: teamName, is_placeholder: false }
    : { away_team: teamName, is_placeholder: false }

  const { error } = await adminClient
    .from('matches')
    .update(updatePayload)
    .eq('id', matchId)

  if (error) throw new Error(`Error actualizando equipo: ${error.message}`)

  await adminClient.from('audit_log').insert({
    actor_id: userId,
    action_type: 'PLACEHOLDER_UPDATE',
    match_id: matchId,
    old_value: current ?? null,
    new_value: { [field]: teamName, is_placeholder: false },
  })

  revalidatePath('/')
}

// ── Activar modo real (acción unidireccional, requiere confirmación) ───────────
export async function adminActivateRealMode() {
  const { userId, adminClient } = await requireAdmin()

  // Verificar que aún está en test
  const { data: setting } = await adminClient
    .from('settings')
    .select('value')
    .eq('key', 'app_mode')
    .single()

  if (setting?.value === 'real') throw new Error('Ya está en modo real')

  const now = new Date().toISOString()

  await adminClient.from('settings').upsert([
    { key: 'app_mode', value: 'real', updated_by: userId },
    { key: 'mode_activated_at', value: now, updated_by: userId },
    { key: 'mode_activated_by', value: userId, updated_by: userId },
  ])

  await adminClient.from('audit_log').insert({
    actor_id: userId,
    action_type: 'MODE_CHANGE',
    new_value: { app_mode: 'real', activated_at: now },
  })

  revalidatePath('/')
}

// ── Revisión de facts ─────────────────────────────────────────────────────────
export async function adminApproveFact(factId: string) {
  const { adminClient } = await requireAdmin()
  const { error } = await adminClient
    .from('match_facts')
    .update({ reviewed: true })
    .eq('id', factId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function adminRejectFact(factId: string) {
  const { adminClient } = await requireAdmin()
  const { error } = await adminClient
    .from('match_facts')
    .delete()
    .eq('id', factId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function adminApproveAllFacts(matchId: string) {
  const { adminClient } = await requireAdmin()
  const { error } = await adminClient
    .from('match_facts')
    .update({ reviewed: true })
    .eq('match_id', matchId)
    .eq('reviewed', false)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

// ── Borrar pronósticos anteriores a un partido (limpieza de inicio) ───────────
export async function adminDeletePredictionsBefore(matchId: string) {
  const { userId, adminClient } = await requireAdmin()

  const { data: match } = await adminClient
    .from('matches')
    .select('scheduled_time, home_team, away_team')
    .eq('id', matchId)
    .single()

  if (!match) throw new Error('Partido no encontrado')

  const { data: toDelete } = await adminClient
    .from('matches')
    .select('id')
    .lt('scheduled_time', match.scheduled_time)

  const ids = (toDelete ?? []).map(m => m.id)
  if (!ids.length) throw new Error('No hay partidos anteriores a ese')

  await adminClient.from('predictions').delete().in('match_id', ids)

  await adminClient.from('audit_log').insert({
    actor_id: userId,
    action_type: 'DELETE_PREDICTIONS_BEFORE',
    match_id: matchId,
    notes: `Predicciones borradas para partidos anteriores a ${match.home_team} vs ${match.away_team}`,
  })

  revalidatePath('/')
  return { before: `${match.home_team} vs ${match.away_team}` }
}
