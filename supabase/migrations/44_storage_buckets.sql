-- ============================================================
-- Storage buckets for profile photos and partner logos
-- ============================================================

-- 1. Driver / Customer avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 2. Partner logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-logos',
  'partner-logos',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ── RLS for avatars ────────────────────────────────────────

-- Anyone can read public avatars
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder
CREATE POLICY "avatars_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/replace their own avatar
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── RLS for partner-logos ──────────────────────────────────

-- Anyone can read partner logos (they are public)
CREATE POLICY "partner_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-logos');

-- Authenticated partners can upload to their own folder
CREATE POLICY "partner_logos_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Partners can update/replace their own logo
CREATE POLICY "partner_logos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'partner-logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Add avatar_url to profiles if not exists ──────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- ── Add logo_url to partners table if not exists ──────────
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS logo_url text;
