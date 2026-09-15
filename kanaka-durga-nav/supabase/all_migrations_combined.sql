-- ================================================================
-- FILE: 20240001000000_init_extensions.sql
-- ================================================================
-- Migration: Enable required PostgreSQL extensions
-- Description: PostGIS for spatial data, UUID generation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================================
-- FILE: 20240001000001_core_hierarchy.sql
-- ================================================================
-- Migration: Core sector/location hierarchy tables
-- Description: Sectors → Sub-sectors → Locations with PostGIS geometry

-- ============================================================
-- SECTORS
-- ============================================================
CREATE TABLE sectors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  name_te       TEXT NOT NULL,              -- Telugu name
  description   TEXT,
  description_te TEXT,
  slug          TEXT UNIQUE NOT NULL,
  geometry      GEOMETRY(POLYGON, 4326),    -- boundary polygon (optional)
  centroid      GEOMETRY(POINT, 4326),      -- center point for map display
  status        TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'INACTIVE', 'RESTRICTED', 'CLOSED')),
  crowd_level   TEXT NOT NULL DEFAULT 'NORMAL'
                  CHECK (crowd_level IN ('LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'CRITICAL')),
  crowd_updated_at TIMESTAMPTZ,
  crowd_source  TEXT DEFAULT 'MANUAL',      -- 'MANUAL' | 'CAMERA' | 'SENSOR'
  metadata      JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sectors_status     ON sectors(status);
CREATE INDEX idx_sectors_geometry   ON sectors USING GIST(geometry);
CREATE INDEX idx_sectors_centroid   ON sectors USING GIST(centroid);

-- ============================================================
-- SUB-SECTORS
-- ============================================================
CREATE TABLE sub_sectors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector_id     UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  name_te       TEXT NOT NULL,
  description   TEXT,
  description_te TEXT,
  slug          TEXT UNIQUE NOT NULL,
  geometry      GEOMETRY(POLYGON, 4326),
  centroid      GEOMETRY(POINT, 4326),
  status        TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'INACTIVE', 'RESTRICTED', 'CLOSED')),
  crowd_level   TEXT NOT NULL DEFAULT 'NORMAL'
                  CHECK (crowd_level IN ('LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'CRITICAL')),
  crowd_updated_at TIMESTAMPTZ,
  crowd_source  TEXT DEFAULT 'MANUAL',
  metadata      JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_sectors_sector_id ON sub_sectors(sector_id);
CREATE INDEX idx_sub_sectors_geometry  ON sub_sectors USING GIST(geometry);
CREATE INDEX idx_sub_sectors_centroid  ON sub_sectors USING GIST(centroid);

-- ============================================================
-- LOCATION CATEGORIES
-- ============================================================
CREATE TABLE location_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,          -- 'darshan' | 'parking' | 'medical' | 'food' | 'bus' | 'emergency' | 'toilet' | 'shoe_counter' | 'help_desk' | 'other'
  name        TEXT NOT NULL,
  name_te     TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'map-pin', -- icon identifier
  color       TEXT NOT NULL DEFAULT '#9b1b30', -- hex color for map marker
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,   -- shown as primary category on home
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO location_categories (slug, name, name_te, icon, color, is_primary, display_order) VALUES
  ('darshan',     'Darshan',          'దర్శనం',        'eye',           '#9b1b30', TRUE,  1),
  ('parking',     'Parking',          'పార్కింగ్',     'car',           '#d4a017', TRUE,  2),
  ('medical',     'Medical',          'వైద్య సహాయం',   'cross',         '#16a34a', TRUE,  3),
  ('food',        'Food & Annadanam', 'అన్నదానం',      'utensils',      '#ea580c', TRUE,  4),
  ('bus',         'Bus & Shuttle',    'బస్సు',          'bus',           '#2563eb', TRUE,  5),
  ('emergency',   'Emergency',        'అత్యవసరం',      'alert-triangle','#dc2626', TRUE,  6),
  ('toilet',      'Toilets',          'మరుగుదొడ్లు',  'droplets',      '#7c3aed', FALSE, 7),
  ('shoe_counter','Shoe Counter',     'చెప్పుల కౌంటర్','package',       '#854d0e', FALSE, 8),
  ('help_desk',   'Help Desk',        'సహాయ కేంద్రం',  'info',          '#0891b2', FALSE, 9),
  ('other',       'Other',            'ఇతర',           'map-pin',       '#6b7280', FALSE, 10);

-- ============================================================
-- LOCATIONS
-- ============================================================
CREATE TABLE locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  name_te         TEXT NOT NULL,
  category_id     UUID NOT NULL REFERENCES location_categories(id),
  sector_id       UUID REFERENCES sectors(id) ON DELETE SET NULL,
  sub_sector_id   UUID REFERENCES sub_sectors(id) ON DELETE SET NULL,
  position        GEOMETRY(POINT, 4326) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'TEMPORARY', 'CLOSED')),
  description     TEXT,
  description_te  TEXT,
  address         TEXT,
  address_te      TEXT,
  contact_phone   TEXT,
  contact_name    TEXT,
  operating_hours TEXT,                        -- JSON string or human-readable
  capacity        INTEGER,                     -- total capacity (where applicable)
  is_accessible   BOOLEAN NOT NULL DEFAULT TRUE,  -- wheelchair/senior accessible
  is_demo_data    BOOLEAN NOT NULL DEFAULT FALSE,  -- flag for seed data
  metadata        JSONB NOT NULL DEFAULT '{}',
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_category_id   ON locations(category_id);
CREATE INDEX idx_locations_sector_id     ON locations(sector_id);
CREATE INDEX idx_locations_sub_sector_id ON locations(sub_sector_id);
CREATE INDEX idx_locations_status        ON locations(status);
CREATE INDEX idx_locations_position      ON locations USING GIST(position);

