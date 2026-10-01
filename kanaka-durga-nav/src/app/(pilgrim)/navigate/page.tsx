'use client';

import { useState, useCallback, useMemo, Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  MapPin, MapPinOff, ChevronRight, X,
  ArrowLeft, CheckCircle2, Signal, SignalHigh, SignalLow, Crosshair,
  ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight,
  RotateCcw, AlertTriangle, WifiOff, RefreshCw, Route,
  Search
} from 'lucide-react';
import { useLocation as useLocationData, useLocations } from '@/hooks/use-data';
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
// Google Maps-style top instruction card (NO speaker logo)
// ─────────────────────────────────────────────────
interface NavTopCardProps {
  currentStep: { instruction: string; instruction_te: string; maneuver: string; distance_meters: number } | undefined;
  nextStep: { instruction: string; maneuver: string } | undefined;
  stepDistanceMeters?: number;
  locale: string;
  accuracy: number | null;
  gpsStatus: string;
  speedKmh: number;
}

function NavTopCard({
  currentStep,
  nextStep,
  stepDistanceMeters,
  locale,
  accuracy,
  gpsStatus,
  speedKmh,
}: NavTopCardProps) {
  if (!currentStep) return null;
  const maneuverType = getManeuverType(currentStep.maneuver, currentStep.instruction);
  const nextManeuverType = nextStep ? getManeuverType(nextStep.maneuver, nextStep.instruction) : null;
  const displayDist = stepDistanceMeters !== undefined && stepDistanceMeters > 0
    ? stepDistanceMeters
    : currentStep.distance_meters;

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ zIndex: 1100 }}>
      {/* Main instruction card — temple crimson theme (NO speaker button) */}
      <div
        className="mx-0 rounded-none shadow-2xl px-5 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg, #5c0f1d 0%, #7a1425 50%, #8b142d 100%)' }}
      >
        <div className="flex items-center gap-4">
          {/* Maneuver arrow icon in gold ring */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(245,158,11,0.5)' }}
          >
            <ManeuverArrow maneuver={maneuverType} size={32} />
          </div>

          {/* Street / instruction name & live dynamic distance countdown */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-xl leading-tight">
              {locale === 'te' ? currentStep.instruction_te : currentStep.instruction}
            </p>
            <p className="text-amber-300 text-sm font-semibold mt-0.5 tracking-wide">
              {displayDist <= 15 ? 'Turn now' : `in ${formatDistance(displayDist)}`}
            </p>
          </div>
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
          style={{ background: 'rgba(90,10,20,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(139,20,45,0.4)' }}
        >
          <GpsSignalIcon accuracy={accuracy} />
          <span className="text-[10px] text-red-200 font-medium">
            {gpsStatus === 'active' && accuracy !== null ? `±${Math.round(accuracy)}m` :
             gpsStatus === 'waiting' ? 'Acquiring GPS…' : 'GPS off'}
          </span>
          {speedKmh > 0.5 && (
            <>
              <span className="text-red-700 mx-0.5">·</span>
              <span className="text-[10px] text-amber-300 font-bold">{speedKmh.toFixed(1)} km/h</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Google Maps-style bottom nav bar (Continuous Exact Time ETA)
// ─────────────────────────────────────────────────
interface NavBottomBarProps {
  etaClock: string;
  remainingSeconds: number;
  remainingMeters: number;
  elapsedSeconds: number;
  onStop: () => void;
  onRecentre: () => void;
  onNextStep: () => void;
  hasNextStep: boolean;
  isOffRoute: boolean;
  isRerouting: boolean;
  isAutoFollowing?: boolean;
  mapRotationMode: 'heads-up' | 'north-up';
  onToggleMapRotation: () => void;
  heading: number | null;
}

function NavBottomBar({
  etaClock,
  remainingSeconds,
  remainingMeters,
  onStop,
  onRecentre,
  onNextStep,
  hasNextStep,
  isOffRoute,
  isRerouting,
  isAutoFollowing = true,
  mapRotationMode,
  onToggleMapRotation,
  heading,
}: NavBottomBarProps) {
  const compassNeedleAngle = mapRotationMode === 'heads-up' && heading !== null ? -heading : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 1100 }}>
      {/* Floating Controls: Re-centre & Compass Orientation Toggle */}
      <div className="flex justify-between items-center px-4 mb-2 pointer-events-none">
        <button
          onClick={onRecentre}
          className={`pointer-events-auto flex items-center gap-2 text-white rounded-full px-4 py-2.5 shadow-xl text-sm font-semibold active:scale-95 transition-all ${
            !isAutoFollowing
              ? 'ring-2 ring-amber-400 bg-[#8b142d] scale-105 shadow-amber-500/30'
              : 'bg-[#7a1425] opacity-90'
          }`}
          style={{ border: '1.5px solid rgba(245,158,11,0.4)', boxShadow: '0 4px 16px rgba(90,10,20,0.5)' }}
          title="Re-centre to your location"
        >
          <Crosshair size={16} className={`text-amber-300 ${!isAutoFollowing ? 'animate-spin' : ''}`} />
          <span>Re-centre</span>
        </button>

        {/* Compass Needle / Orientation Toggle */}
        <button
          onClick={onToggleMapRotation}
          className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center bg-[#7a1425] text-white shadow-xl active:scale-95 transition-all"
          style={{ border: '1.5px solid rgba(245,158,11,0.4)', boxShadow: '0 4px 16px rgba(90,10,20,0.5)' }}
          title={mapRotationMode === 'heads-up' ? 'Heads-Up (tap for North-Up)' : 'North-Up (tap for Heads-Up)'}
        >
          <div
            className="w-6 h-6 flex items-center justify-center transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${compassNeedleAngle}deg)` }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <polygon points="12,2 16,12 12,9" fill="#ef4444" stroke="#ffffff" strokeWidth="0.8" />
              <polygon points="12,22 16,12 12,15" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
              <polygon points="12,2 8,12 12,9" fill="#b91c1c" stroke="#ffffff" strokeWidth="0.8" />
              <polygon points="12,22 8,12 12,15" fill="#d97706" stroke="#ffffff" strokeWidth="0.8" />
              <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
            </svg>
          </div>
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
            <>
              <RefreshCw size={16} className="text-white animate-spin" aria-hidden />
              <span className="text-white">Recalculating route…</span>
            </>
          ) : (
            <>
              <Route size={16} className="text-amber-200" aria-hidden />
              <span className="text-amber-100">Off route — recalculating…</span>
            </>
          )}
        </div>
      )}

      {/* Bottom sheet — temple dark theme with exact ETA and distance (NO emojis) */}
      <div
        className="px-5 pt-4 pb-6"
        style={{
          background: 'linear-gradient(180deg, #1a0509 0%, #0d0203 100%)',
          borderTop: '1px solid rgba(139,20,45,0.4)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
        }}
      >
        <div className="flex items-center gap-4">
          {/* Stop — crimson circular button */}
          <button
            onClick={onStop}
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all bg-red-950/60 border border-red-800/60 hover:bg-red-900/80"
            aria-label="Stop navigation"
          >
            <X size={20} className="text-red-200" />
          </button>

          {/* Continuous Dynamic ETA and Distance Display */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-white font-extrabold text-2xl leading-none tracking-tight">
                Arrive {etaClock}
              </span>
              <span className="text-amber-300 font-bold text-base leading-none">
                · {formatDuration(remainingSeconds)}
              </span>
            </div>
            <div className="text-red-200/90 text-sm font-medium mt-1 tracking-wide">
              {formatDistance(remainingMeters)} remaining
            </div>
          </div>

          {/* Next step button (if steps available) */}
          {hasNextStep && (
            <button
              onClick={onNextStep}
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all bg-amber-950/50 border border-amber-600/50 hover:bg-amber-900/60"
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
// Arrival overlay (Clean dignified temple style, NO emojis)
// ─────────────────────────────────────────────────
function ArrivalOverlay({ destName, elapsedSeconds, totalMeters, onDismiss }: {
  destName: string; elapsedSeconds: number; totalMeters: number; onDismiss: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-7 max-w-xs text-center shadow-2xl border border-black/10 w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="w-18 h-18 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={44} className="text-emerald-600" strokeWidth={1.8} />
        </div>
        <h3 className="font-black text-2xl text-gray-900 mb-1">You Have Arrived</h3>
        <p className="text-sm text-gray-700 mb-1 font-bold">{destName}</p>
        <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
          <span className="text-[#8b142d] font-semibold">జై కనక దుర్గా!</span>
          <br />
          <span className="font-medium text-gray-700 mt-1 inline-block">
            {formatDistance(totalMeters)} in {formatElapsed(elapsedSeconds)}
          </span>
        </p>
        <button
          className="btn btn-primary w-full font-bold text-sm py-3 rounded-xl shadow-lg"
          onClick={onDismiss}
        >
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
  onStart: () => void;
  onRequestLocation: () => void;
  onSelectDest: (id: string) => void;
  t: (key: string) => string;
}

function PreNavSidebar({
  destination, allLocations, locale, acquiringGps, preAcquiredLocation,
  gpsSkipped, routeLoading, routeError, destLngLat,
  onStart, onRequestLocation, onSelectDest, t
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
    <div className="w-full md:w-105 shrink-0 bg-white border-r border-border flex flex-col h-full overflow-y-auto">
      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
        {/* Selected Destination Card */}
        {destination ? (
          <div className="border border-primary/20 bg-primary-subtle/30 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {locale === 'te' ? 'ఎంచుకున్న గమ్యస్థానం' : 'Selected Destination'}
                </span>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">
                  {locale === 'te' ? destination.name_te : destination.name}
                </h2>
                {destination.address && (
                  <p className="text-xs text-gray-500 mt-0.5">{destination.address}</p>
                )}
              </div>
              <button
                onClick={() => onSelectDest('')}
                className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
                title="Change destination"
              >
                <X size={14} />
              </button>
            </div>

            {/* GPS Status Indicator */}
            <div className="flex items-center gap-2 text-xs pt-1 border-t border-primary/10">
              {acquiringGps && !gpsSkipped ? (
                <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span>{locale === 'te' ? 'జీపీఎస్ పొందుతున్నారు...' : 'Acquiring GPS location...'}</span>
                </div>
              ) : preAcquiredLocation ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>{locale === 'te' ? 'జీపీఎస్ కనెక్ట్ అయింది' : 'GPS location ready'}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="flex items-center gap-1.5 text-amber-700 hover:underline font-medium text-left"
                >
                  <MapPin size={12} />
                  <span>{locale === 'te' ? 'ఖచ్చితమైన మార్గం కోసం జీపీఎస్ ప్రారంభించండి' : 'Enable GPS for exact route'}</span>
                </button>
              )}
            </div>

            {routeError && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                {routeError}
              </div>
            )}

            {/* Start Navigation Action */}
            <button
              onClick={onStart}
              disabled={routeLoading || !destLngLat}
              className="btn btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              {routeLoading ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>{locale === 'te' ? 'మార్గం లెక్కిస్తోంది...' : 'Calculating Route...'}</span>
                </>
              ) : (
                <>
                  <Crosshair size={18} />
                  <span>{locale === 'te' ? 'నావిగేషన్ ప్రారంభించు' : t('startNavigation')}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {locale === 'te' ? 'గమ్యస్థానాన్ని ఎంచుకోండి' : 'Choose a Destination'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {locale === 'te'
                  ? 'క్యూ లైన్, పార్కింగ్, లేదా ఆలయ సౌకర్యాన్ని ఎంచుకోండి'
                  : 'Select a darshan queue, parking area, or facility'}
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
                      ? 'bg-[#8b142d] text-white font-bold'
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
                          ? 'bg-[#8b142d] text-white font-bold'
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
                              <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <MapPin size={10} className="text-amber-700" />
                                {sectorName}
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
  const [recenterTrigger, setRecentreTrigger] = useState(0);
  const [mapRotationMode, setMapRotationMode] = useState<'heads-up' | 'north-up'>('heads-up');

  const handleRecentre = useCallback(() => {
    setAutoFollow(true);
    setRecentreTrigger((c) => c + 1);
  }, []);

  const toggleMapRotation = useCallback(() => {
    setMapRotationMode((prev) => (prev === 'heads-up' ? 'north-up' : 'heads-up'));
  }, []);

  // Track current destination ref for use in reroute callback
  const destLngLatRef = useRef<LngLat | null>(null);
  const currentLocationRef = useRef<LngLat | null>(null);

  const destLngLat: LngLat | null = useMemo(() => {
    const coords = destination?.position?.coordinates;
    return coords ? { lng: coords[0], lat: coords[1] } : null;
  }, [destination?.position?.coordinates]);

  useEffect(() => { destLngLatRef.current = destLngLat; }, [destLngLat]);

  const handleArrival = useCallback(() => setShowArrival(true), []);
  const handleStepAdvance = useCallback((idx: number) => setManualStepIdx(idx), []);

  const handleReroute = useCallback(async () => {
    const currentDest = destLngLatRef.current;
    const currentPos = currentLocationRef.current;
    if (!currentDest || !currentPos) return;
    setIsRerouting(true);
    try {
      const result = await createRoutingService().route({
        origin: currentPos,
        destination: currentDest,
      });
      setRouteError(null);
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
  }, []);

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
    setMapRotationMode('heads-up');

    // Request compass permission on iOS if supported
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
    ) {
      try {
        await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      } catch {}
    }

    try {
      const result = await createRoutingService().route({ origin, destination: destLngLat });

      if (result.is_mock) {
        setRouteError(
          'Routing service unavailable — showing approximate path. Actual path may differ.'
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
  }, [bestUserLocation, destLngLat, t]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setRoute(null);
    setManualStepIdx(0);
    setShowArrival(false);
    setAutoFollow(true);
    setMapRotationMode('heads-up');
  }, []);

  const goNextStep = useCallback(() => {
    const next = Math.min(live.currentStepIdx + 1, (route?.steps.length ?? 1) - 1);
    setManualStepIdx(next);
  }, [live.currentStepIdx, route?.steps.length]);

  const currentStep = route?.steps[live.currentStepIdx];
  const nextStep = route?.steps[live.currentStepIdx + 1];

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

  // ─── ACTIVE NAVIGATION: full-screen Google Maps-style layout ────────────────────
  if (isNavigating && route) {
    return (
      <div className="fixed inset-0 z-[1200] overflow-hidden bg-gray-900" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Map — full screen with navigation puck, rotation, and auto-follow */}
        <MapView
          className="w-full h-full"
          userLocation={bestUserLocation ?? undefined}
          destination={destLngLat}
          selectedLocation={destination ?? undefined}
          destinations={allLocations ?? []}
          onLocationClick={() => {}}
          center={mapCenter}
          route={route}
          onUserInteraction={() => setAutoFollow(false)}
          recenterTrigger={recenterTrigger}
          autoFollow={autoFollow}
          isNavigating={true}
          heading={live.heading}
          mapRotationMode={mapRotationMode}
        />

        {/* Top instruction overlay (NO speaker logo, live distance countdown) */}
        <NavTopCard
          currentStep={currentStep}
          nextStep={nextStep}
          stepDistanceMeters={live.stepDistanceMeters}
          locale={locale}
          accuracy={live.accuracy}
          gpsStatus={live.gpsStatus}
          speedKmh={live.speedKmh}
        />

        {/* Bottom bar overlay (Exact Time ETA, Compass toggle, Re-centre) */}
        <NavBottomBar
          etaClock={live.etaClock}
          remainingSeconds={live.remainingSeconds}
          remainingMeters={live.remainingMeters}
          elapsedSeconds={live.elapsedSeconds}
          onStop={stopNavigation}
          onRecentre={handleRecentre}
          onNextStep={goNextStep}
          hasNextStep={live.currentStepIdx < (route.steps.length - 1)}
          isOffRoute={live.isOffRoute}
          isRerouting={isRerouting}
          isAutoFollowing={autoFollow}
          mapRotationMode={mapRotationMode}
          onToggleMapRotation={toggleMapRotation}
          heading={live.heading}
        />

        {/* Route / Network error banners */}
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

        {/* Arrival overlay (Clean, dignified temple celebration, NO emojis) */}
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
          onStart={startNavigation}
          onRequestLocation={requestLocation}
          onSelectDest={(id) => router.push(id ? `/navigate?location=${id}` : '/navigate')}
          t={t}
        />
      )}

      {/* Map */}
      <div className="order-1 md:order-2 flex-1 h-full relative">
        <MapView
          className="w-full h-full"
          userLocation={bestUserLocation ?? undefined}
          destination={destLngLat}
          selectedLocation={destination ?? undefined}
          destinations={allLocations ?? []}
          onLocationClick={(loc) => router.push(`/navigate?location=${loc.id}`)}
          center={mapCenter}
          route={null}
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
