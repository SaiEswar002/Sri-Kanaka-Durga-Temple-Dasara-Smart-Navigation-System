import type { Metadata } from 'next';
import { AdminDashboardClient } from './dashboard-client';

export const metadata: Metadata = { title: 'Dashboard — Admin' };

/**
 * AdminDashboardPage
 *
 * This is a server component shell.
 * All data fetching and realtime subscriptions are handled client-side
 * by AdminDashboardClient via TanStack Query + Supabase Realtime hooks.
 * This allows live dashboard updates when data changes in the database.
 */
export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
