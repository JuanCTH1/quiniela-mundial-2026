'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'

type Rule = Tables<'reglas_puntuacion'>

interface Props {
  rule: Rule | null
  isAdmin: boolean
}

const RESULT_TYPES = [
  {
    key: 'pts_exacto',
    label: 'Exacto',
    desc: 'Adivinaste el resultado completo (ej: 2-1)',
    icon: '🎯',
  },
  {
    key: 'pts_diferencia',
    label: 'Diferencia',
    desc: 'Acertaste la diferencia pero no el marcador exacto (ej: predijiste 3-1, fue 2-0)',
    icon: '🎲',
  },
  {
    key: 'pts_tendencia',
    label: 'Tendencia',
    desc: 'Acertaste quién ganaba pero no la diferencia (ej: predijiste ganador, se cumplió)',
    icon: '📈',
  },
  {
    key: 'pts_fallo',
    label: 'Fallo',
    desc: 'No acertaste nada (predijiste un ganador y perdió, o empate y no fue)',
    icon: '❌',
  },
]

export function RulesDisplay({ rule, isAdmin }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState(
    rule ? {
      pts_exacto: rule.pts_exacto,
      pts_diferencia: rule.pts_diferencia,
      pts_tendencia: rule.pts_tendencia,
      pts_fallo: rule.pts_fallo,
    } : null
  )
  const [saving, setSaving] = useState(false)

  if (!rule) {
    return (
      <div className="glass-card" style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Reglas no configuradas
      </div>
    )
  }

  async function saveRules() {
    if (!editValues || !rule) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('reglas_puntuacion')
        .update({
          pts_exacto: editValues.pts_exacto,
          pts_diferencia: editValues.pts_diferencia,
          pts_tendencia: editValues.pts_tendencia,
          pts_fallo: editValues.pts_fallo,
          updated_at: new Date().toISOString(),
        })
        .eq('etapa', rule.etapa)

      if (error) throw error
      setIsEditing(false)
    } catch (err) {
      alert('Error al guardar: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tabla principal */}
      <div className="glass-card" style={{ padding: '16px 14px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}>
          {RESULT_TYPES.map(rt => (
            <div key={rt.key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{rt.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
                {rt.label}
              </div>
              {!isEditing ? (
                <div style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--mx-green)',
                  backgroundColor: 'rgba(0,104,71,0.1)',
                  padding: '8px',
                  borderRadius: 8,
                }}>
                  {rule[rt.key as keyof Rule]}
                </div>
              ) : (
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={editValues![rt.key as keyof typeof editValues] ?? 0}
                  onChange={e => setEditValues(v => v ? { ...v, [rt.key]: parseInt(e.target.value) || 0 } : null)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    fontSize: 20,
                    fontWeight: 700,
                    textAlign: 'center',
                    borderRadius: 6,
                    border: '1px solid rgba(0,104,71,0.3)',
                    background: 'rgba(0,104,71,0.1)',
                    color: 'var(--text-main)',
                  }}
                />
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                {rt.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Botones de admin */}
        {isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              border: 'none',
              background: 'rgba(0,104,71,0.2)',
              color: 'var(--mx-green)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Editar puntos (admin)
          </button>
        )}

        {/* Editor */}
        {isEditing && (
          <div style={{ marginTop: 16, display: 'flex', gap: 6, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={saveRules}
              disabled={saving}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 12,
                border: 'none',
                background: 'var(--mx-green)',
                color: '#fff',
                cursor: saving ? 'wait' : 'pointer',
                fontWeight: 600,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 12,
                border: 'none',
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Notas */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <p>
          <strong>Nota:</strong> Los mismos puntos aplican en todas las etapas del torneo (grupos, eliminatorias, final).
        </p>
      </div>
    </div>
  )
}
