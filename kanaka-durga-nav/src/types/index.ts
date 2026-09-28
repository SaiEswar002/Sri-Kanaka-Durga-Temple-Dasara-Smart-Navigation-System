// Core database types matching our Supabase schema exactly

export type UUID = string;
export type Timestamp = string; // ISO 8601

// ============================================================
// ENUMS
// ============================================================
export type SectorStatus = 'ACTIVE' | 'INACTIVE' | 'RESTRICTED' | 'CLOSED';
export type CrowdLevel = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type LocationStatus = 'ACTIVE' | 'INACTIVE' | 'TEMPORARY' | 'CLOSED';
export type QueueType = 'GENERAL' | 'SPECIAL' | 'VIP' | 'DIVYANG' | 'SEVAS';
export type QueueStatus = 'OPEN' | 'CLOSED' | 'SUSPENDED' | 'FULL';
export type ParkingType = 'PUBLIC' | 'RESERVED' | 'EMERGENCY' | 'SHUTTLE';
export type ParkingAvailabilityStatus = 'AVAILABLE' | 'FILLING' | 'FULL' | 'CLOSED' | 'UNKNOWN';
export type ClosureType = 'PEDESTRIAN' | 'VEHICLE' | 'ALL';
export type ClosureStatus = 'SCHEDULED' | 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
export type AnnouncementPriority = 'INFO' | 'NOTICE' | 'WARNING' | 'URGENT';
export type AnnouncementStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
export type EmergencyType = 'POLICE' | 'MEDICAL' | 'FIRE' | 'HELP_DESK' | 'FIRST_AID' | 'AMBULANCE' | 'SOS_BOOTH';
export type IncidentType = 'MEDICAL' | 'SECURITY' | 'FIRE' | 'CROWD_CRUSH' | 'MISSING_PERSON' | 'LOST_CHILD' | 'OTHER';
export type IncidentStatus = 'OPEN' | 'RESPONDING' | 'RESOLVED' | 'CANCELLED';
export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DataSource = 'MANUAL' | 'CAMERA' | 'SENSOR' | 'ESTIMATE';
export type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'CROWD_MANAGER' | 'FACILITY_MANAGER' | 'VIEW_ONLY';
export type CameraType = 'FIXED' | 'PTZ' | 'MOBILE' | 'DRONE';
export type CameraStatus = 'ACTIVE' | 'INACTIVE' | 'FAULT' | 'MAINTENANCE' | 'OFFLINE';

// ============================================================
// GEOGRAPHIC TYPES
// ============================================================
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface LngLat {
  lng: number;
  lat: number;
}

