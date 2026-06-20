import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile } from '@/lib/data'
import { redirect } from 'next/navigation'
import { RulesDisplay } from '@/components/RulesDisplay'

export default async function ReglamentoPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  const isAdmin = profile?.is_admin ?? false

  const supabase = await createClient()
  const { data: rule } = await supabase
    .from('reglas_puntuacion')
    .select('*')
    .eq('etapa', 'GROUP')
    .single()

  return (
    <div style={{ paddingTop: 14, maxWidth: 720 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
        Reglamento de la Quiniela
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
        Los puntos son iguales en todas las etapas. Cada pronóstico se califica según qué tan cerca llegaste al resultado real.
      </p>
      <RulesDisplay rule={rule} isAdmin={isAdmin} />
    </div>
  )
}
