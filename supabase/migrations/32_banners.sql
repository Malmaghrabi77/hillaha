-- Migration 32: Banner management with approval workflow
-- Allows Super Admin to manage banners directly,
-- Regional Manager submits change requests for approval.

-- ─── banners table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  sub         TEXT NOT NULL DEFAULT '',
  cta         TEXT NOT NULL DEFAULT 'اطلب الآن',
  bg          TEXT NOT NULL DEFAULT '#7C3AED',
  accent      TEXT NOT NULL DEFAULT '#6D28D9',
  image       TEXT,
  link_type   TEXT NOT NULL DEFAULT 'none' CHECK (link_type IN ('partner','url','none')),
  link_value  TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── banner_change_requests table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS banner_change_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id           UUID REFERENCES banners(id) ON DELETE CASCADE,
  change_type         TEXT NOT NULL DEFAULT 'create' CHECK (change_type IN ('create','update','delete')),
  proposed_title      TEXT,
  proposed_sub        TEXT,
  proposed_cta        TEXT,
  proposed_bg         TEXT,
  proposed_accent     TEXT,
  proposed_image      TEXT,
  proposed_link_type  TEXT,
  proposed_link_value TEXT,
  proposed_position   INTEGER,
  proposed_is_active  BOOLEAN,
  reason              TEXT,
  requested_by        UUID NOT NULL REFERENCES auth.users(id),
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  approval_status     TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by         UUID REFERENCES auth.users(id),
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  applied_at          TIMESTAMPTZ
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_change_requests ENABLE ROW LEVEL SECURITY;

-- banners: anyone can read (customer app needs this)
DROP POLICY IF EXISTS "banners_select" ON banners;
CREATE POLICY "banners_select" ON banners FOR SELECT USING (true);

-- banners: only super_admin can manage
DROP POLICY IF EXISTS "banners_manage" ON banners;
CREATE POLICY "banners_manage" ON banners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- banner_change_requests: admins can read
DROP POLICY IF EXISTS "bcr_select" ON banner_change_requests;
CREATE POLICY "bcr_select" ON banner_change_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','accountant'))
);

-- banner_change_requests: super_admin + admin can insert
DROP POLICY IF EXISTS "bcr_insert" ON banner_change_requests;
CREATE POLICY "bcr_insert" ON banner_change_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
);

-- banner_change_requests: only super_admin can update (approve/reject)
DROP POLICY IF EXISTS "bcr_update" ON banner_change_requests;
CREATE POLICY "bcr_update" ON banner_change_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ─── RPC: apply_banner_change ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_banner_change(
  p_request_id UUID,
  p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_banner RECORD;
  v_new_id UUID;
BEGIN
  -- Fetch the request
  SELECT * INTO v_req FROM banner_change_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_req.approval_status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not approved');
  END IF;

  IF v_req.applied_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already applied');
  END IF;

  -- Handle CREATE
  IF v_req.change_type = 'create' THEN
    INSERT INTO banners (title, sub, cta, bg, accent, image, link_type, link_value, position, is_active, created_by)
    VALUES (
      COALESCE(v_req.proposed_title, 'بانر جديد'),
      COALESCE(v_req.proposed_sub, ''),
      COALESCE(v_req.proposed_cta, 'اطلب الآن'),
      COALESCE(v_req.proposed_bg, '#7C3AED'),
      COALESCE(v_req.proposed_accent, '#6D28D9'),
      v_req.proposed_image,
      COALESCE(v_req.proposed_link_type, 'none'),
      v_req.proposed_link_value,
      COALESCE(v_req.proposed_position, 0),
      COALESCE(v_req.proposed_is_active, true),
      v_req.requested_by
    )
    RETURNING id INTO v_new_id;

    -- Update request with the new banner id
    UPDATE banner_change_requests SET banner_id = v_new_id WHERE id = p_request_id;

  -- Handle UPDATE
  ELSIF v_req.change_type = 'update' THEN
    SELECT * INTO v_banner FROM banners WHERE id = v_req.banner_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Banner not found');
    END IF;

    UPDATE banners SET
      title      = COALESCE(v_req.proposed_title, v_banner.title),
      sub        = COALESCE(v_req.proposed_sub, v_banner.sub),
      cta        = COALESCE(v_req.proposed_cta, v_banner.cta),
      bg         = COALESCE(v_req.proposed_bg, v_banner.bg),
      accent     = COALESCE(v_req.proposed_accent, v_banner.accent),
      image      = COALESCE(v_req.proposed_image, v_banner.image),
      link_type  = COALESCE(v_req.proposed_link_type, v_banner.link_type),
      link_value = COALESCE(v_req.proposed_link_value, v_banner.link_value),
      position   = COALESCE(v_req.proposed_position, v_banner.position),
      is_active  = COALESCE(v_req.proposed_is_active, v_banner.is_active),
      updated_at = now()
    WHERE id = v_req.banner_id;

  -- Handle DELETE (soft delete)
  ELSIF v_req.change_type = 'delete' THEN
    UPDATE banners SET is_active = false, updated_at = now() WHERE id = v_req.banner_id;
  END IF;

  -- Mark as applied
  UPDATE banner_change_requests SET applied_at = now() WHERE id = p_request_id;

  -- Log
  INSERT INTO price_change_logs (action, changed_by, details)
  VALUES (
    'banner_' || v_req.change_type,
    p_admin_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'banner_id', COALESCE(v_new_id, v_req.banner_id),
      'change_type', v_req.change_type
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_banners_active_position ON banners (position) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bcr_status ON banner_change_requests (approval_status);
