-- Migration: Remove unused modules completely
-- Description: Drops tables, publications, policies, and roles exclusively associated with
--              Crowd Levels, Darshan Queues, Announcements, Route Closures, and Emergency.
--              (Buses had no database tables).

-- ============================================================
-- 1. REMOVE FROM SUPABASE REALTIME PUBLICATION
-- ============================================================
DO $$
DECLARE
  pub_name TEXT := 'supabase_realtime';
  tbl TEXT;
  tables_to_remove TEXT[] := ARRAY[
    'darshan_queues',
    'route_closures',
    'announcements',
    'emergency_points',
    'emergency_incidents',
    'crowd_status'
  ];
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = pub_name AND puballtables = FALSE
  ) THEN
    FOREACH tbl IN ARRAY tables_to_remove LOOP
      IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = pub_name
          AND schemaname = 'public'
          AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION %I DROP TABLE public.%I', pub_name, tbl);
        RAISE NOTICE 'Removed table "%" from publication "%"', tbl, pub_name;
      END IF;
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- 2. DROP TABLES CASCADE
-- Drops all foreign keys, indexes, triggers, and RLS policies on these tables
-- ============================================================
DROP TABLE IF EXISTS emergency_incidents CASCADE;
DROP TABLE IF EXISTS emergency_points CASCADE;
DROP TABLE IF EXISTS crowd_status CASCADE;
DROP TABLE IF EXISTS route_closures CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS darshan_queues CASCADE;

-- ============================================================
-- 3. CLEAN UP RBAC ROLES & PERMISSIONS FOR REMOVED MODULES
-- ============================================================
DO $$
BEGIN
  -- Delete any admin users assigned exclusively to CROWD_MANAGER
  DELETE FROM admin_users 
  WHERE role_id IN (SELECT id FROM roles WHERE slug = 'CROWD_MANAGER');

  -- Delete CROWD_MANAGER role
  DELETE FROM roles WHERE slug = 'CROWD_MANAGER';

  -- Update OPERATIONS_ADMIN permissions
  UPDATE roles 
  SET permissions = '{"locations": true, "parking": true}'::JSONB,
      description = 'Can manage operations, parking, and locations'
  WHERE slug = 'OPERATIONS_ADMIN';

  -- Update FACILITY_MANAGER permissions
  UPDATE roles 
  SET permissions = '{"locations": true, "parking": true}'::JSONB,
      description = 'Can manage locations and parking'
  WHERE slug = 'FACILITY_MANAGER';
END $$;
