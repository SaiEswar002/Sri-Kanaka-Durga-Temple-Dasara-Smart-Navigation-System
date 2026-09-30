-- Migration: Phase 2 — Simplify sector, sub_sector and location schema
-- Description: Drops obsolete fields, handles dependent RLS policies, and adds hierarchy validation

-- ============================================================
-- 1. DROP DEPENDENT RLS POLICIES FIRST
-- (These policies reference the 'status' column that will be dropped)
-- ============================================================
DROP POLICY IF EXISTS "sectors_public_read" ON sectors;
DROP POLICY IF EXISTS "sub_sectors_public_read" ON sub_sectors;
DROP POLICY IF EXISTS "locations_public_read" ON locations;

-- ============================================================
-- 2. DROP OBSOLETE INDEXES
-- ============================================================
DROP INDEX IF EXISTS idx_sectors_status;
DROP INDEX IF EXISTS idx_sectors_geometry;
DROP INDEX IF EXISTS idx_sectors_centroid;
DROP INDEX IF EXISTS idx_sub_sectors_geometry;
DROP INDEX IF EXISTS idx_sub_sectors_centroid;
DROP INDEX IF EXISTS idx_locations_status;

-- ============================================================
-- 3. SECTORS: DROP OBSOLETE COLUMNS (WITH CASCADE)
-- ============================================================
ALTER TABLE sectors
  DROP COLUMN IF EXISTS slug CASCADE,
  DROP COLUMN IF EXISTS geometry CASCADE,
  DROP COLUMN IF EXISTS centroid CASCADE,
  DROP COLUMN IF EXISTS status CASCADE,
  DROP COLUMN IF EXISTS crowd_level CASCADE,
  DROP COLUMN IF EXISTS crowd_updated_at CASCADE,
  DROP COLUMN IF EXISTS crowd_source CASCADE,
  DROP COLUMN IF EXISTS metadata CASCADE,
  DROP COLUMN IF EXISTS display_order CASCADE,
  DROP COLUMN IF EXISTS is_demo_data CASCADE;

-- ============================================================
-- 4. SUB_SECTORS: DROP OBSOLETE COLUMNS (WITH CASCADE)
-- ============================================================
ALTER TABLE sub_sectors
  DROP COLUMN IF EXISTS slug CASCADE,
  DROP COLUMN IF EXISTS geometry CASCADE,
  DROP COLUMN IF EXISTS centroid CASCADE,
  DROP COLUMN IF EXISTS status CASCADE,
  DROP COLUMN IF EXISTS crowd_level CASCADE,
  DROP COLUMN IF EXISTS crowd_updated_at CASCADE,
  DROP COLUMN IF EXISTS crowd_source CASCADE,
  DROP COLUMN IF EXISTS metadata CASCADE,
  DROP COLUMN IF EXISTS display_order CASCADE,
  DROP COLUMN IF EXISTS is_demo_data CASCADE;

-- ============================================================
-- 5. LOCATIONS: DROP OBSOLETE COLUMNS (WITH CASCADE)
-- ============================================================
ALTER TABLE locations
  DROP COLUMN IF EXISTS contact_phone CASCADE,
  DROP COLUMN IF EXISTS contact_name CASCADE,
  DROP COLUMN IF EXISTS operating_hours CASCADE,
  DROP COLUMN IF EXISTS capacity CASCADE,
  DROP COLUMN IF EXISTS is_accessible CASCADE,
  DROP COLUMN IF EXISTS status CASCADE,
  DROP COLUMN IF EXISTS display_order CASCADE,
  DROP COLUMN IF EXISTS address_te CASCADE,
  DROP COLUMN IF EXISTS description_te CASCADE,
  DROP COLUMN IF EXISTS metadata CASCADE,
  DROP COLUMN IF EXISTS is_demo_data CASCADE;

-- ============================================================
-- 6. RECREATE PUBLIC READ POLICIES (UNRESTRICTED)
-- ============================================================
CREATE POLICY "sectors_public_read" ON sectors
  FOR SELECT USING (TRUE);

CREATE POLICY "sub_sectors_public_read" ON sub_sectors
  FOR SELECT USING (TRUE);

CREATE POLICY "locations_public_read" ON locations
  FOR SELECT USING (TRUE);

-- ============================================================
-- 7. SERVER-SIDE HIERARCHY VALIDATION TRIGGER
-- ============================================================
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

-- ============================================================
-- 8. CLEAN UP DEMO SEED DATA (CHILDREN FIRST TO RESPECT FKs)
-- ============================================================
DELETE FROM locations WHERE name LIKE '[DEMO]%';
DELETE FROM sub_sectors WHERE name LIKE '[DEMO]%';
DELETE FROM sectors WHERE name LIKE '[DEMO]%';
