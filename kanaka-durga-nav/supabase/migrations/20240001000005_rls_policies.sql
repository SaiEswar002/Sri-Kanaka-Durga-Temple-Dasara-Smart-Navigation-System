-- Migration: Row Level Security policies
-- Description: RLS for all tables — pilgrims get read-only on public data,
-- admins get role-based write access via service_role JWT claims

-- Enable RLS on all tables
ALTER TABLE sectors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_sectors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE darshan_queues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_areas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_status        ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_closures        ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_points      ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_incidents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_status          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras               ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: check if the current user is an authenticated admin
-- with a specific permission or is SUPER_ADMIN
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin_with_permission(permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_permissions JSONB;
BEGIN
  -- Service role bypasses RLS entirely (Supabase internal)
  -- This function is for regular authenticated users claiming admin role

  SELECT r.permissions INTO v_role_permissions
  FROM admin_users au
  JOIN roles r ON r.id = au.role_id
  WHERE au.auth_user_id = auth.uid()
    AND au.is_active = TRUE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- SUPER_ADMIN has all permissions
  IF (v_role_permissions->>'all')::BOOLEAN = TRUE THEN
    RETURN TRUE;
  END IF;

  -- Check specific permission
  IF (v_role_permissions->>permission_key)::BOOLEAN = TRUE THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION is_any_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid() AND is_active = TRUE
  );
END;
$$;

-- ============================================================
-- PUBLIC READ POLICIES (pilgrim-facing, no auth required)
-- ============================================================

-- sectors: public read for active sectors
CREATE POLICY "sectors_public_read" ON sectors
  FOR SELECT USING (status != 'CLOSED');

-- sub_sectors: public read
CREATE POLICY "sub_sectors_public_read" ON sub_sectors
  FOR SELECT USING (status != 'CLOSED');

-- location_categories: public read
CREATE POLICY "location_categories_public_read" ON location_categories
  FOR SELECT USING (TRUE);

-- locations: public read for active locations
CREATE POLICY "locations_public_read" ON locations
  FOR SELECT USING (status IN ('ACTIVE', 'TEMPORARY'));

-- darshan_queues: public read
CREATE POLICY "darshan_queues_public_read" ON darshan_queues
  FOR SELECT USING (TRUE);

-- parking_areas: public read
CREATE POLICY "parking_areas_public_read" ON parking_areas
  FOR SELECT USING (TRUE);

-- parking_status: public read
CREATE POLICY "parking_status_public_read" ON parking_status
  FOR SELECT USING (TRUE);

-- route_closures: public read for active closures
CREATE POLICY "route_closures_public_read" ON route_closures
  FOR SELECT USING (status IN ('SCHEDULED', 'ACTIVE'));

-- announcements: public read for active announcements
CREATE POLICY "announcements_public_read" ON announcements
  FOR SELECT USING (
    status = 'ACTIVE'
    AND starts_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- emergency_points: public read
CREATE POLICY "emergency_points_public_read" ON emergency_points
  FOR SELECT USING (status = 'ACTIVE');

-- crowd_status: public read
CREATE POLICY "crowd_status_public_read" ON crowd_status
  FOR SELECT USING (TRUE);

-- ============================================================
-- ADMIN READ POLICIES (any authenticated admin)
-- ============================================================

-- All tables — admins can read everything
CREATE POLICY "sectors_admin_read" ON sectors
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "sub_sectors_admin_read" ON sub_sectors
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "locations_admin_read" ON locations
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "darshan_queues_admin_read" ON darshan_queues
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "parking_areas_admin_read" ON parking_areas
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "parking_status_admin_read" ON parking_status
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "route_closures_admin_read" ON route_closures
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "announcements_admin_read" ON announcements
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "emergency_points_admin_read" ON emergency_points
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "emergency_incidents_admin_read" ON emergency_incidents
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "crowd_status_admin_read" ON crowd_status
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "cameras_admin_read" ON cameras
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "camera_events_admin_read" ON camera_events
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "roles_admin_read" ON roles
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "admin_users_admin_read" ON admin_users
  FOR SELECT TO authenticated USING (is_any_admin());

CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT TO authenticated USING (is_any_admin());

-- ============================================================
-- ADMIN WRITE POLICIES (permission-checked)
-- ============================================================

-- Locations CRUD — requires 'locations' or 'all' permission
CREATE POLICY "locations_admin_write" ON locations
  FOR ALL TO authenticated
  USING (is_admin_with_permission('locations'))
  WITH CHECK (is_admin_with_permission('locations'));

-- Sectors/sub_sectors — requires 'locations' or 'all'
CREATE POLICY "sectors_admin_write" ON sectors
  FOR ALL TO authenticated
  USING (is_admin_with_permission('locations'))
  WITH CHECK (is_admin_with_permission('locations'));

CREATE POLICY "sub_sectors_admin_write" ON sub_sectors
  FOR ALL TO authenticated
  USING (is_admin_with_permission('locations'))
  WITH CHECK (is_admin_with_permission('locations'));

-- Parking — requires 'parking' or 'all'
CREATE POLICY "parking_areas_admin_write" ON parking_areas
  FOR ALL TO authenticated
  USING (is_admin_with_permission('parking'))
  WITH CHECK (is_admin_with_permission('parking'));

CREATE POLICY "parking_status_admin_write" ON parking_status
  FOR ALL TO authenticated
  USING (is_admin_with_permission('parking'))
  WITH CHECK (is_admin_with_permission('parking'));

-- Queues — requires 'queues' or 'all'
CREATE POLICY "darshan_queues_admin_write" ON darshan_queues
  FOR ALL TO authenticated
  USING (is_admin_with_permission('queues'))
  WITH CHECK (is_admin_with_permission('queues'));

-- Crowd — requires 'crowd' or 'all'
CREATE POLICY "crowd_status_admin_write" ON crowd_status
  FOR ALL TO authenticated
  USING (is_admin_with_permission('crowd'))
  WITH CHECK (is_admin_with_permission('crowd'));

-- Closures — requires 'closures' or 'all'
CREATE POLICY "route_closures_admin_write" ON route_closures
  FOR ALL TO authenticated
  USING (is_admin_with_permission('closures'))
  WITH CHECK (is_admin_with_permission('closures'));

-- Announcements — requires 'announcements' or 'all'
CREATE POLICY "announcements_admin_write" ON announcements
  FOR ALL TO authenticated
  USING (is_admin_with_permission('announcements'))
  WITH CHECK (is_admin_with_permission('announcements'));

-- Emergency incidents — requires 'emergency' or 'all'
CREATE POLICY "emergency_incidents_admin_write" ON emergency_incidents
  FOR ALL TO authenticated
  USING (is_admin_with_permission('emergency'))
  WITH CHECK (is_admin_with_permission('emergency'));

-- Admin users — requires SUPER_ADMIN ('all' permission)
CREATE POLICY "admin_users_super_admin_write" ON admin_users
  FOR ALL TO authenticated
  USING (is_admin_with_permission('all'))
  WITH CHECK (is_admin_with_permission('all'));

-- Cameras — requires 'all' permission
CREATE POLICY "cameras_admin_write" ON cameras
  FOR ALL TO authenticated
  USING (is_admin_with_permission('all'))
  WITH CHECK (is_admin_with_permission('all'));
