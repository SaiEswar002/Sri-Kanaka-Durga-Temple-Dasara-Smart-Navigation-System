'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Navigation, Phone, Clock, HeartPulse, ShieldPlus, Building2 } from 'lucide-react';
import { useEmergencyPoints } from '@/hooks/use-data';
import { LoadingSpinner, ErrorState, EmptyState, DemoBanner } from '@/components/shared/status-components';
import Link from 'next/link';
import type { EmergencyPoint } from '@/types';

export default function MedicalPage() {
  const t = useTranslations('medical');
  const locale = useLocale();
  const { data: points, isLoading, error, refetch } = useEmergencyPoints();

  const medicalPoints = points?.filter(
    (p) => ['MEDICAL', 'FIRST_AID', 'AMBULANCE'].includes(p.emergency_type)
  ) ?? [];

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
                {locale === 'te' ? 'వైద్య కేంద్రాలు & అంబులెన్స్ సహాయ కేంద్రాలు' : 'First aid posts, medical centers & ambulance points'}
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

        {!isLoading && !error && medicalPoints.length === 0 && (
          <EmptyState
            message={locale === 'te' ? 'వైద్య సమాచారం అందుబాటులో లేదు' : 'No medical information available'}
          />
        )}

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {medicalPoints.map((point) => (
            <MedicalCard key={point.id} point={point} locale={locale} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function getMedicalIcon(type: string) {
  switch (type) {
    case 'MEDICAL':    return Building2;
    case 'FIRST_AID':  return ShieldPlus;
    case 'AMBULANCE':  return HeartPulse;
    default:           return Plus;
  }
}

function MedicalCard({ point, locale, t }: { point: EmergencyPoint; locale: string; t: ReturnType<typeof useTranslations> }) {
  const MedIconEl = getMedicalIcon(point.emergency_type);

  return (
    <div className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 shadow-inner">
            {MedIconEl && React.createElement(MedIconEl, { size: 22, 'aria-hidden': true })}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="font-bold text-base sm:text-lg text-(--color-text)">
                {locale === 'te' ? point.name_te : point.name}
              </h2>
              {point.is_24h && (
                <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200 text-xs flex items-center gap-1 font-bold">
                  <Clock size={11} aria-hidden />24 Hours
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-emerald-700">
              {['POLICE', 'MEDICAL', 'FIRST_AID', 'AMBULANCE', 'FIRE', 'HELP_DESK', 'SOS_BOOTH'].includes(point.emergency_type)
                ? t(`emergencyTypes.${point.emergency_type}` as 'emergencyTypes.MEDICAL')
                : (point.emergency_type || 'Medical Aid')}
            </p>
            {point.location?.address && (
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                {point.location.address}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 pt-4 border-t border-border mt-3">
        {point.contact_phone && (
          <a
            href={`tel:${point.contact_phone}`}
            className="btn btn-outline text-xs font-bold flex-1 py-2 flex items-center justify-center gap-1.5"
            aria-label={`Call ${locale === 'te' ? point.name_te : point.name}`}
          >
            <Phone size={15} aria-hidden />
            <span>{t('call')}</span>
          </a>
        )}
        <Link
          href={`/navigate?location=${point.location_id}`}
          className="btn btn-primary text-xs font-bold flex-1 py-2 flex items-center justify-center gap-1.5"
          aria-label={`Navigate to ${locale === 'te' ? point.name_te : point.name}`}
        >
          <Navigation size={15} aria-hidden />
          <span>{t('navigate')}</span>
        </Link>
      </div>
    </div>
  );
}
