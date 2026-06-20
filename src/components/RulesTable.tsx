'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

type Rule = Tables<'reglas_puntuacion'>

interface Props {
  rules: Rule[]
  isAdmin: boolean
  userId: string
}

const CORTE_OPTIONS = ['90', '120', 'PENALTIES']
const RESULT_TYPES = [
  { key: 'pts_exacto', label: 'Exacto', icon: '🎯' },
  { key: 'pts_diferencia', label: 'Diferencia', icon: '🎲' },
  { key: 'pts_tendencia', label: 'Tendencia', icon: '📈' },
  { key: 'pts_fallo', label: 'Fallo', icon: '❌' },
]

export function RulesTable({ rules, isAdmin, userId }: Props) {
  const [data, setData] = useState<Rule[]>(rules)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function saveRule(rule: Rule) {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('reglas_puntuacion')
        .update({
          corte: rule.corte,
          pts_exacto: rule.pts_exacto,
          pts_diferencia: rule.pts_diferencia,
          pts_tendencia: rule.pts_tendencia,
          pts_fallo: rule.pts_fallo,
          updated_at: new Date().toISOString(),
        })
        .eq('etapa', rule.etapa)

      if (error) throw error
      setEditing(null)
    } catch (err) {
      alert('Error al guardar: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map(rule => {
        const isEditing = editing === rule.etapa
        const stageName = STAGE_LABELS[rule.etapa as keyof typeof STAGE_LABELS] ?? rule.etapa

        return (
          <div
            key={rule.etapa}
            className="glass-card"
            style={{ padding: '12px 14px', cursor: isAdmin ? 'pointer' : 'default' }}
            onClick={() => isAdmin && !isEditing && setEditing(rule.etapa)}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: isEditing ? 12 : 0,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                {stageName}
              </span>
              {!isEditing && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Corte: {rule.corte}'
                </span>
              )}
            </div>

            {/* Grid de puntos */}
            {!isEditing && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8,
              }}>
                {RESULT_TYPES.map(rt => (
                  <div key={rt.key} style={{
                    textAlign: 'center', padding: '6px 4px', borderRadius: 8,
                    background: 'rgba(0,104,71,0.08)', border: '1px solid rgba(0,104,71,0.15)',
                  }}>
                    <div style={{ fontSize: 18 }}>{rt.icon}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {rt.label}
                    </div>
                    <div style={{
                      fontSize: 16, fontWeight: 700, color: 'var(--mx-green)', marginTop: 3,
                    }}>
                      {rule[rt.key as keyof Rule]}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Editor inline */}
            {isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Corte */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Corte
                  </label>
                  <select
                    value={rule.corte}
                    onChange={e => setData(d => d.map(r => r.etapa === rule.etapa ? { ...r, corte: e.target.value } : r))}
                    style={{
                      width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 12,
                      background: 'rgba(0,104,71,0.1)', border: '1px solid rgba(0,104,71,0.3)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {CORTE_OPTIONS.map(c => (
                      <option key={c} value={c}>{c === '90' ? "90'" : c === '120' ? "120'" : 'Penales'}</option>
                    ))}
                  </select>
                </div>

                {/* Grid de inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {RESULT_TYPES.map(rt => (
                    <div key={rt.key}>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                        {rt.label}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="9"
                        value={rule[rt.key as keyof Rule] ?? 0}
                        onChange={e => setData(d => d.map(r => r.etapa === rule.etapa ? { ...r, [rt.key]: parseInt(e.target.value) || 0 } : r))}
                        style={{
                          width: '100%', padding: '4px 6px', borderRadius: 4, fontSize: 12,
                          background: 'rgba(0,104,71,0.1)', border: '1px solid rgba(0,104,71,0.3)',
                          color: 'var(--text-main)',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Botones */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    onClick={() => saveRule(data.find(r => r.etapa === rule.etapa)!)}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 12,
                      background: 'var(--mx-green)', color: '#fff', border: 'none', fontWeight: 600,
                      cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    style={{
                      flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 12,
                      background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {!isAdmin && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
          Solo administradores pueden editar reglas.
        </p>
      )}
    </div>
  )
}
