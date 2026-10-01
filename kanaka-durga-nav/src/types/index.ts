// Core database types matching our Supabase schema exactly
// Phase 2: Simplified sector/sub-sector/location models

export type UUID = string;
export type Timestamp = string; // ISO 8601

// ============================================================
// ENUMS
// ============================================================
export type ParkingType = 'PUBLIC' | 'RESERVED' | 'EMERGENCY' | 'SHUTTLE';
export type ParkingAvailabilityStatus = 'AVAILABLE' | 'FILLING' | 'FULL' | 'CLOSED' | 'UNKNOWN';
export type DataSource = 'MANUAL' | 'CAMERA' | 'SENSOR' | 'ESTIMATE';
export type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'FACILITY_MANAGER' | 'VIEW_ONLY';
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
// CORE DB TYPES — Simplified models
// ============================================================

/**
 * Sector — identity/information only.
 * No operational fields (status, crowd, coordinates, order).
 */
export interface Sector {
  id: UUID;
  name: string;       // English name
  name_te: string;    // Telugu name
  description: string | null;
  description_te: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * SubSector — identity/information + parent sector FK.
 * No operational fields.
 */
export interface SubSector {
  id: UUID;
  sector_id: UUID;
  name: string;       // English name
  name_te: string;    // Telugu name
  description: string | null;
  description_te: string | null;
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

/**
 * Location — the spatial entity used by map and navigation.
 * latitude/longitude stored via PostGIS 'position' column.
 * Removed: contact, status, operating_hours, accessibility, display_order.
 */
export interface Location {
  id: UUID;
  name: string;
  name_te: string;
  category_id: UUID;
  sector_id: UUID | null;
  sub_sector_id: UUID | null;
  position: GeoPoint;   // [lng, lat] — required for map markers
  description: string | null;
  address: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  // Joined
  category?: LocationCategory;
  sector?: Sector | null;
  sub_sector?: SubSector | null;
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

/**
 * Normal User Profile (Pilgrim user stored in public.profiles)
 */
export interface UserProfile {
  id: UUID;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  preferred_language: 'en' | 'te';
  metadata?: Record<string, unknown>;
  created_at: Timestamp;
  updated_at: Timestamp;
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
