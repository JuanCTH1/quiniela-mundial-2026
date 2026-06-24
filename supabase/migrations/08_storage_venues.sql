-- Bucket PÚBLICO para imágenes satelitales de estadios.
-- Público (a diferencia de 'avatares'): son fotos de sedes, no hay nada que proteger,
-- y así el <img> carga directo sin firmar URLs. Escritura solo vía service_role.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venues',
  'venues',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública del bucket; el resto de operaciones requieren service_role (bypasa RLS).
CREATE POLICY venues_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'venues');
