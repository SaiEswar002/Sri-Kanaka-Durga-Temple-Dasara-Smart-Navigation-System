'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Car, Navigation } from 'lucide-react';
import { useParkingAreas } from '@/hooks/use-data';
import { LoadingSpinner, ErrorState, EmptyState, DemoBanner } from '@/components/shared/status-components';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ParkingArea } from '@/types';

export default function ParkingPage() {
  const t = useTranslations('parking');
  const locale = useLocale();
  const { data: areas, isLoading, error, refetch } = useParkingAreas();

  return (
    <div className="w-full">
      <header className="page-header" style={{ background: 'linear-gradient(135deg, #d4851a 0%, #b06a10 100%)' }}>
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Car size={24} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
              <p className="text-white/80 text-xs sm:text-sm">
                {locale === 'te' ? 'ఉచిత పార్కింగ్ స్థలాలు & ఖాళీ స్థలాల ప్రత్యక్ష సమాచారం' : 'Free Dasara parking lots & live slot availability'}
              </p>
            </div>
          </div>
          <Link
            href="/navigate?category=parking"
            className="hidden sm:inline-flex items-center gap-2 bg-white hover:bg-amber-50 text-amber-950 font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
          >
            <Navigation size={14} />
            <span>{locale === 'te' ? 'పార్కింగ్ మ్యాప్ తెరవండి' : 'Open Parking Map'}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <DemoBanner />

        {isLoading && (
          <div className="flex justify-center p-16">
            <LoadingSpinner size="lg" className="text-amber-600" />
          </div>
        )}

        {error && (
          <ErrorState
            message={locale === 'te' ? 'పార్కింగ్ సమాచారం లోడ్ కాలేదు' : 'Could not load parking information'}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && (!areas || areas.length === 0) && (
          <EmptyState
            message={locale === 'te' ? 'పార్కింగ్ సమాచారం అందుబాటులో లేదు' : 'No parking information available'}
          />
        )}

        {/* Responsive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {areas?.map((area) => (
            <ParkingCard key={area.id} area={area} locale={locale} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ParkingCard({ area, locale, t }: { area: ParkingArea; locale: string; t: ReturnType<typeof useTranslations> }) {
  const status = area.current_status;
  // Safe lookup — DB may return null/undefined status; always fall back to UNKNOWN
  const rawStatus = status?.status;
  const safeStatus: 'AVAILABLE' | 'FILLING' | 'FULL' | 'CLOSED' | 'UNKNOWN' =
    (rawStatus === 'AVAILABLE' || rawStatus === 'FILLING' || rawStatus === 'FULL' || rawStatus === 'CLOSED')
      ? rawStatus
      : 'UNKNOWN';
  const availablePct = area.total_capacity > 0 && status
    ? Math.round((status.available / area.total_capacity) * 100)
    : null;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-(--color-text)">
              {locale === 'te' ? area.name_te : area.name}
            </h2>
            <p className="text-xs text-text-muted mt-1 font-medium">
              {t(`type.${area.parking_type}`)} · <span className="text-gray-700">{area.vehicle_types.join(' · ')}</span>
            </p>
          </div>
          <span className={cn(
            'badge border text-xs font-semibold px-2.5 py-0.5',
            safeStatus === 'AVAILABLE' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            safeStatus === 'FILLING'   ? 'bg-amber-50 border-amber-200 text-amber-800' :
            safeStatus === 'FULL'      ? 'bg-red-50 border-red-200 text-red-800' :
            safeStatus === 'CLOSED'    ? 'bg-gray-100 border-gray-200 text-gray-700' :
                                         'bg-gray-50 border-gray-200 text-gray-500'
          )}>
            {status ? t(`status.${safeStatus}`) : t('status.UNKNOWN')}
          </span>
        </div>

        {/* Capacity stats */}
        {status && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
              <p className="text-xl font-black text-emerald-700">{status.available}</p>
              <p className="text-[11px] font-semibold text-emerald-600">{t('available')}</p>
            </div>
            <div className="text-center bg-red-50 border border-red-100 rounded-xl p-2.5">
              <p className="text-xl font-black text-red-700">{status.occupied}</p>
              <p className="text-[11px] font-semibold text-red-600">{t('occupied')}</p>
            </div>
            <div className="text-center bg-gray-50 border border-gray-200 rounded-xl p-2.5">
              <p className="text-xl font-black text-gray-700">{area.total_capacity}</p>
              <p className="text-[11px] font-semibold text-gray-500">{t('total')}</p>
            </div>
          </div>
        )}

        {/* Availability bar */}
        {availablePct !== null && (
          <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex justify-between text-xs font-semibold text-text-muted mb-1.5">
              <span>{locale === 'te' ? 'ఖాళీ లభ్యత' : 'Slots Available'}</span>
              <span className={cn(
                availablePct > 30 ? 'text-emerald-700' :
                availablePct > 10 ? 'text-amber-700' : 'text-red-700'
              )}>{availablePct}%</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  availablePct > 30 ? 'bg-emerald-500' :
                  availablePct > 10 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${availablePct}%` }}
                role="progressbar"
                aria-valuenow={availablePct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-border mt-2">
        <Link
          href={`/navigate?location=${area.location_id ?? ''}&type=parking`}
          className="btn btn-outline w-full text-xs font-bold py-2 flex items-center justify-center gap-1.5"
        >
          <Navigation size={15} aria-hidden />
          <span>{locale === 'te' ? 'ఈ పార్కింగ్‌కి మార్గం' : t('navigate')}</span>
        </Link>
      </div>
    </div>
  );
}
