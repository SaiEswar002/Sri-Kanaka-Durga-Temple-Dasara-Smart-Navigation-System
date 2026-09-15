-- Migration: Auth, RBAC, and Admin users
-- Description: Admin roles, users, audit logs, and super admin bootstrap

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',   -- permission map
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (slug, name, description, permissions) VALUES
  ('SUPER_ADMIN',       'Super Administrator',  'Full system access — can manage all admin users and roles',
    '{"all": true}'::JSONB),
  ('OPERATIONS_ADMIN',  'Operations Administrator', 'Can manage crowd, closures, emergency, and announcements',
    '{"crowd": true, "closures": true, "emergency": true, "announcements": true, "locations": true}'::JSONB),
  ('CROWD_MANAGER',     'Crowd Manager',        'Can view and update crowd status',
    '{"crowd": true}'::JSONB),
  ('FACILITY_MANAGER',  'Facility Manager',     'Can manage locations, parking, and queues',
    '{"locations": true, "parking": true, "queues": true}'::JSONB),
  ('VIEW_ONLY',         'View Only',            'Read-only access to admin dashboard',
    '{"read_only": true}'::JSONB);

-- ============================================================
-- ADMIN USERS
-- Description: Separate from pilgrim auth — managed independently
-- ============================================================
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id  UUID UNIQUE,                  -- Supabase auth.users id
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  role_id       UUID NOT NULL REFERENCES roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  provisioned_by UUID REFERENCES admin_users(id),  -- who created this admin
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_auth_user_id ON admin_users(auth_user_id);
CREATE INDEX idx_admin_users_email        ON admin_users(email);
CREATE INDEX idx_admin_users_role_id      ON admin_users(role_id);
CREATE INDEX idx_admin_users_is_active    ON admin_users(is_active);

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                  -- 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  table_name  TEXT,
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_action        ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name    ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at    ON audit_logs(created_at DESC);

-- ============================================================
-- SUPER ADMIN BOOTSTRAP FUNCTION
-- Called server-side when an admin-auth user first logs in
-- Checks SUPER_ADMIN_EMAILS config and provisions accordingly
-- ============================================================
CREATE OR REPLACE FUNCTION provision_super_admin_if_eligible(
  p_auth_user_id UUID,
  p_email        TEXT,
  p_display_name TEXT,
  p_super_admin_emails TEXT[]  -- passed from server env, never client
)
RETURNS TABLE(admin_id UUID, role_slug TEXT, was_provisioned BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_role_id UUID;
  v_admin_user          admin_users%ROWTYPE;
  v_was_provisioned     BOOLEAN := FALSE;
BEGIN
  -- Get the SUPER_ADMIN role id
  SELECT id INTO v_super_admin_role_id FROM roles WHERE slug = 'SUPER_ADMIN';

  -- Check if admin user already exists
  SELECT * INTO v_admin_user FROM admin_users WHERE email = p_email;

  IF NOT FOUND THEN
    -- New user — check if their email is in the super admin list
    IF p_email = ANY(p_super_admin_emails) THEN
      INSERT INTO admin_users (auth_user_id, email, display_name, role_id)
      VALUES (p_auth_user_id, p_email, p_display_name, v_super_admin_role_id)
      RETURNING * INTO v_admin_user;
      v_was_provisioned := TRUE;
    ELSE
      -- Not in super admin list and not an existing admin — deny
      RETURN;
    END IF;
  ELSE
    -- Update auth_user_id if not set (handles cases where auth was re-created)
    IF v_admin_user.auth_user_id IS NULL THEN
      UPDATE admin_users SET auth_user_id = p_auth_user_id, last_login_at = NOW()
      WHERE id = v_admin_user.id;
    ELSE
      UPDATE admin_users SET last_login_at = NOW() WHERE id = v_admin_user.id;
    END IF;
  END IF;

  -- Return the admin user info for the server to use
  RETURN QUERY
  SELECT
    au.id,
    r.slug,
    v_was_provisioned
  FROM admin_users au
  JOIN roles r ON r.id = au.role_id
  WHERE au.email = p_email;
END;
$$;

-- Revoke public execute — only service role can call this
REVOKE EXECUTE ON FUNCTION provision_super_admin_if_eligible FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION provision_super_admin_if_eligible TO service_role;
