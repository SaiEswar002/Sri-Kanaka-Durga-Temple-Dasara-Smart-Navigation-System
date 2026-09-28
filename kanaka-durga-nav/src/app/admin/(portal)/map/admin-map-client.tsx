'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useLocations, useActiveClosures, useSectors } from '@/hooks/use-data';
import type { Location } from '@/types';
import { Eye, Car, Plus, Utensils, Bus, Filter, AlertTriangle, MapPin, Layers } from 'lucide-react';

const MapView = dynamic(
  () => import('@/components/map/map-view').then((m) => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] bg-gray-100 flex items-center justify-center rounded-2xl border border-gray-200">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-gray-500 font-semibold">Loading Admin Live Map...</span>
        </div>
      </div>
    ),
  }
);

export function AdminMapClient() {
  const { data: allLocations } = useLocations();
  const { data: closures } = useActiveClosures();
  const { data: sectors } = useSectors();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const filteredLocations = useMemo(() => {
    if (!allLocations) return [];
    return allLocations.filter((l) => {
      const matchCat = selectedCategory === 'all' || l.category?.slug === selectedCategory;
      const matchSec =
        selectedSector === 'all' ||
        l.sector_id === selectedSector ||
        (l.sector as { id?: string; slug?: string } | null)?.id === selectedSector ||
        (l.sector as { id?: string; slug?: string } | null)?.slug === selectedSector;
      return matchCat && matchSec;
    });
  }, [allLocations, selectedCategory, selectedSector]);

  const FILTERS = [
    { id: 'all', label: 'All Facilities', icon: Filter },
    { id: 'darshan', label: 'Queues & Darshan', icon: Eye },
    { id: 'parking', label: 'Parking Grounds', icon: Car },
    { id: 'medical', label: 'Medical & SOS', icon: Plus },
    { id: 'food', label: 'Annadanam', icon: Utensils },
    { id: 'bus', label: 'RTC Shuttles', icon: Bus },
  ];

  return (
    <div className="space-y-4">
      {/* Filters Bar: Categories & Sectors */}
      <div className="space-y-2.5">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Filter size={13} /> Category:
          </span>
          {FILTERS.map(({ id, label, icon: Icon }) => {
            const isActive = selectedCategory === id;
            return (
              <button
                key={id}
                onClick={() => setSelectedCategory(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
                  isActive
                    ? 'bg-[#9b1b30] text-white border-[#7a1425] shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-amber-300' : 'text-gray-500'} />
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {id === 'all'
                    ? allLocations?.length ?? 0
                    : allLocations?.filter((l) => l.category?.slug === id).length ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sector Filter Pills */}
        {sectors && sectors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
              <Layers size={13} /> Sector:
            </span>
            <button
              onClick={() => setSelectedSector('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                selectedSector === 'all'
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Sectors ({allLocations?.length ?? 0})
            </button>
            {sectors.map((s) => {
              const count = allLocations?.filter((l) => l.sector_id === s.id || (l.sector as { id?: string } | null)?.id === s.id).length ?? 0;
              const isActive = selectedSector === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSector(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white border-amber-700 font-semibold shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className={`text-[10px] px-1 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 h-[72vh] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative bg-gray-50">
          <MapView
            className="w-full h-full"
            destinations={filteredLocations}
            destination={
              selectedLocation?.position?.coordinates
                ? {
                    lng: selectedLocation.position.coordinates[0],
                    lat: selectedLocation.position.coordinates[1],
                  }
                : undefined
            }
            onLocationClick={(loc) => setSelectedLocation(loc)}
          />

          {/* Closures Banner */}
          {(closures?.length ?? 0) > 0 && (
            <div className="absolute top-3 left-3 z-10 bg-amber-500/90 text-amber-950 backdrop-blur-xs px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-400 shadow-sm flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-950" />
              <span>{closures!.length} Active Route Advisory In Effect</span>
            </div>
          )}
        </div>

        {/* Selected Facility Inspector */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm h-[72vh] overflow-y-auto flex flex-col">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
            <MapPin size={18} className="text-[#9b1b30]" />
            <h3 className="font-bold text-sm text-gray-900">Facility Inspector</h3>
          </div>

          {selectedLocation ? (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {selectedLocation.category?.name ?? 'Facility'}
                </span>
                <h4 className="font-bold text-base text-gray-900 mt-1 leading-snug">
                  {selectedLocation.name}
                </h4>
                {selectedLocation.name_te && (
                  <p className="text-xs text-gray-500 font-medium">{selectedLocation.name_te}</p>
                )}
              </div>

              {/* Sector & Sub-Sector Info */}
              {(selectedLocation.sector || selectedLocation.sub_sector) && (
                <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/60 space-y-1">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <Layers size={11} /> Sector & Zone
                  </div>
                  <div className="text-xs font-bold text-gray-900">
                    {(selectedLocation.sector as { name?: string } | null)?.name ?? 'Assigned Sector'}
                  </div>
                  {(selectedLocation.sub_sector as { name?: string } | null)?.name && (
                    <div className="text-[11px] text-gray-600 font-medium">
                      ↳ Sub-Sector: {(selectedLocation.sub_sector as { name: string }).name}
                    </div>
                  )}
                </div>
              )}

              {selectedLocation.description && (
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  {selectedLocation.description}
                </p>
              )}

              <div className="space-y-1.5 text-xs text-gray-600">
                {selectedLocation.address && (
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Address:</span>
                    <span className="font-medium text-right truncate max-w-40">{selectedLocation.address}</span>
                  </div>
                )}
                {selectedLocation.contact_phone && (
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Helpline:</span>
                    <span className="font-bold text-[#9b1b30]">{selectedLocation.contact_phone}</span>
                  </div>
                )}
                {selectedLocation.operating_hours && (
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Hours:</span>
                    <span className="font-medium">{selectedLocation.operating_hours}</span>
                  </div>
                )}
                {selectedLocation.capacity && (
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Capacity:</span>
                    <span className="font-bold">{selectedLocation.capacity.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Coordinates:</span>
                  <span className="font-mono text-[11px] text-gray-500">
                    {selectedLocation.position?.coordinates[1]?.toFixed(4)}, {selectedLocation.position?.coordinates[0]?.toFixed(4)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLocation(null)}
                className="w-full mt-auto py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 mb-2">
                <MapPin size={24} />
              </div>
              <p className="text-xs font-medium text-gray-500">Click any marker on the map to inspect facility telemetry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
