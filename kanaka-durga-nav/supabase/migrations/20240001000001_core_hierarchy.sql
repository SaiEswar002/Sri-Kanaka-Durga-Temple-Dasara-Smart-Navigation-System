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
  is_demo_data  BOOLEAN NOT NULL DEFAULT FALSE,
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
  is_demo_data  BOOLEAN NOT NULL DEFAULT FALSE,
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
