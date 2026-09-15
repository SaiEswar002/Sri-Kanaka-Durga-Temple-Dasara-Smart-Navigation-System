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
