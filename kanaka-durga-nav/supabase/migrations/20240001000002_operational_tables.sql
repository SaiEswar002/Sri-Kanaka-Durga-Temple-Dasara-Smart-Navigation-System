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