-- ============================================================
-- UPDATE TRIGGERS (updated_at)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sectors_updated_at
  BEFORE UPDATE ON sectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sub_sectors_updated_at
  BEFORE UPDATE ON sub_sectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- FILE: 20240001000002_operational_tables.sql
-- ================================================================
-- Migration: Operational tables — queues, parking, closures, announcements
-- Description: Core operational data structures for real-time status

-- ============================================================
-- DARSHAN QUEUES
-- ============================================================
CREATE TABLE darshan_queues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_te         TEXT NOT NULL,
  queue_type      TEXT NOT NULL DEFAULT 'GENERAL'
                    CHECK (queue_type IN ('GENERAL', 'SPECIAL', 'VIP', 'DIVYANG', 'SEVAS')),
  status          TEXT NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN', 'CLOSED', 'SUSPENDED', 'FULL')),
  current_count   INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  max_capacity    INTEGER,
  estimated_wait_minutes INTEGER,              -- manually set or computed
  entry_point     GEOMETRY(POINT, 4326),       -- queue entry GPS
  exit_point      GEOMETRY(POINT, 4326),       -- queue exit GPS
  notes           TEXT,
  notes_te        TEXT,
  is_demo_data    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_darshan_queues_location_id ON darshan_queues(location_id);
CREATE INDEX idx_darshan_queues_status      ON darshan_queues(status);

CREATE TRIGGER trg_darshan_queues_updated_at
  BEFORE UPDATE ON darshan_queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PARKING AREAS
-- ============================================================
CREATE TABLE parking_areas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  name_te         TEXT NOT NULL,
  parking_type    TEXT NOT NULL DEFAULT 'PUBLIC'
                    CHECK (parking_type IN ('PUBLIC', 'RESERVED', 'EMERGENCY', 'SHUTTLE')),
  vehicle_types   TEXT[] NOT NULL DEFAULT ARRAY['TWO_WHEELER', 'CAR', 'BUS'],
  total_capacity  INTEGER NOT NULL DEFAULT 0,
  area_geometry   GEOMETRY(POLYGON, 4326),
  entrance_point  GEOMETRY(POINT, 4326),
  contact_phone   TEXT,
  is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
  fee_info        TEXT,
  is_demo_data    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parking_areas_location_id ON parking_areas(location_id);
CREATE INDEX idx_parking_areas_geometry    ON parking_areas USING GIST(area_geometry);
CREATE INDEX idx_parking_areas_entrance    ON parking_areas USING GIST(entrance_point);

