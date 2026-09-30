-- Migration: Phase 2 — Simplify sector, sub_sector and location schema
-- Drop obsolete indexes
DROP INDEX IF EXISTS idx_sectors_status;
DROP INDEX IF EXISTS idx_sectors_geometry;
DROP INDEX IF EXISTS idx_sectors_centroid;
DROP INDEX IF EXISTS idx_sub_sectors_geometry;
DROP INDEX IF EXISTS idx_sub_sectors_centroid;
DROP INDEX IF EXISTS idx_locations_status;

-- SECTORS: drop obsolete columns
ALTER TABLE sectors
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS geometry,
  DROP COLUMN IF EXISTS centroid,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS crowd_level,
  DROP COLUMN IF EXISTS crowd_updated_at,
  DROP COLUMN IF EXISTS crowd_source,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS display_order,
  DROP COLUMN IF EXISTS is_demo_data;

-- SUB_SECTORS: drop obsolete columns
ALTER TABLE sub_sectors
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS geometry,
  DROP COLUMN IF EXISTS centroid,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS crowd_level,
  DROP COLUMN IF EXISTS crowd_updated_at,
  DROP COLUMN IF EXISTS crowd_source,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS display_order,
  DROP COLUMN IF EXISTS is_demo_data;

-- LOCATIONS: drop obsolete columns
ALTER TABLE locations
  DROP COLUMN IF EXISTS contact_phone,
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS operating_hours,
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS is_accessible,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS display_order,
  DROP COLUMN IF EXISTS address_te,
  DROP COLUMN IF EXISTS description_te,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS is_demo_data;

-- Add server-side validation: sub_sector must belong to selected sector
CREATE OR REPLACE FUNCTION validate_location_sub_sector()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_location_sub_sector ON locations;
CREATE TRIGGER trg_validate_location_sub_sector
  BEFORE INSERT OR UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION validate_location_sub_sector();

-- Clean up demo seed data (uses obsolete columns no longer present)
DELETE FROM sub_sectors WHERE name LIKE '[DEMO]%';
DELETE FROM locations WHERE name LIKE '[DEMO]%';
DELETE FROM sectors WHERE name LIKE '[DEMO]%';
