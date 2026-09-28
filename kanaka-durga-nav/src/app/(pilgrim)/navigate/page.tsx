'use client';

import { useState, useCallback, useMemo, Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Navigation, MapPin, MapPinOff, ChevronRight, X, AlertCircle,
  ArrowLeft, CheckCircle2, Signal, SignalHigh, SignalLow, Crosshair,
  ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight,
  RotateCcw, Volume2, AlertTriangle, WifiOff, RefreshCw, Route,
  Search
} from 'lucide-react';
import { useLocation as useLocationData, useActiveClosures, useLocations } from '@/hooks/use-data';
import { useLiveNavigation } from '@/hooks/use-live-navigation';
import { createRoutingService } from '@/services/routing/routing-service';
import { formatDistance, formatDuration } from '@/lib/utils';
import type { NavigationRoute, LngLat, Location } from '@/types';
import { LoadingSpinner } from '@/components/shared/status-components';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Lazy load map
const MapView = dynamic(
  () => import('@/components/map/map-view').then((m) => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm font-medium">Loading Navigation Map...</span>
      </div>
    ),
  }
);

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m} min`;
  return `${s}s`;
}

function getETA(remainingSeconds: number): string {
  const now = new Date();
  now.setSeconds(now.getSeconds() + remainingSeconds);
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** Return the SVG arrow component for a maneuver type */
function ManeuverArrow({ maneuver, size = 36 }: { maneuver: string; size?: number }) {
  const cls = `text-white shrink-0`;
  switch (maneuver) {
    case 'turn left':
    case 'bear left':
      return <CornerUpLeft size={size} className={cls} />;
    case 'turn right':
    case 'bear right':
      return <CornerUpRight size={size} className={cls} />;
    case 'slight left':
      return <ArrowUpLeft size={size} className={cls} />;
    case 'slight right':
      return <ArrowUpRight size={size} className={cls} />;
    case 'uturn':
      return <RotateCcw size={size} className={cls} />;
    case 'arrive':
      return <MapPin size={size} className={cls} />;
    default:
      return <ArrowUp size={size} className={cls} />;
  }
}

function getManeuverType(maneuver: string, instruction: string): string {
  const lower = (maneuver + ' ' + instruction).toLowerCase();
  if (lower.includes('left')) return 'turn left';
  if (lower.includes('right')) return 'turn right';
  if (lower.includes('arrive')) return 'arrive';
  if (lower.includes('uturn') || lower.includes('u-turn')) return 'uturn';
  return 'straight';
}

// GPS signal indicator
function GpsSignalIcon({ accuracy }: { accuracy: number | null }) {
  if (accuracy === null) return <Signal size={12} className="text-gray-400" />;
  if (accuracy < 15) return <SignalHigh size={12} className="text-emerald-400" />;
  if (accuracy < 40) return <SignalHigh size={12} className="text-amber-400" />;
  return <SignalLow size={12} className="text-red-400" />;
}

// ─────────────────────────────────────────────────
// Google Maps-style top instruction card
// ─────────────────────────────────────────────────
interface NavTopCardProps {
  currentStep: { instruction: string; instruction_te: string; maneuver: string; distance_meters: number } | undefined;
  nextStep: { instruction: string; maneuver: string } | undefined;
  locale: string;
  accuracy: number | null;
  gpsStatus: string;
  speedKmh: number;
}

function NavTopCard({ currentStep, nextStep, locale, accuracy, gpsStatus, speedKmh }: NavTopCardProps) {
  if (!currentStep) return null;
  const maneuverType = getManeuverType(currentStep.maneuver, currentStep.instruction);
  const nextManeuverType = nextStep ? getManeuverType(nextStep.maneuver, nextStep.instruction) : null;

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ zIndex: 1100 }}>
      {/* Main instruction card — temple crimson theme */}
      <div
        className="mx-0 rounded-none shadow-2xl px-5 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg, #5c0f1d 0%, #7a1425 50%, #9b1b30 100%)' }}
      >
        <div className="flex items-center gap-4">
          {/* Arrow icon in gold ring */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,215,100,0.3)' }}
          >
            <ManeuverArrow maneuver={maneuverType} size={32} />
          </div>

          {/* Street name */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-xl leading-tight">
              {locale === 'te' ? currentStep.instruction_te : currentStep.instruction}
            </p>
            <p className="text-amber-300 text-sm font-semibold mt-0.5">
              in {formatDistance(currentStep.distance_meters)}
            </p>
          </div>

          {/* Voice button */}
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Volume2 size={18} className="text-white" />
          </button>
        </div>

        {/* "Then" preview */}
        {nextStep && nextManeuverType && (
          <div
            className="flex items-center gap-2 mt-2.5 pt-2.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
          >
            <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Then</span>
            <ManeuverArrow maneuver={nextManeuverType} size={13} />
            <span className="text-red-200 text-xs truncate">
              {locale === 'te' ? nextStep.instruction : nextStep.instruction}
            </span>
          </div>
        )}
      </div>

      {/* GPS + Speed pill */}
      <div className="flex items-center gap-2 px-3 mt-2">
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 pointer-events-none"
          style={{ background: 'rgba(90,10,20,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(155,27,48,0.4)' }}
        >
          <GpsSignalIcon accuracy={accuracy} />
          <span className="text-[10px] text-red-200 font-medium">
            {gpsStatus === 'active' && accuracy !== null ? `±${Math.round(accuracy)}m` :
             gpsStatus === 'waiting' ? 'Acquiring…' : 'GPS off'}
          </span>
          {speedKmh > 0.5 && (
            <>
              <span className="text-red-800 mx-0.5">·</span>
              <span className="text-[10px] text-amber-300 font-bold">{speedKmh.toFixed(1)} km/h</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Google Maps-style bottom nav bar
// ─────────────────────────────────────────────────
interface NavBottomBarProps {
  remainingSeconds: number;
  remainingMeters: number;
  elapsedSeconds: number;
  onStop: () => void;
  onRecentre: () => void;
  onNextStep: () => void;
  hasNextStep: boolean;
  isOffRoute: boolean;
  isRerouting: boolean;
}

function NavBottomBar({
  remainingSeconds, remainingMeters, elapsedSeconds,
  onStop, onRecentre, onNextStep, hasNextStep,
  isOffRoute, isRerouting
}: NavBottomBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 1100 }}>
      {/* Re-centre — crimson themed */}
      <div className="flex justify-start px-4 mb-2 pointer-events-none">
        <button
          onClick={onRecentre}
          className="pointer-events-auto flex items-center gap-2 text-white rounded-full px-4 py-2.5 shadow-xl text-sm font-semibold active:scale-95 transition-transform"
          style={{ background: '#7a1425', border: '1.5px solid rgba(255,215,100,0.25)', boxShadow: '0 4px 16px rgba(90,10,20,0.5)' }}
        >
          <Crosshair size={16} className="text-amber-300" />
          Re-centre
        </button>
      </div>

      {/* Off-route / Rerouting banner */}
      {(isOffRoute || isRerouting) && (
        <div
          className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold"
          style={{ background: isRerouting ? '#1d4ed8' : '#b45309', border: '1px solid rgba(255,255,255,0.2)' }}
          role="alert"
          aria-live="polite"
        >
          {isRerouting ? (
            <><RefreshCw size={16} className="text-white animate-spin" aria-hidden />
            <span className="text-white">Recalculating route…</span></>
          ) : (
            <><Route size={16} className="text-amber-200" aria-hidden />
            <span className="text-amber-100">Off route — recalculating…</span></>
          )}
        </div>
      )}

      {/* Bottom sheet — dark with crimson accent */}
      <div
        className="px-4 pt-4 pb-6"
        style={{
          background: 'linear-gradient(180deg, #1a0509 0%, #0d0203 100%)',
          borderTop: '1px solid rgba(155,27,48,0.4)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.7)'
        }}
      >
        <div className="flex items-center gap-3">
          {/* Stop — crimson X */}
          <button
            onClick={onStop}
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all"
            style={{ background: 'rgba(155,27,48,0.25)', border: '1.5px solid rgba(155,27,48,0.5)' }}
            aria-label="Stop navigation"
          >
            <X size={20} className="text-red-300" />
          </button>

          {/* Stats */}
          <div className="flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-black text-2xl leading-none">
                {formatDuration(remainingSeconds)}
              </span>
              <span className="text-amber-400 text-sm">🛕</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-red-300 text-sm font-medium">{formatDistance(remainingMeters)}</span>
              <span className="text-red-800">·</span>
              <span className="text-red-300 text-sm">{getETA(remainingSeconds)}</span>
            </div>
          </div>

          {/* Next step */}
          {hasNextStep && (
            <button
              onClick={onNextStep}
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all"
              style={{ background: 'rgba(155,27,48,0.3)', border: '1.5px solid rgba(155,27,48,0.5)' }}
              title="Next step"
              aria-label="Advance to next navigation step"
            >
              <ChevronRight size={22} className="text-amber-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// GPS acquiring overlay
// ─────────────────────────────────────────────────
function GpsAcquiringOverlay({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-3xl p-7 max-w-xs text-center shadow-2xl border border-black/5 w-full">
        <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto mb-4">
          <MapPin size={30} className="text-blue-500 animate-pulse" />
        </div>
        <h3 className="font-black text-lg text-gray-900 mb-1">Getting your location…</h3>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          Please allow location access.<br />
          Route will start from your exact position.
        </p>
        <button className="btn btn-outline w-full text-xs" onClick={onSkip}>
          Skip — use temple entrance instead
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Arrival overlay
// ─────────────────────────────────────────────────
function ArrivalOverlay({ destName, elapsedSeconds, totalMeters, onDismiss }: {
  destName: string; elapsedSeconds: number; totalMeters: number; onDismiss: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-7 max-w-xs text-center shadow-2xl border border-black/5 w-full">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle2 size={42} className="text-emerald-500" strokeWidth={1.5} />
        </div>
        <h3 className="font-black text-2xl text-gray-900 mb-1">You Arrived! 🎉</h3>
        <p className="text-sm text-gray-600 mb-1 font-semibold">{destName}</p>
        <p className="text-[13px] text-gray-500 mb-5">
          జై కనక దుర్గా! ✨<br />
          <span className="font-medium text-gray-700">
            {formatDistance(totalMeters)} in {formatElapsed(elapsedSeconds)}
          </span>
        </p>
        <button className="btn btn-primary w-full font-bold text-sm py-3" onClick={onDismiss}>
          Done / ముగించు
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Pre-navigation sidebar (shown before Start)
// ─────────────────────────────────────────────────
interface PreNavSidebarProps {
  destination: Location | null | undefined;
  allLocations: Location[];
  locale: string;
  acquiringGps: boolean;
  preAcquiredLocation: LngLat | null;
  gpsSkipped: boolean;
  routeLoading: boolean;
  routeError: string | null;
  destLngLat: LngLat | null;
  hasActiveClosures: boolean;
  onStart: () => void;
  onRequestLocation: () => void;
  onSelectDest: (id: string) => void;
  t: (key: string) => string;
  tLoc: (key: string) => string;
}

function PreNavSidebar({
  destination, allLocations, locale, acquiringGps, preAcquiredLocation,
  gpsSkipped, routeLoading, routeError, destLngLat, hasActiveClosures,
  onStart, onRequestLocation, onSelectDest, t, tLoc
}: PreNavSidebarProps) {
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');

  const sectors = useMemo(() => {
    const map = new Map<string, string>();
    allLocations.forEach((loc) => {
      const sec = loc.sector as { id?: string; name?: string } | null;
      if (sec?.id && sec?.name) {
        map.set(sec.id, sec.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allLocations]);

  const filteredLocations = useMemo(() => {
    return allLocations.filter((loc) => {
      const secId = loc.sector_id || (loc.sector as { id?: string } | null)?.id;
      const matchSector = selectedSector === 'all' || secId === selectedSector;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        loc.name.toLowerCase().includes(q) ||
        (loc.name_te && loc.name_te.toLowerCase().includes(q)) ||
        (loc.address && loc.address.toLowerCase().includes(q)) ||
        ((loc.sector as { name?: string } | null)?.name?.toLowerCase().includes(q)) ||
        ((loc.sub_sector as { name?: string } | null)?.name?.toLowerCase().includes(q));
      return matchSector && matchSearch;
    });
  }, [allLocations, selectedSector, search]);

  return (
    <div className="order-2 md:order-1 md:w-105 lg:w-115 shrink-0 bg-white border-t md:border-t-0 md:border-r border-border shadow-xl md:shadow-none z-20 flex flex-col max-h-[45dvh] md:max-h-full overflow-y-auto">
      {hasActiveClosures && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2 font-medium">
          <AlertCircle size={15} className="text-amber-600 shrink-0" />
          <span>{t('closureWarning')}</span>
        </div>
      )}

      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
        {destination ? (
          <>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                  {locale === 'te' ? 'గమ్యస్థానం' : 'Destination'}
                </span>
                <h2 className="font-black text-lg sm:text-xl text-gray-900 leading-snug mt-0.5">
                  {locale === 'te' ? destination.name_te : destination.name}
                </h2>
                {destination.address && (
                  <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{destination.address}</span>
                  </p>
                )}
                {/* Sector & Sub-Sector badges */}
                {(destination.sector || destination.sub_sector) && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {(destination.sector as { name?: string } | null)?.name && (
                      <span className="text-[11px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                        📍 {(destination.sector as { name: string }).name}
                      </span>
                    )}
                    {(destination.sub_sector as { name?: string } | null)?.name && (
                      <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">
                        ↳ {(destination.sub_sector as { name: string }).name}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => onSelectDest('')}
                className="text-xs font-semibold text-primary hover:text-primary-dark underline flex items-center gap-1 shrink-0 pt-1 cursor-pointer"
                type="button"
                title="Select a different destination"
              >
                <RotateCcw size={12} />
                <span>{locale === 'te' ? 'మార్చండి' : 'Change'}</span>
              </button>
            </div>

            {/* GPS status */}
            <div className="flex items-center gap-2 text-xs">
              {acquiringGps ? (
                <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="text-amber-600 font-medium">Acquiring GPS location…</span></>
              ) : preAcquiredLocation ? (
                <><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-emerald-700 font-medium">📍 Your location found — route starts from here</span></>
              ) : gpsSkipped ? (
                <><span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                  <span className="text-gray-500">Using temple entrance.{' '}
                    <button onClick={onRequestLocation} className="underline text-primary">Retry GPS</button></span></>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse shrink-0" />
                  <span className="text-gray-400 font-medium">Waiting for GPS…</span></>
              )}
            </div>

            {routeError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                <p className="font-bold mb-0.5">{t('routeUnavailable')}</p>
                <p>{routeError}</p>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg w-full shadow-lg text-sm font-bold flex items-center justify-center gap-2"
              onClick={onStart}
              disabled={routeLoading || !destLngLat}
              id="start-navigation-btn"
            >
              {routeLoading ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <Navigation size={18} />
              )}
              <span>
                {routeLoading
                  ? (locale === 'te' ? 'రూట్ లెక్కిస్తోంది...' : 'Calculating route...')
                  : t('startNavigation')}
              </span>
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-base text-gray-900">
                {locale === 'te' ? 'గమ్యస్థానాన్ని ఎంచుకోండి' : 'Select a Destination'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {locale === 'te' ? 'మొత్తం ప్రాంతాలు & సేవలు' : 'Choose any temple zone, queue, or facility'}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input input-sm w-full pl-8 pr-7 text-xs"
                placeholder={locale === 'te' ? 'స్థలాన్ని శోధించండి...' : 'Search facility, sector, queue...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sector Filter Chips */}
            {sectors.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSector('all')}
                  className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all ${
                    selectedSector === 'all'
                      ? 'bg-[#9b1b30] text-white font-bold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({allLocations.length})
                </button>
                {sectors.map((s: { id: string; name: string }) => {
                  const count = allLocations.filter((l: Location) => (l.sector as { id?: string } | null)?.id === s.id || l.sector_id === s.id).length;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSector(s.id)}
                      className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${
                        selectedSector === s.id
                          ? 'bg-[#9b1b30] text-white font-bold'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Location List */}
            <div className="space-y-2 max-h-[50dvh] overflow-y-auto pr-1">
              {filteredLocations.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  {locale === 'te' ? 'ఫలితాలు లేవు' : 'No destinations match your filter'}
                </div>
              ) : (
                filteredLocations.map((loc: Location) => {
                  const sectorName = (loc.sector as { name?: string } | null)?.name;
                  const subSectorName = (loc.sub_sector as { name?: string } | null)?.name;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => onSelectDest(loc.id)}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary-subtle/40 transition-all flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-primary block leading-snug">
                          {locale === 'te' ? loc.name_te : loc.name}
                        </span>
                        {loc.address && (
                          <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                            {loc.address}
                          </span>
                        )}
                        {(sectorName || subSectorName) && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {sectorName && (
                              <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                📍 {sectorName}
                              </span>
                            )}
                            {subSectorName && (
                              <span className="text-[10px] text-gray-500 font-medium">
                                ↳ {subSectorName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-primary shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border mt-auto hidden md:block">
          <Link href="/" className="text-xs text-text-muted hover:text-primary font-semibold flex items-center gap-1.5">
            <ArrowLeft size={14} />
            <span>{locale === 'te' ? 'హోమ్ పేజీకి తిరిగి వెళ్లండి' : 'Back to Home'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────
function NavigatePageContent() {
  const t = useTranslations('navigate');
  const tLoc = useTranslations('location');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = searchParams.get('location');

  const { data: destination, isLoading: destLoading } = useLocationData(locationId ?? '');
  const { data: closures } = useActiveClosures();
  const { data: allLocations } = useLocations();

  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [manualStepIdx, setManualStepIdx] = useState(0);
  const [showArrival, setShowArrival] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unavailable' | 'timeout'>('prompt');
  const [preAcquiredLocation, setPreAcquiredLocation] = useState<LngLat | null>(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [gpsSkipped, setGpsSkipped] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  // Track current destination ref for use in reroute callback
  const destLngLatRef = useRef<LngLat | null>(null);
  /** Tracks latest GPS position — updated by live nav, used in reroute callback */
  const currentLocationRef = useRef<LngLat | null>(null);

  const destLngLat: LngLat | null = destination?.position?.coordinates
    ? { lng: destination.position.coordinates[0], lat: destination.position.coordinates[1] }
    : null;

  // Keep destLngLatRef in sync for use inside reroute callback (stable ref)
  useEffect(() => { destLngLatRef.current = destLngLat; }, [destLngLat]);

  const handleArrival = useCallback(() => setShowArrival(true), []);
  const handleStepAdvance = useCallback((idx: number) => setManualStepIdx(idx), []);

  // Reroute: called when off-route is confirmed OR manually triggered.
  // Uses currentLocationRef so this callback doesn't need to depend on live.
  const handleReroute = useCallback(async () => {
    const currentDest = destLngLatRef.current;
    const currentPos = currentLocationRef.current;
    if (!currentDest || !currentPos) return;
    setIsRerouting(true);
    try {
      const result = await createRoutingService().route({
        origin: currentPos,
        destination: currentDest,
        closures: closures ?? [],
      });
      if (result.closure_conflict && result.affected_closure_titles?.length) {
        setRouteError(
          `⚠️ Recalculated route may also pass near closure: "${result.affected_closure_titles[0]}". Proceed with caution.`
        );
      } else {
        setRouteError(null);
      }
      setRoute(result);
      setManualStepIdx(0);
    } catch {
      setRouteError(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'No internet connection. Cannot recalculate route.'
          : 'Could not recalculate route. Please try again.'
      );
    } finally {
      setIsRerouting(false);
    }
  }, [closures]);

  const handleOffRoute = useCallback(() => {
    if (!isNavigating) return;
    handleReroute();
  }, [isNavigating, handleReroute]);

  const live = useLiveNavigation({
    route,
    active: isNavigating,
    externalStepIdx: manualStepIdx,
    onArrival: handleArrival,
    onStepAdvance: handleStepAdvance,
    onOffRoute: handleOffRoute,
  });

  // Keep location ref in sync after every render where live.currentLocation changes
  useEffect(() => {
    if (live.currentLocation) {
      currentLocationRef.current = live.currentLocation;
    }
  }, [live.currentLocation]);

  const bestUserLocation: LngLat | null = live.currentLocation ?? preAcquiredLocation;

  // Pre-acquire GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      Promise.resolve().then(() => setPermissionState('unavailable'));
      return;
    }
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((r) => {
        setPermissionState(r.state === 'granted' ? 'granted' : r.state === 'denied' ? 'denied' : 'prompt');
        r.onchange = () => setPermissionState(r.state === 'granted' ? 'granted' : r.state === 'denied' ? 'denied' : 'prompt');
      }).catch(() => {});
    }
    // Schedule via microtask — avoids synchronous setState inside effect body
    Promise.resolve().then(() => setAcquiringGps(true));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPreAcquiredLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermissionState('granted');
        setAcquiringGps(false);
      },
      (err) => {
        setAcquiringGps(false);
        if (err.code === 1) setPermissionState('denied');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setAcquiringGps(true);
    setGpsSkipped(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPreAcquiredLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setPermissionState('granted'); setAcquiringGps(false); },
      () => { setAcquiringGps(false); setPermissionState('denied'); },
      { enableHighAccuracy: true, timeout: 12_000 }
    );
  }, []);

  const startNavigation = useCallback(async () => {
    if (!destLngLat) return;
    const origin: LngLat = bestUserLocation ?? { lat: 16.5160, lng: 80.6225 };
    setRouteLoading(true);
    setRouteError(null);
    setManualStepIdx(0);
    setAutoFollow(true);
    try {
      const result = await createRoutingService().route({ origin, destination: destLngLat, closures: closures ?? [] });

      // Surface closure conflicts clearly — never silently guide through a closed area
      if (result.closure_conflict && result.affected_closure_titles?.length) {
        setRouteError(
          `⚠️ Route passes near active closure: "${result.affected_closure_titles[0]}". ` +
          `Proceed with caution or choose a different path.`
        );
      }

      // Note if we fell back to a straight-line mock route (OSRM unavailable)
      if (result.is_mock) {
        setRouteError(
          'Routing service unavailable — showing approximate straight-line route. Actual path may differ.'
        );
      }

      setRoute(result);
      setIsNavigating(true);
      setManualStepIdx(0);
    } catch (err) {
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (isOffline) {
        setRouteError('No internet connection. Please connect and try again.');
      } else {
        console.error('[Navigate] Routing failed:', err);
        setRouteError(t('routeUnavailableDesc'));
      }
    } finally {
      setRouteLoading(false);
    }
  }, [bestUserLocation, destLngLat, closures, t]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setRoute(null);
    setManualStepIdx(0);
    setShowArrival(false);
    setAutoFollow(true);
  }, []);

  const goNextStep = useCallback(() => {
    const next = Math.min(live.currentStepIdx + 1, (route?.steps.length ?? 1) - 1);
    setManualStepIdx(next);
  }, [live.currentStepIdx, route?.steps.length]);

  const currentStep = route?.steps[live.currentStepIdx];
  const nextStep = route?.steps[live.currentStepIdx + 1];
  const hasActiveClosures = (closures?.length ?? 0) > 0;

  // Map centre: follow user GPS during active navigation, else show destination
  const mapCenter: LngLat | undefined =
    isNavigating && autoFollow && live.currentLocation
      ? live.currentLocation
      : destLngLat ?? bestUserLocation ?? undefined;

  // GPS timeout/denied screen
  if (permissionState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-sm text-amber-700">
          <MapPinOff size={36} />
        </div>
        <h2 className="font-bold text-xl text-gray-900">{tLoc('denied')}</h2>
        <p className="text-sm text-text-muted leading-relaxed">{tLoc('deniedDesc')}</p>
        <button onClick={requestLocation} className="btn btn-primary mt-2">
          {locale === 'te' ? 'తిరిగి ప్రయత్నించండి' : 'Retry Location Permission'}
        </button>
        <button
          onClick={() => { setPermissionState('prompt'); setGpsSkipped(true); }}
          className="text-xs text-gray-400 underline"
        >
          Continue without GPS
        </button>
      </div>
    );
  }

  // GPS unavailable (no geolocation API)
  if (permissionState === 'unavailable') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
          <WifiOff size={36} className="text-gray-500" />
        </div>
        <h2 className="font-bold text-xl text-gray-900">GPS Not Available</h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Your browser does not support GPS location. Navigation will use the temple entrance as your starting point.
        </p>
        <button
          onClick={() => { setPermissionState('prompt'); setGpsSkipped(true); }}
          className="btn btn-primary mt-2"
        >
          Continue Anyway
        </button>
      </div>
    );
  }

  // ─── ACTIVE NAVIGATION: full-screen map layout ────────────────────
  if (isNavigating && route) {
    return (
      <div className="fixed inset-0 z-[1200] overflow-hidden bg-gray-900" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Map — full screen */}
        <MapView
          className="w-full h-full"
          userLocation={bestUserLocation ?? undefined}
          destination={destLngLat}
          destinations={[]}
          onLocationClick={() => {}}
          center={mapCenter}
          route={route}
          closures={closures ?? []}
        />

        {/* Top instruction overlay */}
        <NavTopCard
          currentStep={currentStep}
          nextStep={nextStep}
          locale={locale}
          accuracy={live.accuracy}
          gpsStatus={live.gpsStatus}
          speedKmh={live.speedKmh}
        />

        {/* Bottom bar overlay */}
        <NavBottomBar
          remainingSeconds={live.remainingSeconds}
          remainingMeters={live.remainingMeters}
          elapsedSeconds={live.elapsedSeconds}
          onStop={stopNavigation}
          onRecentre={() => setAutoFollow(true)}
          onNextStep={goNextStep}
          hasNextStep={live.currentStepIdx < (route.steps.length - 1)}
          isOffRoute={live.isOffRoute}
          isRerouting={isRerouting}
        />

        {/* Network error / route error banners during active navigation */}
        {routeError && !isRerouting && (
          <div
            className="absolute left-4 right-4 flex items-start gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-white shadow-xl"
            style={{ top: '180px', zIndex: 1150, background: 'rgba(180,83,9,0.95)', backdropFilter: 'blur(8px)' }}
            role="alert"
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p>{routeError}</p>
            </div>
            <button onClick={() => setRouteError(null)} aria-label="Dismiss" className="shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Arrival overlay */}
        {showArrival && destination && (
          <ArrivalOverlay
            destName={locale === 'te' ? destination.name_te : destination.name}
            elapsedSeconds={live.elapsedSeconds}
            totalMeters={route.distance_meters}
            onDismiss={stopNavigation}
          />
        )}
      </div>
    );
  }

  // ─── PRE-NAVIGATION: sidebar + map layout ────────────────────────
  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-80px)] md:h-[calc(100dvh-64px)] w-full overflow-hidden relative">

      {destLoading ? (
        <div className="order-2 md:order-1 md:w-105 shrink-0 bg-white border-r border-border flex items-center justify-center p-8">
          <LoadingSpinner size="md" className="text-primary" />
        </div>
      ) : (
        <PreNavSidebar
          destination={destination}
          allLocations={allLocations ?? []}
          locale={locale}
          acquiringGps={acquiringGps}
          preAcquiredLocation={preAcquiredLocation}
          gpsSkipped={gpsSkipped}
          routeLoading={routeLoading}
          routeError={routeError}
          destLngLat={destLngLat}
          hasActiveClosures={hasActiveClosures}
          onStart={startNavigation}
          onRequestLocation={requestLocation}
          onSelectDest={(id) => router.push(id ? `/navigate?location=${id}` : '/navigate')}
          t={t}
          tLoc={tLoc}
        />
      )}

      {/* Map */}
      <div className="order-1 md:order-2 flex-1 h-full relative">
        <MapView
          className="w-full h-full"
          userLocation={bestUserLocation ?? undefined}
          destination={destLngLat}
          destinations={allLocations ?? []}
          onLocationClick={(loc) => router.push(`/navigate?location=${loc.id}`)}
          center={mapCenter}
          route={null}
          closures={closures ?? []}
        />

        {/* GPS acquiring overlay */}
        {acquiringGps && !gpsSkipped && destination && (
          <GpsAcquiringOverlay onSkip={() => { setAcquiringGps(false); setGpsSkipped(true); }} />
        )}
      </div>
    </div>
  );
}

export default function NavigatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
          <LoadingSpinner size="lg" className="text-primary" />
          <span className="text-sm text-gray-500 font-medium">Initializing navigation...</span>
        </div>
      }
    >
      <NavigatePageContent />
    </Suspense>
  );
}