CREATE TRIGGER trg_parking_areas_updated_at
  BEFORE UPDATE ON parking_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PARKING STATUS (live, updated frequently)
-- ============================================================
CREATE TABLE parking_status (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_area_id UUID NOT NULL REFERENCES parking_areas(id) ON DELETE CASCADE,
  occupied        INTEGER NOT NULL DEFAULT 0 CHECK (occupied >= 0),
  available       INTEGER NOT NULL DEFAULT 0 CHECK (available >= 0),
  status          TEXT NOT NULL DEFAULT 'AVAILABLE'
                    CHECK (status IN ('AVAILABLE', 'FILLING', 'FULL', 'CLOSED', 'UNKNOWN')),
  data_source     TEXT NOT NULL DEFAULT 'MANUAL'
                    CHECK (data_source IN ('MANUAL', 'CAMERA', 'SENSOR', 'ESTIMATE')),
  updated_by      UUID,                          -- admin user id (null if automated)
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_parking_status_area_id ON parking_status(parking_area_id);
CREATE INDEX idx_parking_status_status         ON parking_status(status);
CREATE INDEX idx_parking_status_updated_at     ON parking_status(updated_at DESC);

-- ============================================================
-- ROUTE CLOSURES
-- ============================================================
CREATE TABLE route_closures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  title_te        TEXT NOT NULL,
  reason          TEXT,
  reason_te       TEXT,
  closure_type    TEXT NOT NULL DEFAULT 'PEDESTRIAN'
                    CHECK (closure_type IN ('PEDESTRIAN', 'VEHICLE', 'ALL')),
  affected_area   GEOMETRY(POLYGON, 4326),       -- blocked zone polygon
  closure_line    GEOMETRY(LINESTRING, 4326),    -- blocked road/path line
  waypoints       JSONB,                          -- for routing engine to avoid
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('SCHEDULED', 'ACTIVE', 'RESOLVED', 'CANCELLED')),
  start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time        TIMESTAMPTZ,
  created_by      UUID,
  sector_id       UUID REFERENCES sectors(id) ON DELETE SET NULL,
  sub_sector_id   UUID REFERENCES sub_sectors(id) ON DELETE SET NULL,
  is_demo_data    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_closures_status       ON route_closures(status);
CREATE INDEX idx_route_closures_start_time   ON route_closures(start_time);
CREATE INDEX idx_route_closures_affected_area ON route_closures USING GIST(affected_area);
CREATE INDEX idx_route_closures_sector_id    ON route_closures(sector_id);

CREATE TRIGGER trg_route_closures_updated_at
  BEFORE UPDATE ON route_closures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  title_te        TEXT NOT NULL,
  message         TEXT NOT NULL,
  message_te      TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'INFO'
                    CHECK (priority IN ('INFO', 'NOTICE', 'WARNING', 'URGENT')),
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'ARCHIVED')),
  target_audience TEXT NOT NULL DEFAULT 'ALL'
                    CHECK (target_audience IN ('ALL', 'PILGRIMS', 'ADMIN', 'SECTOR')),
  sector_id       UUID REFERENCES sectors(id) ON DELETE SET NULL,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  created_by      UUID,
  is_demo_data    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_status    ON announcements(status);
CREATE INDEX idx_announcements_priority  ON announcements(priority);
CREATE INDEX idx_announcements_starts_at ON announcements(starts_at DESC);
CREATE INDEX idx_announcements_sector_id ON announcements(sector_id);

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- FILE: 20240001000003_emergency_crowd_cameras.sql
-- ================================================================
-- Migration: Emergency, crowd, and camera architecture tables

-- ============================================================
-- EMERGENCY POINTS
-- ============================================================
CREATE TABLE emergency_points (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  emergency_type  TEXT NOT NULL
                    CHECK (emergency_type IN ('POLICE', 'MEDICAL', 'FIRE', 'HELP_DESK', 'FIRST_AID', 'AMBULANCE', 'SOS_BOOTH')),
  name            TEXT NOT NULL,
  name_te         TEXT NOT NULL,
  contact_phone   TEXT,
  contact_phone_2 TEXT,
  is_24h          BOOLEAN NOT NULL DEFAULT TRUE,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'BUSY')),
  is_demo_data    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_points_location_id    ON emergency_points(location_id);
