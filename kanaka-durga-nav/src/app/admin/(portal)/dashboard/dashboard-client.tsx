'use client';

/**
 * AdminDashboardClient — Phase 2.1 Pure Map-First Dashboard
 *
 * Layout:
 *   HEADER (title + realtime indicator)
 *   FILTER BAR (Category ▼ | Sector ▼ | Sub-Sector ▼)  ← DB-driven, realtime
 *   LARGE LEAFLET MAP (dominant element, ~65vh)
 *   FACILITY INSPECTOR (slides in below map on selection)
 *
 * NO KPI cards. NO Parking panel. NO Incidents panel. NO Closures panel.
 * Those live on their own dedicated admin pages.
 */

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  useLocations,
  useSectors,
  useSubSectors,
  useLocationCategories,
} from '@/hooks/use-data';
import {
  ChevronDown, X, Filter, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Location, LocationCategory, Sector, SubSector } from '@/types';

const supabase = createClient();

// ── Lazy-load Leaflet (client only) ─────────────────────────────────
const MapView = dynamic(
  () => import('@/components/map/map-view').then((m) => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: 'var(--color-surface-secondary)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-2"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Loading Map…
          </span>
        </div>
      </div>
    ),
  }
);

// ── Dashboard client ─────────────────────────────────────────────────
export function AdminDashboardClient() {
  const queryClient = useQueryClient();

  // ── Filter state ─────────────────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState('');   // '' = all
  const [sectorFilter, setSectorFilter]     = useState('');   // '' = all
  // Sub-sector filter: tracks user choice but is auto-cleared when sector changes
  const [subSectorRaw, setSubSectorRaw] = useState<{ sectorId: string; value: string } | null>(null);

  // The effective sub-sector filter: only valid when it belongs to the current sector
  const subSectorFilter = (subSectorRaw?.sectorId === sectorFilter) ? (subSectorRaw?.value ?? '') : '';

  // ── Data ─────────────────────────────────────────────────────────
  const { data: categories = [] } = useLocationCategories();
  const { data: sectors = [] }    = useSectors();
  const { data: allSubSectors = [] } = useSubSectors();   // all, not filtered

  // Sub-sectors available for the chosen sector
  const availableSubSectors = useMemo(
    () => sectorFilter
      ? allSubSectors.filter((ss) => ss.sector_id === sectorFilter)
      : allSubSectors,
    [allSubSectors, sectorFilter]
  );

  // All locations (no categorySlug filter — we filter client-side for combined filtering)
  const { data: allLocations = [], isLoading: locsLoading } = useLocations();

  // ── Map filter: apply category + sector + sub-sector ─────────────
  const filteredLocations = useMemo(() => {
    return allLocations.filter((l) => {
      const matchCat = !categoryFilter || l.category?.slug === categoryFilter ||
        l.category_id === categoryFilter;
      const matchSec = !sectorFilter ||
        l.sector_id === sectorFilter ||
        (l.sector as { id?: string } | null)?.id === sectorFilter;
      const matchSub = !subSectorFilter ||
        l.sub_sector_id === subSectorFilter ||
        (l.sub_sector as { id?: string } | null)?.id === subSectorFilter;
      return matchCat && matchSec && matchSub;
    });
  }, [allLocations, categoryFilter, sectorFilter, subSectorFilter]);

  // ── Selected location for inspector ──────────────────────────────
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // ── Realtime: subscribe to location/sector/sub-sector changes ────
  useEffect(() => {
    const ch = supabase.channel('dashboard_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        queryClient.invalidateQueries({ queryKey: ['sub_sectors'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_sectors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sub_sectors'] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [queryClient]);

  // ── Helpers ───────────────────────────────────────────────────────
  function clearFilters() {
    setCategoryFilter('');
    setSectorFilter('');
    setSubSectorRaw(null);
  }

  const hasFilters = !!(categoryFilter || sectorFilter || subSectorFilter);

  return (
    <div className="flex flex-col gap-3 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Live Temple Map
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Sri Kanaka Durga Temple · Dasara Operations Command
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full"
          style={{ background: '#F0FDF4', color: '#16a34a', border: '1px solid #86EFAC' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: '#16a34a' }} />
          Realtime
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div
        className="mx-4 sm:mx-6 lg:mx-8 rounded-xl p-3 flex flex-wrap items-center gap-2"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <Filter size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />

        {/* Category Dropdown */}
        <FilterSelect
          id="dash-category-filter"
          label="All Categories"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />

        {/* Sector Dropdown */}
        <FilterSelect
          id="dash-sector-filter"
          label="All Sectors"
          value={sectorFilter}
          onChange={setSectorFilter}
          options={sectors.map((s) => ({ value: s.id, label: s.name }))}
        />

        {/* Sub-Sector Dropdown — disabled when no sector selected */}
        <FilterSelect
          id="dash-subsector-filter"
          label={sectorFilter ? 'All Sub-Sectors' : 'Sub-Sector (select sector first)'}
          value={subSectorFilter}
          onChange={(v) => setSubSectorRaw(v ? { sectorId: sectorFilter, value: v } : null)}
          options={availableSubSectors.map((ss) => ({ value: ss.id, label: ss.name }))}
          disabled={!sectorFilter}
        />

        {/* Clear button */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ml-auto"
            style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid #FECACA' }}
            id="dash-clear-filters-btn"
          >
            <X size={11} />
            Clear
          </button>
        )}

        {/* Pin count */}
        <span
          className={cn('text-xs font-medium', !hasFilters && 'ml-auto')}
          style={{ color: 'var(--color-text-muted)' }}
        >
          {locsLoading
            ? <span className="flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Loading…</span>
            : <>{filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}</>
          }
        </span>
      </div>

      {/* ── Map ──────────────────────────────────────────────────── */}
      <div
        className="mx-4 sm:mx-6 lg:mx-8 rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)', height: 'calc(100vh - 220px)', minHeight: '420px', maxHeight: '72vh' }}
      >
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
      </div>

      {/* ── Facility Inspector ────────────────────────────────────── */}
      {selectedLocation && (
        <div
          className="mx-4 sm:mx-6 lg:mx-8 rounded-2xl p-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Left: identity */}
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)' }}
              >
                {categoryEmoji((selectedLocation.category as LocationCategory | null)?.slug)}
              </div>
              <div className="min-w-0">
                {/* Category badge */}
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-1"
                  style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
                >
                  {(selectedLocation.category as LocationCategory | null)?.name ?? 'Facility'}
                </span>
                <p className="font-bold text-sm leading-snug" style={{ color: 'var(--color-text)' }}>
                  {selectedLocation.name}
                </p>
                {selectedLocation.name_te && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-telugu)' }}>
                    {selectedLocation.name_te}
                  </p>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelectedLocation(null)}
              className="p-1.5 rounded-lg shrink-0 transition-colors"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-secondary)' }}
              aria-label="Close inspector"
            >
              <X size={14} />
            </button>
          </div>

          {/* Detail grid */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Sector */}
            {(selectedLocation.sector || (selectedLocation.sector as Sector | null)?.name) && (
              <InspectorField
                label="Sector"
                value={(selectedLocation.sector as Sector | null)?.name ?? '—'}
              />
            )}
            {/* Sub-Sector */}
            {(selectedLocation.sub_sector as SubSector | null)?.name && (
              <InspectorField
                label="Sub-Sector"
                value={(selectedLocation.sub_sector as SubSector | null)?.name ?? '—'}
              />
            )}
            {/* Coordinates */}
            {selectedLocation.position?.coordinates && (
              <InspectorField
                label="Coordinates"
                value={`${selectedLocation.position.coordinates[1].toFixed(5)}, ${selectedLocation.position.coordinates[0].toFixed(5)}`}
                mono
              />
            )}
            {/* Address */}
            {selectedLocation.address && (
              <InspectorField label="Address" value={selectedLocation.address} />
            )}
          </div>

          {/* Description */}
          {selectedLocation.description && (
            <p
              className="mt-3 text-xs leading-relaxed rounded-xl px-3 py-2"
              style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
            >
              {selectedLocation.description}
            </p>
          )}
        </div>
      )}

      {/* Bottom spacing */}
      <div className="h-4" />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

function FilterSelect({ id, label, value, onChange, options, disabled }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none pr-7 pl-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
        style={{
          background: value ? 'var(--color-primary)' : 'var(--color-surface)',
          color: value ? 'white' : 'var(--color-text-secondary)',
          border: `1px solid ${value ? 'var(--color-primary)' : 'var(--color-border)'}`,
          opacity: disabled ? 0.5 : 1,
          minWidth: '140px',
          maxWidth: '200px',
        }}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: value ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}
      />
    </div>
  );
}

function InspectorField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p
        className={cn('text-xs font-semibold truncate', mono && 'font-mono text-[10px]')}
        style={{ color: 'var(--color-text)' }}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function categoryEmoji(slug?: string | null): string {
  switch (slug) {
    case 'darshan':  return '🛕';
    case 'parking':  return '🅿️';
    case 'food':     return '🍲';
    case 'medical':  return '➕';
    case 'bus':      return '🚌';
    case 'ghat':     return '🌊';
    default:         return '📍';
  }
}
