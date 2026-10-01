-- Migration: Normal User Profiles & Security Hardening
-- Description:
--   1. Creates public.profiles table for normal users/pilgrims (Google & email auth)
--   2. RLS policies restricting profile reads/updates to own record
--   3. Auto-profile sync trigger on auth.users (Google OAuth & Email signups)
--   4. Hardens SECURITY DEFINER functions (is_any_admin, is_admin_with_permission, provision_super_admin_if_eligible)
--   5. Fixes mutable search_path warnings on triggers (update_updated_at_column, validate_location_sub_sector)
--   6. Hardens admin_users RLS and drops obsolete insecure RPCs
--   7. Zero plaintext or hardcoded credentials stored in migration

-- ============================================================
-- 1. NORMAL USERS: PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT UNIQUE,
  full_name           TEXT,
  avatar_url          TEXT,
  phone               TEXT,
  preferred_language  TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'te')),
  metadata            JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS) FOR PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anonymous users
REVOKE ALL ON public.profiles FROM anon;

-- Normal users can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Normal users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Normal users can insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admins can view user profiles
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_any_admin());

-- ============================================================
-- 3. AUTH TRIGGER: AUTO-CREATE PROFILE ON SIGNUP (GOOGLE / EMAIL)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    phone,
    preferred_language
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    'en'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. FUNCTION SEARCH_PATH & SECURITY DEFINER HARDENING
-- ============================================================

-- A. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- B. validate_location_sub_sector
CREATE OR REPLACE FUNCTION public.validate_location_sub_sector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.sector_id IS NOT NULL AND NEW.sub_sector_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM sub_sectors
      WHERE id = NEW.sub_sector_id
        AND sector_id = NEW.sector_id
    ) THEN
      RAISE EXCEPTION 'sub_sector_id % does not belong to sector_id %',
        NEW.sub_sector_id, NEW.sector_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- C. is_any_admin
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid() AND is_active = TRUE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_any_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_any_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_any_admin() TO authenticated, service_role;

-- D. is_admin_with_permission
CREATE OR REPLACE FUNCTION public.is_admin_with_permission(permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role_permissions JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT r.permissions INTO v_role_permissions
  FROM admin_users au
  JOIN roles r ON r.id = au.role_id
  WHERE au.auth_user_id = auth.uid()
    AND au.is_active = TRUE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- SUPER_ADMIN has wildcard permissions
  IF (v_role_permissions->>'all')::BOOLEAN = TRUE THEN
    RETURN TRUE;
  END IF;

  IF (v_role_permissions->>permission_key)::BOOLEAN = TRUE THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin_with_permission(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_with_permission(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_with_permission(TEXT) TO authenticated, service_role;

-- E. provision_super_admin_if_eligible (service_role only)
CREATE OR REPLACE FUNCTION public.provision_super_admin_if_eligible(
  p_auth_user_id UUID,
  p_email        TEXT,
  p_display_name TEXT,
  p_super_admin_emails TEXT[]
)
RETURNS TABLE(admin_id UUID, role_slug TEXT, was_provisioned BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_super_admin_role_id UUID;
  v_admin_user          admin_users%ROWTYPE;
  v_was_provisioned     BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_super_admin_role_id FROM roles WHERE slug = 'SUPER_ADMIN';

  SELECT * INTO v_admin_user FROM admin_users WHERE email = LOWER(p_email);

  IF NOT FOUND THEN
    IF LOWER(p_email) = ANY(p_super_admin_emails) THEN
      INSERT INTO admin_users (auth_user_id, email, display_name, role_id)
      VALUES (p_auth_user_id, LOWER(p_email), p_display_name, v_super_admin_role_id)
      RETURNING * INTO v_admin_user;
      v_was_provisioned := TRUE;
    ELSE
      RETURN;
    END IF;
  ELSE
    IF v_admin_user.auth_user_id IS NULL THEN
      UPDATE admin_users SET auth_user_id = p_auth_user_id, last_login_at = NOW()
      WHERE id = v_admin_user.id;
    ELSE
      UPDATE admin_users SET last_login_at = NOW() WHERE id = v_admin_user.id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    r.slug,
    v_was_provisioned
  FROM admin_users au
  JOIN roles r ON r.id = au.role_id
  WHERE au.email = LOWER(p_email);
END;
$$;

REVOKE ALL ON FUNCTION public.provision_super_admin_if_eligible(UUID, TEXT, TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_super_admin_if_eligible(UUID, TEXT, TEXT, TEXT[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_super_admin_if_eligible(UUID, TEXT, TEXT, TEXT[]) TO service_role;

-- ============================================================
-- 5. ADMIN_USERS RLS POLICIES & OBSOLETE RPC CLEANUP
-- ============================================================

-- Drop insecure client RPC if present
DROP FUNCTION IF EXISTS public.verify_or_link_admin_user(UUID, TEXT);

-- Allow authenticated users to inspect their own admin entry
DROP POLICY IF EXISTS "admin_users_self_read" ON public.admin_users;
CREATE POLICY "admin_users_self_read" ON public.admin_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR email = LOWER(auth.jwt() ->> 'email'));

-- Ensure admin_users modifications are strictly restricted to SUPER_ADMIN
DROP POLICY IF EXISTS "admin_users_super_admin_write" ON public.admin_users;
CREATE POLICY "admin_users_super_admin_write" ON public.admin_users
  FOR ALL TO authenticated
  USING (is_admin_with_permission('all'))
  WITH CHECK (is_admin_with_permission('all'));

-- ============================================================
-- 6. VERIFY DEFAULT ROLES EXIST
-- ============================================================
INSERT INTO public.roles (slug, name, description, permissions)
VALUES
  ('SUPER_ADMIN', 'Super Administrator', 'Full system access — manages all temple data and settings', '{"all": true}'::JSONB),
  ('OPERATIONS_ADMIN', 'Operations Administrator', 'Manages locations, parking, and sectors', '{"locations": true, "parking": true, "sectors": true}'::JSONB),
  ('FACILITY_MANAGER', 'Facility Manager', 'Manages temple facility locations and parking areas', '{"locations": true, "parking": true}'::JSONB),
  ('VIEW_ONLY', 'View Only', 'Read only view for temple administrative status', '{"read_only": true}'::JSONB)
ON CONFLICT (slug) DO NOTHING;