CREATE INDEX idx_emergency_points_emergency_type ON emergency_points(emergency_type);
CREATE INDEX idx_emergency_points_status         ON emergency_points(status);

CREATE TRIGGER trg_emergency_points_updated_at
  BEFORE UPDATE ON emergency_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- EMERGENCY INCIDENTS
-- ============================================================
CREATE TABLE emergency_incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_type   TEXT NOT NULL
                    CHECK (incident_type IN ('MEDICAL', 'SECURITY', 'FIRE', 'CROWD_CRUSH', 'MISSING_PERSON', 'LOST_CHILD', 'OTHER')),
  title           TEXT NOT NULL,
  description     TEXT,
  location_text   TEXT,                          -- free-text location description
  position        GEOMETRY(POINT, 4326),         -- GPS if known
  sector_id       UUID REFERENCES sectors(id),
  sub_sector_id   UUID REFERENCES sub_sectors(id),
  status          TEXT NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN', 'RESPONDING', 'RESOLVED', 'CANCELLED')),
  priority        TEXT NOT NULL DEFAULT 'MEDIUM'
                    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  reported_by     TEXT,                          -- name or phone of reporter
  assigned_to     TEXT,                          -- team/person assigned
  response_notes  TEXT,
  resolved_at     TIMESTAMPTZ,
  resolution_time_minutes INTEGER,
  created_by      UUID,
  is_demo_data    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_incidents_status      ON emergency_incidents(status);
CREATE INDEX idx_emergency_incidents_priority    ON emergency_incidents(priority);
CREATE INDEX idx_emergency_incidents_sector_id   ON emergency_incidents(sector_id);
CREATE INDEX idx_emergency_incidents_position    ON emergency_incidents USING GIST(position);
CREATE INDEX idx_emergency_incidents_created_at  ON emergency_incidents(created_at DESC);

CREATE TRIGGER trg_emergency_incidents_updated_at
  BEFORE UPDATE ON emergency_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CROWD STATUS (live, one row per sector or sub-sector)
