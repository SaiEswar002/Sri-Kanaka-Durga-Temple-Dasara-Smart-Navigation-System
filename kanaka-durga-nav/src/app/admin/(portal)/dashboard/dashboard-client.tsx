'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle, Car, Users, Megaphone, GitBranch,
  CheckCircle, Clock, TrendingUp
} from 'lucide-react';
import { CROWD_LEVEL_CONFIG, PARKING_STATUS_CONFIG, cn } from '@/lib/utils';
import type { Sector, Announcement, EmergencyIncident, RouteClosure, CrowdLevel, ParkingAvailabilityStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface AdminDashboardClientProps {
  sectors: Array<{ id: string; name: string; crowd_level: CrowdLevel; status: string }>;
  announcements: Array<{ id: string; title: string; priority: string; status: string }>;
  incidents: EmergencyIncident[];
  closures: RouteClosure[];
  parkingStatus: Array<{ id: string; occupied: number; available: number; status: ParkingAvailabilityStatus; updated_at: string; parking_area?: { name: string } | null }>;
}

const supabase = createClient();

export function AdminDashboardClient({ sectors, announcements, incidents, closures, parkingStatus }: AdminDashboardClientProps) {
  const queryClient = useQueryClient();

  // Set up realtime to invalidate on changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crowd_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['crowd_status'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['parking_areas'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_incidents' }, () => {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const openIncidents = incidents.filter((i) => i.status === 'OPEN').length;
  const respondingIncidents = incidents.filter((i) => i.status === 'RESPONDING').length;
  const activeClosures = closures.filter((c) => c.status === 'ACTIVE').length;
  const activeAnnouncements = announcements.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-(--color-text)">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">
          Live overview — Sri Kanaka Durga Temple Dasara Operations
        </p>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Open Incidents"
          value={openIncidents}
          icon={AlertTriangle}
          color={openIncidents > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}
          alert={openIncidents > 0}
        />
        <SummaryCard
          label="Active Closures"
          value={activeClosures}
          icon={GitBranch}
          color={activeClosures > 0 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'}
        />
        <SummaryCard
          label="Announcements"
          value={activeAnnouncements}
          icon={Megaphone}
          color="text-blue-600 bg-blue-50"
        />
        <SummaryCard
          label="Responding"
          value={respondingIncidents}
          icon={CheckCircle}
          color="text-purple-600 bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ===== CROWD STATUS ===== */}
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-primary" aria-hidden />
            <h2 className="font-bold">Crowd Status by Sector</h2>
          </div>
          <div className="space-y-2">
            {sectors.length === 0 && (
              <p className="text-sm text-text-muted">No sector data</p>
            )}
            {sectors.map((sector) => {
              const config = CROWD_LEVEL_CONFIG[sector.crowd_level as CrowdLevel];
              return (
                <div key={sector.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium truncate pr-3">{sector.name}</span>
                  <span className={cn('badge border text-xs', config.bg, config.color)}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== PARKING STATUS ===== */}
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Car size={18} className="text-primary" aria-hidden />
            <h2 className="font-bold">Parking Status</h2>
          </div>
          <div className="space-y-2">
            {parkingStatus.length === 0 && (
              <p className="text-sm text-text-muted">No parking data</p>
            )}
            {parkingStatus.map((ps) => {
              const config = PARKING_STATUS_CONFIG[ps.status];
              const pct = ps.available + ps.occupied > 0
                ? Math.round((ps.available / (ps.available + ps.occupied)) * 100)
                : 0;
              return (
                <div key={ps.id} className="py-2 border-b border-border last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{ps.parking_area?.name ?? 'Unknown'}</span>
                    <span className={cn('text-xs font-semibold', config.color)}>{ps.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', pct > 30 ? 'bg-green-500' : pct > 10 ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted w-16 text-right">
                      {ps.available}/{ps.available + ps.occupied}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== ACTIVE INCIDENTS ===== */}
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-600" aria-hidden />
            <h2 className="font-bold">Active Incidents</h2>
            {openIncidents > 0 && (
              <span className="badge bg-red-100 text-red-700 border-red-200">{openIncidents} open</span>
            )}
          </div>
          <div className="space-y-2">
            {incidents.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} />
                No active incidents
              </div>
            ) : incidents.slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <span className={cn(
                  'badge border text-xs shrink-0',
                  incident.status === 'OPEN' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                )}>
                  {incident.status}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{incident.title}</p>
                  <p className="text-xs text-text-muted">
                    {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== ROUTE CLOSURES ===== */}
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch size={18} className="text-amber-600" aria-hidden />
            <h2 className="font-bold">Route Closures</h2>
          </div>
          <div className="space-y-2">
            {closures.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} />
                No active closures
              </div>
            ) : closures.map((closure) => (
              <div key={closure.id} className="py-2 border-b border-border last:border-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate pr-2">{closure.title}</p>
                  <span className={cn(
                    'badge border text-xs',
                    closure.status === 'ACTIVE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                  )}>
                    {closure.status}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {closure.closure_type} · {formatDistanceToNow(new Date(closure.start_time), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, icon: Icon, color, alert = false
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={cn('card p-4', alert && 'border-red-200')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon size={20} aria-hidden />
      </div>
      <p className="text-3xl font-extrabold text-(--color-text)">{value}</p>
      <p className="text-sm text-text-muted mt-1">{label}</p>
    </div>
  );
}
