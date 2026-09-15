import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { AdminDashboardClient } from './dashboard-client';
import type { EmergencyIncident, RouteClosure, CrowdLevel, ParkingAvailabilityStatus } from '@/types';

export const metadata: Metadata = { title: 'Dashboard — Admin' };

const DEMO_SECTORS = [
  { id: 'sec-1', name: 'Sector 1 — Main Sanctum & Mallikarjuna Mandapam', crowd_level: 'HIGH' as CrowdLevel, status: 'ACTIVE' },
  { id: 'sec-2', name: 'Sector 2 — Ghat Road Queue Complex', crowd_level: 'CRITICAL' as CrowdLevel, status: 'ACTIVE' },
  { id: 'sec-3', name: 'Sector 3 — Kanaka Durga Nagar & Toll Gate', crowd_level: 'MEDIUM' as CrowdLevel, status: 'ACTIVE' },
  { id: 'sec-4', name: 'Sector 4 — Krishna River Bathing Ghats', crowd_level: 'LOW' as CrowdLevel, status: 'ACTIVE' },
  { id: 'sec-5', name: 'Sector 5 — Model Guest House & Admin Zone', crowd_level: 'LOW' as CrowdLevel, status: 'ACTIVE' },
];

const DEMO_ANNOUNCEMENTS = [
  { id: 'ann-1', title: 'Special queue operational for senior citizens and differently abled pilgrims', priority: 'HIGH', status: 'ACTIVE' },
  { id: 'ann-2', title: 'Free prasadam counters open at Sector 3 Annadanam Hall', priority: 'NORMAL', status: 'ACTIVE' },
  { id: 'ann-3', title: 'Free RTC shuttle buses running every 5 mins from Bhavani Ghat', priority: 'NORMAL', status: 'ACTIVE' },
];

const DEMO_INCIDENTS: EmergencyIncident[] = [
  {
    id: 'inc-1',
    title: 'Medical Assistance — Pilgrim fainting near Gate 3',
    status: 'RESPONDING',
    priority: 'HIGH',
    incident_type: 'MEDICAL',
    reported_by: 'Sector 1 Security Guard',
    assigned_to: '108 Ambulance Unit 2',
    description: 'Elderly devotee felt dizzy due to queue congestion. Paramedics on site.',
    location_text: 'Near Gate 3 / Queue 1',
    position: null,
    sector_id: null,
    sub_sector_id: null,
    response_notes: 'First aid rendered, vitals normal.',
    resolved_at: null,
    resolution_time_minutes: null,
    created_by: null,
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    is_demo_data: true,
  },
  {
    id: 'inc-2',
    title: 'Crowd slowdown reported at Ghat Road curve 3',
    status: 'OPEN',
    priority: 'MEDIUM',
    incident_type: 'CROWD_CRUSH',
    reported_by: 'Camera AI Sector 2',
    assigned_to: null,
    description: 'Queue speed dropped below normal threshold. Monitoring closely.',
    location_text: 'Ghat Road curve 3',
    position: null,
    sector_id: null,
    sub_sector_id: null,
    response_notes: null,
    resolved_at: null,
    resolution_time_minutes: null,
    created_by: null,
    created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    is_demo_data: true,
  },
];

const DEMO_CLOSURES: RouteClosure[] = [
  {
    id: 'cls-1',
    title: 'Ghat Road Private Vehicle Movement Suspended',
    title_te: 'ఘాట్ రోడ్డు ప్రైవేట్ వాహన రాకపోకలు తాత్కాలికంగా నిలిపివేత',
    status: 'ACTIVE',
    closure_type: 'VEHICLE',
    start_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    reason: 'Dasara Vahana Seva procession route clearance',
    reason_te: 'దసరా వాహన సేవ ఊరేగింపు క్లియరెన్స్',
    affected_area: null,
    closure_line: null,
    waypoints: null,
    sector_id: null,
    sub_sector_id: null,
    created_by: null,
    is_demo_data: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_PARKING = [
  { id: 'pk-1', occupied: 380, available: 120, status: 'AVAILABLE' as ParkingAvailabilityStatus, updated_at: new Date().toISOString(), parking_area: { name: 'Bhavani Ghat Parking' } },
  { id: 'pk-2', occupied: 280, available: 20, status: 'FILLING' as ParkingAvailabilityStatus, updated_at: new Date().toISOString(), parking_area: { name: 'Punnami Ghat Parking' } },
  { id: 'pk-3', occupied: 150, available: 0, status: 'FULL' as ParkingAvailabilityStatus, updated_at: new Date().toISOString(), parking_area: { name: 'Kummaripalem Parking' } },
  { id: 'pk-4', occupied: 95, available: 105, status: 'AVAILABLE' as ParkingAvailabilityStatus, updated_at: new Date().toISOString(), parking_area: { name: 'RTC Bus Stand Zone' } },
];

export default async function AdminDashboardPage() {
  let sectors: Array<{ id: string; name: string; crowd_level: CrowdLevel; status: string }> = [];
  let announcements: Array<{ id: string; title: string; priority: string; status: string }> = [];
  let incidents: EmergencyIncident[] = [];
  let closures: RouteClosure[] = [];
  let parkingStatus: Array<{ id: string; occupied: number; available: number; status: ParkingAvailabilityStatus; updated_at: string; parking_area?: { name: string } | null }> = [];

  try {
    const supabase = await createServerSupabaseClient();

    // Fetch initial data server-side for fast first render
    const [
      sectorsRes,
      announcementsRes,
      incidentsRes,
      closuresRes,
      parkingRes,
    ] = await Promise.all([
      supabase.from('sectors').select('id, name, crowd_level, status').order('display_order'),
      supabase.from('announcements').select('id, title, priority, status').eq('status', 'ACTIVE').limit(5),
      supabase.from('emergency_incidents').select('*').in('status', ['OPEN', 'RESPONDING']).order('created_at', { ascending: false }).limit(10),
      supabase.from('route_closures').select('*').in('status', ['SCHEDULED', 'ACTIVE']).order('created_at', { ascending: false }).limit(5),
      supabase.from('parking_status').select('*, parking_area:parking_areas(name)').order('updated_at', { ascending: false }),
    ]);

    sectors = (sectorsRes.data && sectorsRes.data.length > 0) ? (sectorsRes.data as typeof sectors) : DEMO_SECTORS;
    announcements = (announcementsRes.data && announcementsRes.data.length > 0) ? announcementsRes.data : DEMO_ANNOUNCEMENTS;
    incidents = (incidentsRes.data && incidentsRes.data.length > 0) ? (incidentsRes.data as EmergencyIncident[]) : DEMO_INCIDENTS;
    closures = (closuresRes.data && closuresRes.data.length > 0) ? (closuresRes.data as RouteClosure[]) : DEMO_CLOSURES;
    parkingStatus = (parkingRes.data && parkingRes.data.length > 0) ? (parkingRes.data as typeof parkingStatus) : DEMO_PARKING;
  } catch {
    // If Supabase is unreachable or queries fail, fallback gracefully to rich demo data
    sectors = DEMO_SECTORS;
    announcements = DEMO_ANNOUNCEMENTS;
    incidents = DEMO_INCIDENTS;
    closures = DEMO_CLOSURES;
    parkingStatus = DEMO_PARKING;
  }

  return (
    <AdminDashboardClient
      sectors={sectors}
      announcements={announcements}
      incidents={incidents}
      closures={closures}
      parkingStatus={parkingStatus}
    />
  );
}

