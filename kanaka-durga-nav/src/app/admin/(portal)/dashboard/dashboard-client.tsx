'use client';

/**
 * AdminDashboardClient — Phase 2 Map-First Redesign
 *
 * Layout:
 *   - Full-width Live Map (Leaflet) in the hero position
 *   - Below: KPI summary cards + operational panels side-by-side
 *   - Data driven via TanStack Query + Supabase Realtime hooks
 */

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  useEmergencyIncidents,
  useAdminParkingStatus,
  useActiveClosures,
  useAnnouncements,
  useLocations,
  useSectors,
} from '@/hooks/use-data';
import {
  AlertTriangle, Car, Megaphone, GitBranch,
  CheckCircle, MapPin, Layers, Filter, Eye,
  Utensils, Bus, Clock,
} from 'lucide-react';
import { PARKING_STATUS_CONFIG, cn } from '@/lib/utils';
import type { ParkingAvailabilityStatus, Location } from '@/types';
import { formatDistanceToNow } from 'date-fns';

// Lazy-load the heavy Leaflet map only on the client
const MapView = dynamic(
  () => import('@/components/map/map-view').then((m) => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center rounded-2xl"
        style={{ background: 'var(--color-surface-secondary)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Loading Live Map…
          </span>
        </div>
      </div>
    ),
  }
);

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All', icon: Filter },
  { id: 'darshan', label: 'Queues', icon: Eye },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'medical', label: 'Medical', icon: AlertTriangle },
  { id: 'food', label: 'Annadanam', icon: Utensils },
  { id: 'bus', label: 'Shuttles', icon: Bus },
];

