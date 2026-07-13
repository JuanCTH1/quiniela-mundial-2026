# Crear usuario nuevo en producción

Los invite links de Supabase no funcionan para varios de nuestros jugadores porque sus clientes de correo (Outlook, Gmail con Enhanced Safe Browsing) pre-consumen el OTP de un solo uso antes de que el usuario lo abra.

**Solución establecida:** crear el usuario directo en SQL + compartir credenciales por WhatsApp.

---

## Paso a paso

### 1. Crear el usuario en Supabase SQL Editor

Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/wltltpzvscgpnfwvgfmt) → **SQL Editor** y ejecuta:

```sql
-- Paso 1A: crear usuario
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, aud, role
) VALUES (
  gen_random_uuid(),
  'correo@ejemplo.com',           -- ← cambia esto (todo minúsculas)
  crypt('Quiniela2026', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now(),
  'authenticated', 'authenticated'
)
RETURNING id, email;
```

Guarda el `id` que devuelve. Luego:

```sql
-- Paso 1B: crear identity (OBLIGATORIO — sin esto "credenciales incorrectas" siempre)
INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
VALUES (
  '<id del paso anterior>',
  '<id del paso anterior>',
  'email',
  '<id del paso anterior>',
  '{"sub":"<id>","email":"correo@ejemplo.com","email_verified":true,"phone_verified":false}',
  now(), now()
);
```

```sql
-- Paso 1C: limpiar tokens NULL (GoTrue explota si son NULL)
UPDATE auth.users
SET
  confirmation_token     = COALESCE(confirmation_token, ''),
  recovery_token         = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change           = COALESCE(email_change, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE id = '<id>';
```

El trigger `on_auth_user_created` crea el perfil automáticamente con `is_test = false`.

### 2. Verificar

```sql
SELECT id, display_name, is_test
FROM profiles
WHERE id = '<id del paso anterior>';
```

Debe aparecer con `is_test = false`. Si `display_name` quedó feo (ej. "Jesus.tunaal"), el usuario lo puede cambiar desde `/perfil`.

### 3. Compartir credenciales por WhatsApp

```
Hola! Te mando tus datos para entrar a la quiniela:

🔗 https://quiniela-production-bdd7.up.railway.app
📧 correo@ejemplo.com
🔑 Quiniela2026

Entra y cámbiate la contraseña desde Perfil (ícono arriba a la derecha).
```

---

## Si el usuario ya existe pero no puede entrar (link expirado)

Solo resetear la contraseña:

```sql
UPDATE auth.users
SET encrypted_password = crypt('Quiniela2026', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'correo@ejemplo.com'
RETURNING id, email, email_confirmed_at;
```

---

## Notas

- La contraseña `Quiniela2026` es temporal — el usuario la cambia en `/perfil` → sección "Cambiar contraseña".
- No usar el flujo de invite por correo hasta que Supabase agregue soporte para links de múltiple uso o PKCE que sobreviva scanners.
- Si el usuario aparece con `is_test = true` en la verificación, actualizar manualmente: `UPDATE profiles SET is_test = false WHERE id = '<id>';`
