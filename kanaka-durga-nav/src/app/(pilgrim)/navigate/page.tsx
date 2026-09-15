'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Navigation, MapPin, MapPinOff, Clock, ChevronRight, X, AlertCircle,
  Compass, Search, ArrowLeft, Footprints, Layers, ShieldCheck
} from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { useLocation as useLocationData, useActiveClosures, useLocations } from '@/hooks/use-data';
import { getRoutingService } from '@/services/routing/routing-service';
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
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-gray-500 text-sm font-medium">Loading MapLibre engine...</span>
      </div>
    ),
  }
);

function NavigatePageContent() {
  const t = useTranslations('navigate');
  const tLoc = useTranslations('location');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = searchParams.get('location');

  const { location: userLocation, permissionState, isLoading: locationLoading, requestLocation } = useLocation({ autoRequest: true });
  const { data: destination, isLoading: destLoading } = useLocationData(locationId ?? '');
  const { data: closures } = useActiveClosures();
  const { data: allLocations } = useLocations();

  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const destLngLat: LngLat | null = destination?.position?.coordinates
    ? { lng: destination.position.coordinates[0], lat: destination.position.coordinates[1] }
    : null;

  const startNavigation = useCallback(async () => {
    if (!userLocation || !destLngLat) return;

    setRouteLoading(true);
    setRouteError(null);

    try {
      const routingService = getRoutingService();
      const result = await routingService.route({
        origin: { lat: userLocation.lat, lng: userLocation.lng },
        destination: destLngLat,
        closures: closures ?? [],
      });

      setRoute(result);
      setIsNavigating(true);
      setCurrentStepIdx(0);
    } catch (err) {
      console.error('[Navigate] Routing failed:', err);
      setRouteError(t('routeUnavailableDesc'));
    } finally {
      setRouteLoading(false);
    }
  }, [userLocation, destLngLat, closures, t]);

  const currentStep = route?.steps[currentStepIdx];
  const hasActiveClosures = (closures?.length ?? 0) > 0;

  // Pre-selected destinations for laptop selector
  const featuredLocations = allLocations?.slice(0, 8) ?? [];

  if (locationLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
        <LoadingSpinner size="lg" className="text-[var(--color-primary)]" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">{tLoc('gettingLocation')}</p>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-sm text-amber-700">
          <MapPinOff size={36} aria-hidden />
        </div>
        <h2 className="font-bold text-xl text-gray-900">{tLoc('denied')}</h2>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{tLoc('deniedDesc')}</p>
        <button
          onClick={requestLocation}
          className="btn btn-primary mt-2"
        >
          {locale === 'te' ? 'తిరిగి ప్రయత్నించండి' : 'Retry Location Permission'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-80px)] md:h-[calc(100dvh-64px)] w-full overflow-hidden relative">
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR / MOBILE BOTTOM SHEET                    */}
      {/* ======================================================== */}
      <div className="order-2 md:order-1 md:w-[420px] lg:w-[460px] flex-shrink-0 bg-white border-t md:border-t-0 md:border-r border-[var(--color-border)] shadow-xl md:shadow-none z-20 flex flex-col max-h-[45dvh] md:max-h-full overflow-y-auto">
        {/* Active closures warning */}
        {hasActiveClosures && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2 font-medium">
            <AlertCircle size={15} className="text-amber-600 flex-shrink-0" aria-hidden />
            <span>{t('closureWarning')}</span>
          </div>
        )}

        {/* Mock route indicator */}
        {route?.is_mock && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-700 flex items-center gap-2">
            <AlertCircle size={14} className="text-blue-500 flex-shrink-0" aria-hidden />
            <span>{t('mockRouteWarning')}</span>
          </div>
        )}

        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          {destLoading ? (
            <div className="flex items-center gap-3 p-4">
              <LoadingSpinner size="sm" className="text-gray-400" />
              <span className="text-sm text-gray-500">Loading destination...</span>
            </div>
          ) : destination ? (
            <div className="space-y-4">
              {/* Destination Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                <div>
                  <span className="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider block">
                    {isNavigating ? t('navigating') : (locale === 'te' ? 'గమ్యస్థానం' : 'Selected Destination')}
                  </span>
                  <h2 className="font-black text-lg sm:text-xl text-gray-900 leading-snug mt-0.5">
                    {locale === 'te' ? destination.name_te : destination.name}
                  </h2>
                  {destination.address && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
                      <MapPin size={12} />
                      <span>{destination.address}</span>
                    </p>
                  )}
                </div>
                {isNavigating && (
                  <button
                    className="btn btn-ghost btn-sm text-gray-500 hover:text-red-600"
                    onClick={() => { setIsNavigating(false); setRoute(null); }}
                    title="Stop navigation"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Route Summary Stats */}
              {route && (
                <div className="bg-[var(--color-surface-alt)] rounded-2xl p-3.5 border border-black/5 flex items-center justify-around">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)] mb-0.5">
                      <MapPin size={13} className="text-[var(--color-primary)]" />
                      <span className="text-[11px] font-medium">Distance</span>
                    </div>
                    <p className="font-black text-base text-gray-900">
                      {formatDistance(route.distance_meters)}
                    </p>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-200" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)] mb-0.5">
                      <Clock size={13} className="text-[var(--color-primary)]" />
                      <span className="text-[11px] font-medium">Walk Time</span>
                    </div>
                    <p className="font-black text-base text-gray-900">
                      {formatDuration(route.duration_seconds)}
                    </p>
                  </div>
                </div>
              )}

              {/* Current Turn-by-turn Step */}
              {isNavigating && currentStep && (
                <div className="bg-[var(--color-primary-subtle)] border border-[var(--color-primary-muted)] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
                    <span>Step {currentStepIdx + 1} of {route?.steps.length}</span>
                    <span>{formatDistance(currentStep.distance_meters)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center flex-shrink-0 shadow">
                      <Footprints size={20} />
                    </div>
                    <p className="font-bold text-sm sm:text-base text-gray-900 leading-snug flex-1">
                      {locale === 'te' ? currentStep.instruction_te : currentStep.instruction}
                    </p>
                  </div>
                  {currentStepIdx < (route?.steps.length ?? 0) - 1 && (
                    <button
                      className="btn btn-outline btn-sm w-full text-xs font-bold mt-2"
                      onClick={() => setCurrentStepIdx((i) => Math.min(i + 1, (route?.steps.length ?? 1) - 1))}
                    >
                      <span>{locale === 'te' ? 'తదుపరి సూచన' : 'Next Step'}</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Route Error */}
              {routeError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  <p className="font-bold mb-0.5">{t('routeUnavailable')}</p>
                  <p>{routeError}</p>
                </div>
              )}

              {/* Start Navigation Action */}
              {!isNavigating && (
                <button
                  className="btn btn-primary btn-lg w-full shadow-lg text-sm font-bold flex items-center justify-center gap-2"
                  onClick={startNavigation}
                  disabled={!userLocation || routeLoading}
                >
                  {routeLoading ? (
                    <LoadingSpinner size="sm" className="text-white" />
                  ) : (
                    <Navigation size={18} aria-hidden />
                  )}
                  <span>
                    {routeLoading
                      ? (locale === 'te' ? 'రూట్ లెక్కిస్తోంది...' : 'Calculating optimal walking route...')
                      : t('startNavigation')}
                  </span>
                </button>
              )}
            </div>
          ) : (
            /* No destination selected yet: Laptop facility browser */
            <div className="space-y-4">
              <div className="text-left">
                <h3 className="font-bold text-base text-gray-900">
                  {locale === 'te' ? 'గమ్యస్థానాన్ని ఎంచుకోండి' : 'Select a Destination'}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {locale === 'te' ? 'ఆలయ ప్రాంగణంలో కావలసిన ప్రదేశాన్ని క్లిక్ చేయండి' : 'Choose any temple gate, queue, or parking facility'}
                </p>
              </div>

              <div className="space-y-2 max-h-[50dvh] overflow-y-auto pr-1">
                {featuredLocations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => router.push(`/navigate?location=${loc.id}`)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]/40 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-[var(--color-primary)] block leading-snug">
                        {locale === 'te' ? loc.name_te : loc.name}
                      </span>
                      {loc.address && (
                        <span className="text-[11px] text-gray-500 block truncate max-w-[260px]">
                          {loc.address}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick return button on laptop */}
          <div className="pt-4 border-t border-[var(--color-border)] mt-auto hidden md:block">
            <Link
              href="/"
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>{locale === 'te' ? 'హోమ్ పేజీకి తిరిగి వెళ్లండి' : 'Back to Home'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN MAP CANVAS                                         */}
      {/* ======================================================== */}
      <div className="order-1 md:order-2 flex-1 h-full relative">
        <MapView
          className="w-full h-full"
          userLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined}
          destination={destLngLat}
          route={route}
        />

        {/* GPS Prompt Overlay */}
        {!userLocation && permissionState === 'prompt' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-30 p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm text-center shadow-2xl border border-black/5">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center mx-auto mb-4">
                <MapPin size={32} />
              </div>
              <h3 className="font-black text-lg mb-2 text-gray-900">{t('locationRequired')}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">{t('enableLocationForNav')}</p>
              <button
                className="btn btn-primary w-full py-3 text-sm font-bold shadow-md"
                onClick={requestLocation}
              >
                {locale === 'te' ? 'లొకేషన్ అనుమతించండి' : 'Enable Location Services'}
              </button>
            </div>
          </div>
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
          <LoadingSpinner size="lg" className="text-[var(--color-primary)]" />
          <span className="text-sm text-gray-500 font-medium">Initializing navigation...</span>
        </div>
      }
    >
      <NavigatePageContent />
    </Suspense>
  );
}
