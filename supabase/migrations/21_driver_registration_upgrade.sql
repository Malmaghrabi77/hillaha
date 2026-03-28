-- Migration #21: Driver Registration Upgrade
-- Professional multi-step registration with document verification

-- ============================================================
-- 1. Create driver_applications table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal info
  full_name           text NOT NULL,
  phone               text NOT NULL,
  email               text NOT NULL,

  -- Vehicle info
  vehicle_type        text NOT NULL CHECK (vehicle_type IN ('car', 'scooter', 'bicycle')),
  vehicle_plate       text,

  -- Identity document
  identity_type       text NOT NULL CHECK (identity_type IN ('national_id', 'passport')),
  identity_number     text NOT NULL,
  identity_photo_url  text NOT NULL,

  -- Vehicle license (NULL for bicycle)
  license_number      text,
  license_expiry_date date,
  license_photo_url   text,

  -- Vehicle & selfie photos
  vehicle_photo_url   text,
  selfie_url          text NOT NULL,

  -- OCR result from license scan
  ocr_result          text,

  -- Application status
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'documents_expired')),
  reviewed_by         uuid REFERENCES auth.users(id),
  reviewed_at         timestamptz,
  rejection_reason    text,

  -- Metadata
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Add driver columns to profiles
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS driver_application_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_delivery_distance_km numeric(5,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- ============================================================
-- 3. Create driver-documents storage bucket (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. RLS Policies for driver_applications
-- ============================================================

-- Driver reads own application
CREATE POLICY "driver_reads_own_application"
  ON public.driver_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Driver creates own application
CREATE POLICY "driver_creates_own_application"
  ON public.driver_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Driver updates own pending application
CREATE POLICY "driver_updates_own_pending_application"
  ON public.driver_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admin reads all applications
CREATE POLICY "admin_reads_all_applications"
  ON public.driver_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admin updates any application
CREATE POLICY "admin_updates_applications"
  ON public.driver_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 5. Storage RLS for driver-documents bucket
-- ============================================================

-- Owner can read own documents
CREATE POLICY "driver_docs_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'driver-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can upload own documents
CREATE POLICY "driver_docs_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can read all documents
CREATE POLICY "driver_docs_admin_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'driver-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_driver_applications_status
  ON public.driver_applications(status);
CREATE INDEX IF NOT EXISTS idx_driver_applications_user
  ON public.driver_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_driver_approved
  ON public.profiles(role, is_approved) WHERE role = 'driver';