// ============================================================
// CORE DB TYPES
// ============================================================
export interface Sector {
  id: UUID;
  name: string;
  name_te: string;
  description: string | null;
  description_te: string | null;
  slug: string;
  geometry: GeoPolygon | null;
  centroid: GeoPoint | null;
  status: SectorStatus;
  crowd_level: CrowdLevel;
  crowd_updated_at: Timestamp | null;
  crowd_source: string;
  metadata: Record<string, unknown>;
  display_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SubSector {
  id: UUID;
  sector_id: UUID;
  name: string;
  name_te: string;
  description: string | null;
  description_te: string | null;
  slug: string;
  geometry: GeoPolygon | null;
  centroid: GeoPoint | null;
  status: SectorStatus;
  crowd_level: CrowdLevel;
  crowd_updated_at: Timestamp | null;
  crowd_source: string;
  metadata: Record<string, unknown>;
  display_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Joined
  sector?: Sector;
}

export interface LocationCategory {
  id: UUID;
  slug: string;
  name: string;
  name_te: string;
  icon: string;
  color: string;
  is_primary: boolean;
  display_order: number;
  created_at: Timestamp;
}

export interface Location {
  id: UUID;
  name: string;
  name_te: string;
  category_id: UUID;
  sector_id: UUID | null;
  sub_sector_id: UUID | null;
  position: GeoPoint;
  status: LocationStatus;
  description: string | null;
  description_te: string | null;
  address: string | null;
  address_te: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  operating_hours: string | null;
  capacity: number | null;
  is_accessible: boolean;
  is_demo_data: boolean;
  metadata: Record<string, unknown>;
  display_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Joined
  category?: LocationCategory;
  sector?: Sector | null;
  sub_sector?: SubSector | null;
}

export interface DarshanQueue {
  id: UUID;
  location_id: UUID;
  name: string;
  name_te: string;
  queue_type: QueueType;
  status: QueueStatus;
  current_count: number;
  max_capacity: number | null;
  estimated_wait_minutes: number | null;
  entry_point: GeoPoint | null;
  exit_point: GeoPoint | null;
  notes: string | null;
  notes_te: string | null;
  is_demo_data: boolean;
  updated_at: Timestamp;
  created_at: Timestamp;
  // Joined
  location?: Location;
}

export interface ParkingArea {
  id: UUID;
  location_id: UUID | null;
  name: string;
  name_te: string;
  parking_type: ParkingType;
  vehicle_types: string[];
  total_capacity: number;
  area_geometry: GeoPolygon | null;
  entrance_point: GeoPoint | null;
  contact_phone: string | null;
  is_paid: boolean;
  fee_info: string | null;
  is_demo_data: boolean;
  metadata: Record<string, unknown>;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Joined
  location?: Location | null;
  current_status?: ParkingStatus | null;
}

export interface ParkingStatus {
  id: UUID;
  parking_area_id: UUID;
  occupied: number;
  available: number;
  status: ParkingAvailabilityStatus;
  data_source: DataSource;
  updated_by: UUID | null;
  updated_at: Timestamp;
}

export interface RouteClosure {
  id: UUID;
  title: string;
  title_te: string;
  reason: string | null;
  reason_te: string | null;
  closure_type: ClosureType;
  affected_area: GeoPolygon | null;
  closure_line: GeoLineString | null;
  waypoints: unknown | null;
  status: ClosureStatus;
  start_time: Timestamp;
  end_time: Timestamp | null;
  created_by: UUID | null;
  sector_id: UUID | null;
  sub_sector_id: UUID | null;
  is_demo_data: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Announcement {
  id: UUID;
  title: string;
  title_te: string;
  message: string;
  message_te: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  target_audience: string;
  sector_id: UUID | null;
  starts_at: Timestamp;
  expires_at: Timestamp | null;
  created_by: UUID | null;
  is_demo_data: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface EmergencyPoint {
  id: UUID;
  location_id: UUID;
  emergency_type: EmergencyType;
  name: string;
  name_te: string;
  contact_phone: string | null;
  contact_phone_2: string | null;
  is_24h: boolean;
  status: string;
  is_demo_data: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Joined
  location?: Location;
}

export interface EmergencyIncident {
  id: UUID;
  incident_type: IncidentType;
  title: string;
  description: string | null;
  location_text: string | null;
  position: GeoPoint | null;
  sector_id: UUID | null;
  sub_sector_id: UUID | null;
  status: IncidentStatus;
  priority: IncidentPriority;
  reported_by: string | null;
  assigned_to: string | null;
  response_notes: string | null;
  resolved_at: Timestamp | null;
  resolution_time_minutes: number | null;
  created_by: UUID | null;
  is_demo_data: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CrowdStatus {
  id: UUID;
  entity_type: 'SECTOR' | 'SUB_SECTOR';
  entity_id: UUID;
  crowd_level: CrowdLevel;
  estimated_count: number | null;
  capacity: number | null;
  occupancy_pct: number | null;
  data_source: DataSource;
  camera_id: UUID | null;
  source_metadata: Record<string, unknown>;
  updated_by: UUID | null;
  updated_at: Timestamp;
  created_at: Timestamp;
}

export interface Camera {
  id: UUID;
  name: string;
  external_id: string | null;
  camera_type: CameraType;
  status: CameraStatus;
  position: GeoPoint | null;
  sector_id: UUID | null;
  sub_sector_id: UUID | null;
  capabilities: string[];
  last_seen_at: Timestamp | null;
  metadata: Record<string, unknown>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Role {
  id: UUID;
  slug: AdminRole;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  created_at: Timestamp;
}

export interface AdminUser {
  id: UUID;
  auth_user_id: UUID | null;
  email: string;
  display_name: string;
  role_id: UUID;
  is_active: boolean;
  last_login_at: Timestamp | null;
  provisioned_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Joined
  role?: Role;
}

// ============================================================
// APP TYPES (not DB-backed)
// ============================================================
export interface NavigationRoute {
  coordinates: [number, number][];
  distance_meters: number;
  duration_seconds: number;
  steps: NavigationStep[];
  provider: string;
  is_mock?: boolean;
  /** True if the route was found to pass through one or more active closures */
  closure_conflict?: boolean;
  /** Names of closures the route conflicts with (for user display) */
  affected_closure_titles?: string[];
}

export interface NavigationStep {
  instruction: string;
  instruction_te: string;
  distance_meters: number;
  duration_seconds: number;
  coordinate: [number, number];
  /** OSRM maneuver type string (depart, turn, arrive, etc.) */
  maneuver: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  /** Speed in m/s from GPS (may be null) */
  speed?: number | null;
  /** Compass heading in degrees (0=North) from GPS (may be null) */
  heading?: number | null;
}

export type LocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable' | 'timeout';

export interface AppError {
  code: string;
  message: string;
  detail?: string;
}

// Language
export type Locale = 'en' | 'te';