-- ============================================================
CREATE TABLE crowd_status (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('SECTOR', 'SUB_SECTOR')),
  entity_id       UUID NOT NULL,                -- references sectors or sub_sectors
  crowd_level     TEXT NOT NULL DEFAULT 'NORMAL'
                    CHECK (crowd_level IN ('LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'CRITICAL')),
  estimated_count INTEGER,                       -- estimated people count
  capacity        INTEGER,                       -- max capacity for this entity
  occupancy_pct   NUMERIC(5,2),                 -- occupancy percentage
  data_source     TEXT NOT NULL DEFAULT 'MANUAL'
                    CHECK (data_source IN ('MANUAL', 'CAMERA', 'SENSOR', 'ESTIMATE')),
  camera_id       UUID,                          -- will reference cameras table later
  source_metadata JSONB DEFAULT '{}',
  updated_by      UUID,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_crowd_status_entity ON crowd_status(entity_type, entity_id);
CREATE INDEX idx_crowd_status_crowd_level   ON crowd_status(crowd_level);
CREATE INDEX idx_crowd_status_updated_at    ON crowd_status(updated_at DESC);

-- ============================================================
-- CAMERAS (architecture for future integration)
-- ============================================================
CREATE TABLE cameras (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  external_id     TEXT,                          -- ID from camera vendor system
  camera_type     TEXT NOT NULL DEFAULT 'FIXED'
                    CHECK (camera_type IN ('FIXED', 'PTZ', 'MOBILE', 'DRONE')),
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'FAULT', 'MAINTENANCE', 'OFFLINE')),
  position        GEOMETRY(POINT, 4326),
  sector_id       UUID REFERENCES sectors(id),
  sub_sector_id   UUID REFERENCES sub_sectors(id),
  feed_url        TEXT,                          -- internal/VPN URL, never public
  capabilities    TEXT[] DEFAULT ARRAY['CROWD_COUNT'],  -- what this camera can do
  last_seen_at    TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cameras_sector_id    ON cameras(sector_id);
CREATE INDEX idx_cameras_status       ON cameras(status);
CREATE INDEX idx_cameras_position     ON cameras USING GIST(position);

CREATE TRIGGER trg_cameras_updated_at
  BEFORE UPDATE ON cameras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CAMERA EVENTS (deferred — table exists, no active flows yet)
-- ============================================================
CREATE TABLE camera_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camera_id       UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL
                    CHECK (event_type IN ('CROWD_COUNT', 'VEHICLE_COUNT', 'ANOMALY', 'ZONE_VIOLATION', 'OTHER')),
  payload         JSONB NOT NULL DEFAULT '{}',  -- raw event from camera API
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_camera_events_camera_id   ON camera_events(camera_id);
CREATE INDEX idx_camera_events_event_type  ON camera_events(event_type);
CREATE INDEX idx_camera_events_created_at  ON camera_events(created_at DESC);
CREATE INDEX idx_camera_events_processed   ON camera_events(processed);


-- ================================================================
-- FILE: 20240001000004_auth_rbac.sql
-- ================================================================
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


-- ================================================================
-- FILE: 20240001000005_rls_policies.sql
-- ================================================================
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


-- ================================================================
-- FILE: 20240001000006_demo_seed_data.sql
-- ================================================================
-- Migration: DEMO seed data
-- IMPORTANT: All data in this file is clearly labeled as DEMO/DEVELOPMENT data.
-- Coordinates are approximate and NOT the real GPS positions of temple facilities.
-- Real operational data must be provided by the temple organization.
-- All demo records have is_demo_data = TRUE and can be identified/deleted without schema changes.
-- Replace this file with real data when the organization provides it.

-- ============================================================
-- DEMO SECTORS (approximate area names, NOT official sector designations)
-- ============================================================
INSERT INTO sectors (name, name_te, slug, description, description_te, centroid, status, crowd_level, display_order, is_demo_data, metadata)
VALUES
  (
    '[DEMO] Indrakeeladri Hill Approach',
    '[డెమో] ఇంద్రకీలాద్రి కొండ మార్గం',
    'demo-indrakeeladri-approach',
    'DEMO: Main approach to the hill and temple complex',
    'డెమో: కొండ మరియు ఆలయ సముదాయానికి ప్రధాన మార్గం',
    ST_SetSRID(ST_MakePoint(80.6238, 16.5145), 4326),
    'ACTIVE', 'NORMAL', 1,
    TRUE,
    '{"demo": true, "note": "Replace with real sector data"}'::JSONB
  ),
  (
    '[DEMO] River Ghat & Ghats Area',
    '[డెమో] నది ఘాట్ ప్రాంతం',
    'demo-river-ghat',
    'DEMO: Krishna river ghat area near the temple',
    'డెమో: ఆలయ సమీపంలో కృష్ణా నది ఘాట్ ప్రాంతం',
    ST_SetSRID(ST_MakePoint(80.6210, 16.5180), 4326),
    'ACTIVE', 'MEDIUM', 2,
    TRUE,
    '{"demo": true, "note": "Replace with real sector data"}'::JSONB
  ),
  (
    '[DEMO] Main Parking Zone North',
    '[డెమో] ప్రధాన పార్కింగ్ జోన్ ఉత్తరం',
    'demo-parking-north',
    'DEMO: Northern parking area for vehicles',
    'డెమో: వాహనాల కోసం ఉత్తర పార్కింగ్ ప్రాంతం',
    ST_SetSRID(ST_MakePoint(80.6190, 16.5130), 4326),
    'ACTIVE', 'LOW', 3,
    TRUE,
    '{"demo": true, "note": "Replace with real sector data"}'::JSONB
  ),
  (
    '[DEMO] Annadanam & Services Area',
    '[డెమో] అన్నదానం & సేవలు ప్రాంతం',
    'demo-services-area',
    'DEMO: Food, medical, and support services zone',
    'డెమో: ఆహారం, వైద్య మరియు మద్దతు సేవల జోన్',
    ST_SetSRID(ST_MakePoint(80.6225, 16.5160), 4326),
    'ACTIVE', 'NORMAL', 4,
    TRUE,
    '{"demo": true, "note": "Replace with real sector data"}'::JSONB
  );

-- ============================================================
-- DEMO SUB-SECTORS
-- ============================================================
INSERT INTO sub_sectors (sector_id, name, name_te, slug, description, description_te, centroid, status, crowd_level, display_order, metadata)
SELECT
  s.id,
  '[DEMO] Hill Entrance Queue',
  '[డెమో] కొండ ప్రవేశ క్యూ',
  'demo-hill-entrance-queue',
  'DEMO: Queue entry point at the base of the hill',
  'డెమో: కొండ దిగువన క్యూ ప్రవేశ స్థానం',
  ST_SetSRID(ST_MakePoint(80.6235, 16.5140), 4326),
  'ACTIVE', 'HIGH', 1,
  '{"demo": true}'::JSONB
FROM sectors s WHERE s.slug = 'demo-indrakeeladri-approach'

UNION ALL

SELECT
  s.id,
  '[DEMO] Upper Temple Steps',
  '[డెమో] ఎగువ ఆలయ మెట్లు',
  'demo-upper-temple-steps',
  'DEMO: Stepped path to upper temple',
  'డెమో: ఎగువ ఆలయానికి మెట్ల మార్గం',
  ST_SetSRID(ST_MakePoint(80.6242, 16.5150), 4326),
  'ACTIVE', 'MEDIUM', 2,
  '{"demo": true}'::JSONB
FROM sectors s WHERE s.slug = 'demo-indrakeeladri-approach';

-- ============================================================
-- DEMO LOCATIONS
-- ============================================================

-- Darshan entry
INSERT INTO locations (name, name_te, category_id, sector_id, position, status, description, description_te, is_demo_data, metadata)
SELECT
  '[DEMO] Main Darshan Entry',
  '[డెమో] ప్రధాన దర్శన ప్రవేశం',
  lc.id,
  s.id,
  ST_SetSRID(ST_MakePoint(80.6238, 16.5148), 4326),
  'ACTIVE',
  'DEMO: Main entry point for darshan queue. Real coordinates TBD.',
  'డెమో: దర్శన క్యూ ప్రధాన ప్రవేశ స్థానం. నిజమైన అక్షాంశ రేఖాంశాలు నిర్ణయించవలసి ఉంది.',
  TRUE,
  '{"demo": true, "note": "Replace with verified GPS coordinates from temple authorities"}'::JSONB
FROM location_categories lc, sectors s
WHERE lc.slug = 'darshan' AND s.slug = 'demo-indrakeeladri-approach';

-- Medical camp (demo)
INSERT INTO locations (name, name_te, category_id, sector_id, position, status, description, description_te, contact_phone, is_demo_data, metadata)
SELECT
  '[DEMO] Medical Camp - Base Area',
  '[డెమో] వైద్య శిబిరం - దిగువ ప్రాంతం',
  lc.id,
  s.id,
  ST_SetSRID(ST_MakePoint(80.6215, 16.5142), 4326),
  'ACTIVE',
  'DEMO: First aid and medical assistance point. Contact number is placeholder.',
  'డెమో: ప్రథమ చికిత్స మరియు వైద్య సహాయ స్థానం. సంప్రదింపు నంబర్ ప్లేస్‌హోల్డర్.',
  '+91-XXXXX-DEMO',
  TRUE,
  '{"demo": true, "note": "Replace contact phone with real number from temple authorities"}'::JSONB
FROM location_categories lc, sectors s
WHERE lc.slug = 'medical' AND s.slug = 'demo-services-area';

-- Annadanam location (demo)
INSERT INTO locations (name, name_te, category_id, sector_id, position, status, description, description_te, is_demo_data, metadata)
SELECT
  '[DEMO] Annadanam Shed',
  '[డెమో] అన్నదాన శాల',
  lc.id,
  s.id,
  ST_SetSRID(ST_MakePoint(80.6228, 16.5162), 4326),
  'ACTIVE',
  'DEMO: Free meals distribution point during Dasara. Timing TBD.',
  'డెమో: దసరా సమయంలో ఉచిత భోజన పంపిణీ స్థానం. సమయం నిర్ణయించవలసి ఉంది.',
  TRUE,
  '{"demo": true}'::JSONB
FROM location_categories lc, sectors s
WHERE lc.slug = 'food' AND s.slug = 'demo-services-area';

-- Parking area (demo)
INSERT INTO locations (name, name_te, category_id, sector_id, position, status, description, description_te, capacity, is_demo_data, metadata)
SELECT
  '[DEMO] Parking Zone North P1',
  '[డెమో] పార్కింగ్ జోన్ నార్త్ P1',
  lc.id,
  s.id,
  ST_SetSRID(ST_MakePoint(80.6188, 16.5132), 4326),
  'ACTIVE',
  'DEMO: Northern parking area. Capacity is illustrative, not real.',
  'డెమో: ఉత్తర పార్కింగ్ ప్రాంతం. సామర్థ్యం వివరణాత్మకమైనది, నిజమైనది కాదు.',
  500,
  TRUE,
  '{"demo": true}'::JSONB
FROM location_categories lc, sectors s
WHERE lc.slug = 'parking' AND s.slug = 'demo-parking-north';

-- Bus stop (demo)
INSERT INTO locations (name, name_te, category_id, sector_id, position, status, description, description_te, is_demo_data, metadata)
SELECT
  '[DEMO] Main Shuttle Bus Stand',
  '[డెమో] ప్రధాన షటిల్ బస్ స్టాండ్',
  lc.id,
  s.id,
  ST_SetSRID(ST_MakePoint(80.6195, 16.5135), 4326),
  'ACTIVE',
  'DEMO: Shuttle bus pickup/drop point. Routes TBD.',
  'డెమో: షటిల్ బస్ పికప్/డ్రాప్ పాయింట్. మార్గాలు నిర్ణయించవలసి ఉంది.',
  TRUE,
  '{"demo": true}'::JSONB
FROM location_categories lc, sectors s
WHERE lc.slug = 'bus' AND s.slug = 'demo-parking-north';

-- Emergency point (demo)
INSERT INTO locations (name, name_te, category_id, sector_id, position, status, description, description_te, contact_phone, is_demo_data, metadata)
SELECT
  '[DEMO] Police Assistance Booth',
  '[డెమో] పోలీస్ సహాయ కేంద్రం',
  lc.id,
  s.id,
  ST_SetSRID(ST_MakePoint(80.6230, 16.5155), 4326),
  'ACTIVE',
  'DEMO: Police assistance and information booth. Contact is placeholder.',
  'డెమో: పోలీస్ సహాయ మరియు సమాచార కేంద్రం. సంప్రదింపు ప్లేస్‌హోల్డర్.',
  '+91-XXXXX-DEMO',
  TRUE,
  '{"demo": true}'::JSONB
FROM location_categories lc, sectors s
WHERE lc.slug = 'emergency' AND s.slug = 'demo-services-area';

-- Toilet block (demo)
INSERT INTO locations (name, name_te, category_id, sector_id, position, status, description, description_te, is_demo_data, metadata)
SELECT
  '[DEMO] Toilet Block - Near Ghat',
  '[డెమో] మరుగుదొడ్ల బ్లాక్ - ఘాట్ సమీపంలో',
  lc.id,
  s.id,
  ST_SetSRID(ST_MakePoint(80.6212, 16.5178), 4326),
  'ACTIVE',
  'DEMO: Public toilet facility. Separate male/female blocks.',
  'డెమో: పబ్లిక్ టాయిలెట్ సౌకర్యం. వేర్వేరు పురుషుల/మహిళల బ్లాక్‌లు.',
  TRUE,
  '{"demo": true}'::JSONB
FROM location_categories lc, sectors s
WHERE lc.slug = 'toilet' AND s.slug = 'demo-river-ghat';

-- ============================================================
-- DEMO DARSHAN QUEUE
-- ============================================================
INSERT INTO darshan_queues (location_id, name, name_te, queue_type, status, current_count, estimated_wait_minutes, is_demo_data)
SELECT
  l.id,
  '[DEMO] General Darshan Queue',
  '[డెమో] సాధారణ దర్శన క్యూ',
  'GENERAL',
  'OPEN',
  350,
  75,
  TRUE
FROM locations l WHERE l.name = '[DEMO] Main Darshan Entry';

-- ============================================================
-- DEMO PARKING AREAS + STATUS
-- ============================================================
WITH parking_loc AS (
  SELECT id FROM locations WHERE name = '[DEMO] Parking Zone North P1'
)
INSERT INTO parking_areas (location_id, name, name_te, parking_type, vehicle_types, total_capacity, is_paid, is_demo_data)
SELECT
  parking_loc.id,
  '[DEMO] North Parking P1',
  '[డెమో] నార్త్ పార్కింగ్ P1',
  'PUBLIC',
  ARRAY['TWO_WHEELER', 'CAR'],
  500,
  FALSE,
  TRUE
FROM parking_loc;

INSERT INTO parking_status (parking_area_id, occupied, available, status, data_source)
SELECT id, 320, 180, 'FILLING', 'MANUAL'
FROM parking_areas WHERE name = '[DEMO] North Parking P1';

-- ============================================================
-- DEMO ANNOUNCEMENTS
-- ============================================================
INSERT INTO announcements (title, title_te, message, message_te, priority, status, starts_at, is_demo_data)
VALUES
  (
    '[DEMO] Welcome to Dasara at Sri Kanaka Durga Temple',
    '[డెమో] శ్రీ కనక దుర్గమ్మ ఆలయంలో దసరాకు స్వాగతం',
    'DEMO ANNOUNCEMENT: Welcome to the Dasara festival. This app will help you navigate the temple premises safely and efficiently. Real announcements will appear here.',
    'డెమో ప్రకటన: దసరా పండుగకు స్వాగతం. ఈ యాప్ ఆలయ ప్రాంగణంలో సురక్షితంగా మరియు సమర్థంగా నావిగేట్ చేయడంలో మీకు సహాయపడుతుంది.',
    'INFO',
    'ACTIVE',
    NOW() - INTERVAL '1 hour',
    TRUE
  ),
  (
    '[DEMO] Queue Update: Estimated Wait 75 Minutes',
    '[డెమో] క్యూ నవీకరణ: అంచనా నిరీక్షణ 75 నిమిషాలు',
    'DEMO: Current estimated wait time for general darshan is approximately 75 minutes. This is demonstration data.',
    'డెమో: సాధారణ దర్శనానికి ప్రస్తుత అంచనా నిరీక్షణ సమయం దాదాపు 75 నిమిషాలు. ఇది డెమో డేటా.',
    'NOTICE',
    'ACTIVE',
    NOW() - INTERVAL '30 minutes',
    TRUE
  );

-- ============================================================
-- DEMO EMERGENCY POINTS
-- ============================================================
INSERT INTO emergency_points (location_id, emergency_type, name, name_te, contact_phone, is_24h, status)
SELECT
  l.id,
  'POLICE',
  '[DEMO] Police Booth Alpha',
  '[డెమో] పోలీస్ బూత్ ఆల్ఫా',
  '+91-XXXXX-DEMO',
  TRUE,
  'ACTIVE'
FROM locations l WHERE l.name = '[DEMO] Police Assistance Booth';

INSERT INTO emergency_points (location_id, emergency_type, name, name_te, contact_phone, is_24h, status)
SELECT
  l.id,
  'MEDICAL',
  '[DEMO] Base Medical Camp',
  '[డెమో] బేస్ మెడికల్ క్యాంప్',
  '+91-XXXXX-DEMO',
  TRUE,
  'ACTIVE'
FROM locations l WHERE l.name = '[DEMO] Medical Camp - Base Area';

-- ============================================================
-- DEMO CROWD STATUS (one per demo sector)
-- ============================================================
INSERT INTO crowd_status (entity_type, entity_id, crowd_level, estimated_count, capacity, occupancy_pct, data_source)
SELECT
  'SECTOR',
  s.id,
  s.crowd_level,
  CASE s.crowd_level
    WHEN 'LOW' THEN 200
    WHEN 'NORMAL' THEN 1000
    WHEN 'MEDIUM' THEN 3000
    WHEN 'HIGH' THEN 6000
    WHEN 'CRITICAL' THEN 9000
  END,
  10000,
  CASE s.crowd_level
    WHEN 'LOW' THEN 2.0
    WHEN 'NORMAL' THEN 10.0
    WHEN 'MEDIUM' THEN 30.0
    WHEN 'HIGH' THEN 60.0
    WHEN 'CRITICAL' THEN 90.0
  END,
  'MANUAL'
FROM sectors s WHERE s.is_demo_data = TRUE;


