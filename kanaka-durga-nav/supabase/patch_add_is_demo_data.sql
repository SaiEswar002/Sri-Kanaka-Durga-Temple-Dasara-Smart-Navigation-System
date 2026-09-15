-- ================================================================
-- PATCH: Add missing is_demo_data columns + re-run seed data
-- Run this in Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/rqmkggkphnrqswbpolzd/sql/new
-- ================================================================

-- Step 1: Add missing columns (safe - uses IF NOT EXISTS equivalent)
ALTER TABLE sectors
  ADD COLUMN IF NOT EXISTS is_demo_data BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE sub_sectors
  ADD COLUMN IF NOT EXISTS is_demo_data BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Confirm columns added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'sectors' AND column_name = 'is_demo_data';
