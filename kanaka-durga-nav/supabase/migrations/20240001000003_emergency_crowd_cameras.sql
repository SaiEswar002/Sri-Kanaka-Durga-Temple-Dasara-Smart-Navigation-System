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