export function AdminDashboardClient() {
  // — Operational data
  const { data: incidents = [] } = useEmergencyIncidents();
  const { data: parkingStatus = [] } = useAdminParkingStatus();
  const { data: closures = [] } = useActiveClosures();
  const { data: announcements = [] } = useAnnouncements();
  const { data: allLocations = [] } = useLocations();
  const { data: sectors = [] } = useSectors();

  // — Map controls
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // — Derived counts
  const openIncidents = incidents.filter((i) => i.status === 'OPEN').length;
  const respondingIncidents = incidents.filter((i) => i.status === 'RESPONDING').length;
  const activeClosures = closures.filter((c) => c.status === 'ACTIVE').length;
  const activeAnnouncements = announcements.filter((a) => a.status === 'ACTIVE').length;

  // — Filtered map locations
  const filteredLocations = useMemo(() => {
    return allLocations.filter((l) => {
      const matchCat = selectedCategory === 'all' || l.category?.slug === selectedCategory;
      const matchSec =
        selectedSector === 'all' ||
        l.sector_id === selectedSector ||
        (l.sector as { id?: string } | null)?.id === selectedSector;
      return matchCat && matchSec;
    });
  }, [allLocations, selectedCategory, selectedSector]);

  return (
    <div className="space-y-5">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Live command overview — Sri Kanaka Durga Temple, Dasara Operations
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
          <span className="inline-flex w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
          Realtime
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Open Incidents"
          value={openIncidents}
          icon={AlertTriangle}
          alert={openIncidents > 0}
          alertColor="text-red-600 bg-red-50 border-red-200"
          neutralColor="text-green-600 bg-green-50 border-green-100"
        />
        <KpiCard
          label="Responding"
          value={respondingIncidents}
          icon={Clock}
          alertColor="text-amber-600 bg-amber-50 border-amber-200"
          neutralColor="text-gray-500 bg-gray-50 border-gray-100"
          alert={respondingIncidents > 0}
        />
        <KpiCard
          label="Active Closures"
          value={activeClosures}
          icon={GitBranch}
          alert={activeClosures > 0}
          alertColor="text-orange-600 bg-orange-50 border-orange-200"
          neutralColor="text-green-600 bg-green-50 border-green-100"
        />
        <KpiCard
          label="Announcements"
          value={activeAnnouncements}
          icon={Megaphone}
          alertColor="text-blue-600 bg-blue-50 border-blue-200"
          neutralColor="text-blue-600 bg-blue-50 border-blue-100"
          alert={activeAnnouncements > 0}
        />
      </div>

      {/* ── MAP HERO ────────────────────────────────────── */}
      <section className="card overflow-hidden" style={{ padding: 0 }}>
        {/* Map toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          {/* Category filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORY_FILTERS.map(({ id, label, icon: Icon }) => {
              const isActive = selectedCategory === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedCategory(id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                  style={isActive
                    ? { background: 'var(--color-primary)', color: 'white', border: '1px solid var(--color-primary)' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                  }
                >
                  <Icon size={12} />
                  {label}
                  <span className="text-[10px] px-1 rounded-full font-bold"
                    style={isActive
                      ? { background: 'rgba(255,255,255,0.2)', color: 'white' }
                      : { background: 'var(--color-surface-secondary)', color: 'var(--color-text-muted)' }
                    }>
                    {id === 'all'
                      ? allLocations.length
                      : allLocations.filter(l => l.category?.slug === id).length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sector filter */}
          {sectors.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap border-l pl-2.5" style={{ borderColor: 'var(--color-border)' }}>
              <Layers size={12} style={{ color: 'var(--color-text-muted)' }} />
              <button
                onClick={() => setSelectedSector('all')}
                className="px-2 py-1 rounded text-xs font-semibold border transition-colors"
                style={selectedSector === 'all'
                  ? { background: '#b45309', color: 'white', border: '1px solid #92400e' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                }
              >
                All
              </button>
              {sectors.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSector(s.id)}
                  className="px-2 py-1 rounded text-xs font-medium border transition-colors truncate max-w-[120px]"
                  style={selectedSector === s.id
                    ? { background: '#b45309', color: 'white', border: '1px solid #92400e' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                  }
                  title={s.name}
                >
                  {s.name.replace(/Sector \d+\s*[—-]\s*/i, '')}
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {filteredLocations.length} pin{filteredLocations.length !== 1 ? 's' : ''} shown
          </div>
        </div>

        {/* The map itself */}
        <div className="grid lg:grid-cols-4 gap-0">
          <div className="lg:col-span-3 h-[52vh] relative">
            <MapView
              className="w-full h-full"
              destinations={filteredLocations}
              destination={
                selectedLocation?.position?.coordinates
                  ? { lng: selectedLocation.position.coordinates[0], lat: selectedLocation.position.coordinates[1] }
                  : undefined
              }
              onLocationClick={setSelectedLocation}
            />
            {/* Closures warning */}
            {activeClosures > 0 && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm"
                style={{ background: 'rgba(234,179,8,0.9)', color: '#713F12', border: '1px solid #CA8A04' }}>
                <AlertTriangle size={13} />
                {activeClosures} Active Route {activeClosures === 1 ? 'Closure' : 'Closures'}
              </div>
            )}
          </div>

          {/* Selected location inspector */}
          <div className="lg:col-span-1 flex flex-col p-4 overflow-y-auto max-h-[52vh]"
            style={{ borderLeft: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Facility Inspector</h3>
            </div>
            {selectedLocation ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md font-bold uppercase tracking-wide text-[10px] mb-1"
                    style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                    {selectedLocation.category?.name ?? 'Facility'}
                  </span>
                  <p className="font-bold text-sm leading-snug" style={{ color: 'var(--color-text)' }}>{selectedLocation.name}</p>
                  {selectedLocation.name_te && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-telugu)' }}>
                      {selectedLocation.name_te}
                    </p>
                  )}
                </div>
                {(selectedLocation.sector || selectedLocation.sub_sector) && (
                  <div className="rounded-xl p-2.5" style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)' }}>
                    <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] mb-1" style={{ color: 'var(--color-primary)' }}>
                      <Layers size={10} /> Zone
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      {(selectedLocation.sector as { name?: string } | null)?.name}
                    </p>
                    {(selectedLocation.sub_sector as { name?: string } | null)?.name && (
                      <p style={{ color: 'var(--color-text-muted)' }}>
                        ↳ {(selectedLocation.sub_sector as { name: string }).name}
                      </p>
                    )}
                  </div>
                )}
                {selectedLocation.description && (
                  <p className="rounded-xl p-2" style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}>
                    {selectedLocation.description}
                  </p>
                )}
                {selectedLocation.address && (
                  <p style={{ color: 'var(--color-text-muted)' }}>📍 {selectedLocation.address}</p>
                )}
                <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {selectedLocation.position?.coordinates[1]?.toFixed(4)},&nbsp;
                  {selectedLocation.position?.coordinates[0]?.toFixed(4)}
                </p>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="w-full mt-2 py-1.5 text-xs font-semibold rounded-xl border transition-colors"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2"
                  style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-muted)' }}>
                  <MapPin size={20} />
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Click any map marker to inspect facility details
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Operational Panels ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Parking Status */}
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <Car size={16} style={{ color: 'var(--color-primary)' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Parking Status</h2>
          </div>
          <div className="space-y-2">
            {parkingStatus.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No parking data</p>
            ) : parkingStatus.map((ps) => {
              const config = PARKING_STATUS_CONFIG[ps.status as ParkingAvailabilityStatus];
              const total = ps.available + ps.occupied;
              const availPct = total > 0 ? Math.round((ps.available / total) * 100) : 0;
              return (
                <div key={ps.id} className="py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate pr-2" style={{ color: 'var(--color-text)' }}>
                      {ps.parking_area?.name ?? 'Unknown'}
                    </span>
                    <span className={cn('text-[10px] font-bold', config.color)}>{ps.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-secondary)' }}>
                      <div className={cn('h-full rounded-full transition-all',
                        availPct > 30 ? 'bg-green-500' : availPct > 10 ? 'bg-amber-500' : 'bg-red-500'
                      )} style={{ width: `${availPct}%` }} />
                    </div>
                    <span className="text-[11px] font-mono w-16 text-right" style={{ color: 'var(--color-text-muted)' }}>
                      {ps.available}/{total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Active Incidents */}
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <AlertTriangle size={16} className="text-red-600" />
            <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Active Incidents</h2>
            {openIncidents > 0 && (
              <span className="badge text-xs bg-red-100 text-red-700 border-red-200 ml-auto">{openIncidents} open</span>
            )}
          </div>
          <div className="space-y-2">
            {incidents.length === 0 ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                <CheckCircle size={15} />
                No active incidents
              </div>
            ) : incidents.slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className={cn(
                  'badge border text-[10px] shrink-0 mt-0.5',
                  incident.status === 'OPEN' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                )}>
                  {incident.status}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{incident.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Route Closures */}
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <GitBranch size={16} className="text-amber-600" />
            <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Route Closures</h2>
          </div>
          <div className="space-y-2">
            {closures.length === 0 ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                <CheckCircle size={15} />
                No active closures
              </div>
            ) : closures.slice(0, 5).map((closure) => (
              <div key={closure.id} className="py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold truncate pr-2" style={{ color: 'var(--color-text)' }}>{closure.title}</p>
                  <span className={cn(
                    'badge border text-[10px]',
                    closure.status === 'ACTIVE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                  )}>
                    {closure.status}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
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

/* ── KPI Card ──────────────────────────────────────────────── */
function KpiCard({
  label, value, icon: Icon, alert, alertColor, neutralColor,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  alert: boolean;
  alertColor: string;
  neutralColor: string;
}) {
  const classes = alert ? alertColor : neutralColor;
  return (
    <div className={cn('card p-4', alert && 'border-opacity-50')}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3 border', classes)}>
        <Icon size={17} aria-hidden />
      </div>
      <p className="text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  );
}
