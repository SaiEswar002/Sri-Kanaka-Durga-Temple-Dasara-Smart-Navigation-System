import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { AdminDashboardClient } from './dashboard-client';

export const metadata: Metadata = { title: 'Dashboard — Admin' };

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Fetch initial data server-side for fast first render
  const [
    { data: sectors },
    { data: announcements },
    { data: incidents },
    { data: closures },
    { data: parkingStatus },
  ] = await Promise.all([
    supabase.from('sectors').select('id, name, crowd_level, status').order('display_order'),
    supabase.from('announcements').select('id, title, priority, status').eq('status', 'ACTIVE').limit(5),
    supabase.from('emergency_incidents').select('*').in('status', ['OPEN', 'RESPONDING']).order('created_at', { ascending: false }).limit(10),
    supabase.from('route_closures').select('*').in('status', ['SCHEDULED', 'ACTIVE']).order('created_at', { ascending: false }).limit(5),
    supabase.from('parking_status').select('*, parking_area:parking_areas(name)').order('updated_at', { ascending: false }),
  ]);

  return (
    <AdminDashboardClient
      sectors={sectors ?? []}
      announcements={announcements ?? []}
      incidents={incidents ?? []}
      closures={closures ?? []}
      parkingStatus={parkingStatus ?? []}
    />
  );
}
