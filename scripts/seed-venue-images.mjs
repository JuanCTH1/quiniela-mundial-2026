// Genera imágenes satelitales de cada estadio desde ESRI World Imagery (sin key)
// y las sube al bucket público `venues` de Supabase Storage; guarda image_url.
//
// Uso:  node scripts/seed-venue-images.mjs
// Lee credenciales de .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── Cargar .env.local a mano (sin dependencias) ──
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// bbox alrededor del estadio (~600m) para encuadre tipo "vista aérea cercana"
const D = 0.0045
function esriUrl(lat, lng) {
  const bbox = `${lng - D},${lat - D},${lng + D},${lat + D}`
  return `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=640,320&format=jpg&f=image`
}

const { data: venues, error } = await supabase
  .from('venues')
  .select('id, name, latitude, longitude, image_url')
  .order('name')

if (error) { console.error('Error leyendo venues:', error.message); process.exit(1) }

let done = 0, skipped = 0, failed = 0
for (const v of venues) {
  if (v.image_url) { skipped++; continue }
  try {
    const res = await fetch(esriUrl(Number(v.latitude), Number(v.longitude)))
    if (!res.ok) throw new Error(`ESRI ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const path = `${v.id}.jpg`
    const up = await supabase.storage.from('venues').upload(path, buf, {
      contentType: 'image/jpeg', upsert: true,
    })
    if (up.error) throw up.error
    const { data: pub } = supabase.storage.from('venues').getPublicUrl(path)
    const { error: updErr } = await supabase.from('venues').update({ image_url: pub.publicUrl }).eq('id', v.id)
    if (updErr) throw updErr
    console.log(`✓ ${v.name}`)
    done++
  } catch (e) {
    console.error(`✗ ${v.name}: ${e.message}`)
    failed++
  }
}

console.log(`\nListo. Subidas: ${done} · Ya tenían: ${skipped} · Fallidas: ${failed}`)
