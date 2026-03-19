-- Criar bucket para assets da plataforma
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- Política: Qualquer um pode visualizar assets
CREATE POLICY "Public read access for assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Política: Admin/Manager pode fazer upload de assets
CREATE POLICY "Admin can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets' AND
  public.is_admin_or_manager(auth.uid())
);

-- Política: Admin/Manager pode atualizar assets
CREATE POLICY "Admin can update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assets' AND
  public.is_admin_or_manager(auth.uid())
);

-- Política: Admin/Manager pode deletar assets
CREATE POLICY "Admin can delete assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets' AND
  public.is_admin_or_manager(auth.uid())
);