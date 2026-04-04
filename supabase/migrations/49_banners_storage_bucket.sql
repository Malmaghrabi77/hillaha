-- Migration 49: Create banners storage bucket with public access

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload banner images
DO $$ BEGIN
  CREATE POLICY banners_upload ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'banners'
      AND auth.uid() IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow public read access to banner images
DO $$ BEGIN
  CREATE POLICY banners_public_read ON storage.objects
    FOR SELECT
    USING (bucket_id = 'banners');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow admins to delete banner images
DO $$ BEGIN
  CREATE POLICY banners_admin_delete ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'banners'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
