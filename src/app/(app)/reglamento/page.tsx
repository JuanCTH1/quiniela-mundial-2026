import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile } from '@/lib/data'
import { redirect } from 'next/navigation'
import { RulesTable } from '@/components/RulesTable'

export default async function ReglamentoPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  const isAdmin = profile?.is_admin ?? false

  const supabase = await createClient()
  const { data: rules } = await supabase
    .from('reglas_puntuacion')
    .select('*')
    .order('etapa')

  return (
    <div style={{ paddingTop: 14, maxWidth: 720 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
        Reglamento de puntuación
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Puntos por cada tipo de acierto, según la etapa del torneo.
      </p>
      <RulesTable rules={rules ?? []} isAdmin={isAdmin} userId={user.id} />
    </div>
  )
}
