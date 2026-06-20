import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Cliente con service_role — bypasea RLS. Solo para cron y Server Actions de admin.
// Nunca exponer al cliente ni pasar a componentes.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
