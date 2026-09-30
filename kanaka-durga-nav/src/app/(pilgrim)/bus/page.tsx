'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Bus, Navigation, Clock, MapPin, Route } from 'lucide-react';
import { useLocations } from '@/hooks/use-data';
import { LoadingSpinner, ErrorState, EmptyState, DemoBanner } from '@/components/shared/status-components';
import Link from 'next/link';

export default function BusPage() {
  const t = useTranslations('bus');
  const locale = useLocale();
  const { data: locations, isLoading, error, refetch } = useLocations('bus');

  return (
    <div className="w-full">
      <header className="page-header" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Bus size={24} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
              <p className="text-white/80 text-xs sm:text-sm">
                {locale === 'te' ? 'ఉచిత దేవస్థానం షటిల్ బస్సు స్టాప్‌లు & రూట్ సమాచారం' : 'Free temple shuttle bus stops & transit routes'}
              </p>
            </div>
          </div>
          <Link
            href="/navigate?category=bus"
            className="hidden sm:inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-950 font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
          >
            <Navigation size={14} />
            <span>{locale === 'te' ? 'బస్సు స్టాప్స్ మ్యాప్' : 'View Bus Stops Map'}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <DemoBanner />

        {/* Advisory banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-inner border border-blue-200">
            <Bus size={22} aria-hidden />
          </div>
          <div>
            <h2 className="font-bold text-base text-blue-950">
              {locale === 'te' ? 'ఉచిత భక్తుల షటిల్ సర్వీస్ (ప్రతి 5-10 నిమిషాలకు)' : 'Free Pilgrim Shuttle Service (Every 5–10 mins)'}
            </h2>
            <p className="text-xs sm:text-sm text-blue-900/80 mt-1 leading-relaxed">
              {locale === 'te'
                ? 'భవానీ ఘాట్, రైల్వే స్టేషన్, బస్టాండ్ మరియు దూర ప్రాంత పార్కింగ్ స్థలాల నుండి ఇంద్రకీలాద్రి పాదాల వరకు నిరంతర ఉచిత రవాణా సౌకర్యం కలదు.'
                : 'Continuous free transit from Bhavani Ghat, Railway Station, Bus Stand, and remote parking lots directly to the base of Indrakeeladri hill.'}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center p-16">
            <LoadingSpinner size="lg" className="text-blue-600" />
          </div>
        )}

        {error && (
          <ErrorState
            message={locale === 'te' ? 'బస్సు సమాచారం లోడ్ కాలేదు' : 'Could not load bus stop information'}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && (!locations || locations.length === 0) && (
          <EmptyState
            message={locale === 'te' ? 'బస్సు స్టాప్ సమాచారం అందుబాటులో లేదు' : 'No bus stop information available'}
          />
        )}

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {locations?.map((location) => (
            <div key={location.id} className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
              <div>
                <div className="flex items-start gap-3.5 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 shadow-inner">
                    <Bus size={22} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-(--color-text)">
                      {locale === 'te' ? location.name_te : location.name}
                    </h3>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5 flex items-center gap-1">
                      <Route size={12} />
                      <span>{locale === 'te' ? 'దేవస్థానం కనెక్టింగ్ స్టాప్' : 'Temple Transit Point'}</span>
                    </p>
                  </div>
                </div>

                {location.description && (
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed bg-blue-50/40 p-3 rounded-xl border border-blue-100/60 mb-4">
                    {location.description}
                  </p>
                )}

                {location.address && (
                  <p className="text-xs text-text-muted mb-3 flex items-center gap-1.5">
                    <MapPin size={11} className="shrink-0" aria-hidden />
                    <span>{location.address}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-border mt-2">
                <Link
                  href={`/navigate?location=${location.id}`}
                  className="btn btn-primary w-full text-xs font-bold py-2 flex items-center justify-center gap-1.5"
                  aria-label={`Navigate to ${locale === 'te' ? location.name_te : location.name}`}
                >
                  <Navigation size={15} aria-hidden />
                  <span>{locale === 'te' ? 'ఈ బస్ స్టాప్‌కి మార్గం' : t('navigate')}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
