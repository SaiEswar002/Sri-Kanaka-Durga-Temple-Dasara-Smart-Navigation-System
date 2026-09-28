-- Migration: Configure Supabase Realtime publication for operational tables
-- Description: Adds operational tables that have active client subscriptions
--              to the supabase_realtime publication.
--
-- Background:
--   Supabase Realtime requires tables to be listed in the `supabase_realtime`
--   publication to emit postgres_changes events to subscribers.
--   Without this, client subscriptions silently receive no events.
--
-- Tables subscribed to in use-data.ts / dashboard-client.tsx:
--   - darshan_queues    (useDarshanQueues)
--   - parking_status    (useParkingAreas)
--   - announcements     (useAnnouncements)
--   - locations         (useLocations)
--   - route_closures    (useActiveClosures)
--   - crowd_status      (useCrowdStatus)
--   - emergency_points  (useEmergencyPoints)
--   - emergency_incidents (admin dashboard)
--   - sectors           (crowd update invalidates sectors query)
--
-- Tables NOT added (no active subscriptions identified):
--   - parking_areas     (static config, not subscribed directly)
--   - cameras           (no realtime subscription)
--   - camera_events     (no realtime subscription)
--   - admin_users / roles / audit_logs (admin-only, not realtime-subscribed)
--   - sub_sectors       (not directly subscribed)
--   - location_categories (static, not subscribed)
--
-- Safety: Uses DO $$ ... $$ block with IF NOT EXISTS check to avoid
--         duplicate publication member errors if migration is re-run.

DO $$
DECLARE
  pub_name TEXT := 'supabase_realtime';
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'darshan_queues',
    'parking_status',
    'announcements',
    'locations',
    'route_closures',
    'crowd_status',
    'emergency_points',
    'emergency_incidents',
    'sectors'
  ];
BEGIN
  -- Ensure the publication exists (it is created by Supabase automatically,
  -- but we guard against fresh/empty projects)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = pub_name
  ) THEN
    EXECUTE format('CREATE PUBLICATION %I FOR ALL TABLES', pub_name);
    RAISE NOTICE 'Created publication: %', pub_name;
    RETURN; -- All tables are covered; no individual table adds needed
  END IF;

  -- Check if the publication covers ALL tables already
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = pub_name AND puballtables = TRUE
  ) THEN
    RAISE NOTICE 'Publication "%" already covers all tables — skipping individual table grants', pub_name;
    RETURN;
  END IF;

  -- Add each table individually if not already in the publication
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = pub_name
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION %I ADD TABLE public.%I', pub_name, tbl);
      RAISE NOTICE 'Added table "%" to publication "%"', tbl, pub_name;
    ELSE
      RAISE NOTICE 'Table "%" is already in publication "%" — skipping', tbl, pub_name;
    END IF;
  END LOOP;
END $$;
