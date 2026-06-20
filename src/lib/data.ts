import { cache } from 'react'
import { createClient } from './supabase/server'

// React cache() deduplicates calls within a single render tree (layout + page share the same request).
// Any function here only hits the DB once per request, even if called from multiple Server Components.

export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, is_admin, timezone')
    .eq('id', userId)
    .single()
  return data
})

export const getSettings = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('key, value')
  return data ?? []
})

export const getBloqueoMinutos = cache(async () => {
  const settings = await getSettings()
  return parseInt(settings.find(s => s.key === 'bloqueo_minutos')?.value ?? '15')
})

export const getAppMode = cache(async () => {
  const settings = await getSettings()
  return settings.find(s => s.key === 'app_mode')?.value ?? 'test'
})
