# Deploy online (Vercel + Supabase)

> Todo esto lo haces tú con tus credenciales — el repo ya está listo para ello.

## 1. Supabase (base de datos)

1. Entra a https://supabase.com → **New project** (el plan free sirve).
2. Cuando esté listo: **SQL Editor** → pega el contenido de [`supabase_migration.sql`](supabase_migration.sql) → **Run**.
3. **Project Settings → API**, copia:
   - `Project URL` → será `SUPABASE_URL`
   - `service_role` key (la secreta, no la anon) → será `SUPABASE_KEY`

## 2. Vercel (web + API)

1. Entra a https://vercel.com → **Add New → Project**.
2. **Import Git Repository** → elige `JuanCTH1/quiniela-mundial-2026`.
3. Framework preset: **Other** (el `vercel.json` ya configura el runtime Python).
4. En **Environment Variables** añade:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | tu Project URL |
   | `SUPABASE_KEY` | tu service_role key |
   | `ADMIN_TOKEN` | inventa una contraseña larga (para cargar resultados) |

5. **Deploy**. Te dará una URL tipo `https://quiniela-mundial-2026.vercel.app`.

## 3. Sembrar los partidos (una vez)

Con tu `ADMIN_TOKEN`, llama una sola vez:

```
POST https://TU-URL.vercel.app/admin/seed?token=TU_ADMIN_TOKEN
```

(desde el navegador no se puede hacer POST fácil; usa la consola o:)

```bash
curl -X POST "https://TU-URL.vercel.app/admin/seed?token=TU_ADMIN_TOKEN"
```

Verás `{"ok":true,"inserted":72}`. Listo: la quiniela está viva.

## 4. Cargar resultados reales (durante el Mundial)

```bash
curl -X POST "https://TU-URL.vercel.app/admin/result?token=TU_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"match_id": 1, "home_score": 2, "away_score": 1}'
```

La tabla de posiciones se recalcula sola.

---

### Alternativa sin Supabase (Railway)

Si prefieres SQLite con volumen persistente, despliega en Railway apuntando a
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, monta un volumen en la raíz
del repo y corre `python -m app.seed` una vez. Sin env de Supabase, la app usa
SQLite automáticamente.
