'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Navigation, Phone, HeartPulse, Building2, MapPin } from 'lucide-react';
import { useLocations } from '@/hooks/use-data';
import { LoadingSpinner, ErrorState, EmptyState, DemoBanner } from '@/components/shared/status-components';
import Link from 'next/link';
import type { Location } from '@/types';

export default function MedicalPage() {
  const t = useTranslations('medical');
  const locale = useLocale();
  const { data: locations, isLoading, error, refetch } = useLocations('medical');

  return (
    <div className="w-full">
      <header className="page-header" style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)' }}>
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Plus size={24} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
              <p className="text-white/80 text-xs sm:text-sm">
                {locale === 'te' ? 'వైద్య కేంద్రాలు & ప్రథమ చికిత్స సహాయ కేంద్రాలు' : 'First aid posts, medical centers & health assistance points'}
              </p>
            </div>
          </div>
          <a
            href="tel:108"
            className="hidden sm:inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
          >
            <Phone size={14} />
            <span>{locale === 'te' ? 'అంబులెన్స్ డయల్ 108' : 'Dial Ambulance 108'}</span>
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <DemoBanner />

        {/* Emergency reminder banner */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <HeartPulse size={24} aria-hidden />
            </div>
            <div>
              <p className="font-bold text-red-800 text-sm sm:text-base">
                {locale === 'te' ? 'తీవ్రమైన అత్యవసర వైద్య పరిస్థితా?' : 'Life-threatening medical emergency?'}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {locale === 'te' ? 'వెంటనే 108 లేదా 112 కు కాల్ చేయండి' : 'Call 108 or 112 immediately for instant ambulance dispatch'}
              </p>
            </div>
          </div>
          <a
            href="tel:108"
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow whitespace-nowrap transition-colors"
          >
            Call 108
          </a>
        </div>

        {isLoading && (
          <div className="flex justify-center p-16">
            <LoadingSpinner size="lg" className="text-green-600" />
          </div>
        )}

        {error && (
          <ErrorState
            message={locale === 'te' ? 'వైద్య స్థానాలు లోడ్ కాలేదు' : 'Could not load medical locations'}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && (!locations || locations.length === 0) && (
          <EmptyState
            message={locale === 'te' ? 'వైద్య సమాచారం అందుబాటులో లేదు' : 'No medical information available'}
          />
        )}

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {locations?.map((loc) => (
            <MedicalLocationCard key={loc.id} loc={loc} locale={locale} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MedicalLocationCard({ loc, locale, t }: { loc: Location; locale: string; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 shadow-inner">
            <Building2 size={22} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="font-bold text-base sm:text-lg text-(--color-text)">
                {locale === 'te' && loc.name_te ? loc.name_te : loc.name}
              </h2>
            </div>
            {loc.sector && (
              <p className="text-xs font-semibold text-emerald-700">
                {locale === 'te' && loc.sector.name_te ? loc.sector.name_te : loc.sector.name}
              </p>
            )}
            {loc.address && (
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed flex items-start gap-1">
                <MapPin size={13} className="shrink-0 mt-0.5 text-gray-400" />
                <span>{loc.address}</span>
              </p>
            )}
            {loc.description && (
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                {loc.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 pt-4 border-t border-border mt-3">
        <a
          href="tel:108"
          className="btn btn-outline text-xs font-bold flex-1 py-2 flex items-center justify-center gap-1.5"
          aria-label="Call 108"
        >
          <Phone size={15} aria-hidden />
          <span>{t('call')} 108</span>
        </a>
        <Link
          href={`/navigate?location=${loc.id}`}
          className="btn btn-primary text-xs font-bold flex-1 py-2 flex items-center justify-center gap-1.5"
          aria-label={`Navigate to ${locale === 'te' && loc.name_te ? loc.name_te : loc.name}`}
        >
          <Navigation size={15} aria-hidden />
          <span>{t('navigate')}</span>
        </Link>
      </div>
    </div>
  );
}
