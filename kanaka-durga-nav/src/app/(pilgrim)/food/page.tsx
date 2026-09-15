'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Utensils, Navigation, Clock, MapPin, Heart } from 'lucide-react';
import { useLocations } from '@/hooks/use-data';
import { LoadingSpinner, ErrorState, EmptyState, DemoBanner } from '@/components/shared/status-components';
import Link from 'next/link';

export default function FoodPage() {
  const t = useTranslations('food');
  const locale = useLocale();
  const { data: locations, isLoading, error, refetch } = useLocations('food');

  return (
    <div className="w-full">
      <header className="page-header" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }}>
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Utensils size={24} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
              <p className="text-white/80 text-xs sm:text-sm">
                {locale === 'te' ? 'నిత్య అన్నదానం & ఉచిత ప్రసాద వితరణ కేంద్రాలు' : 'Nitya Annadanam & Free Prasadam Distribution Centers'}
              </p>
            </div>
          </div>
          <Link
            href="/navigate?category=food"
            className="hidden sm:inline-flex items-center gap-2 bg-white hover:bg-orange-50 text-orange-950 font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
          >
            <Navigation size={14} />
            <span>{locale === 'te' ? 'అన్నదాన భవనాల మ్యాప్' : 'View Annadanam Map'}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <DemoBanner />

        {/* Annadanam advisory badge */}
        <div className="bg-orange-50/90 border border-orange-200 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 shadow-inner border border-orange-200">
            <Utensils size={22} aria-hidden />
          </div>
          <div>
            <h2 className="font-bold text-base text-orange-950">
              {locale === 'te' ? 'శ్రీ దుర్గా మల్లేశ్వర స్వామి నిత్య అన్నదాన పథకం' : 'Nitya Annadanam Scheme — 24 Hours Service'}
            </h2>
            <p className="text-xs text-orange-900/80 mt-0.5 leading-relaxed">
              {locale === 'te'
                ? 'దసరా ఉత్సవాల సందర్భంగా భక్తులందరికీ పవిత్ర ప్రసాదం మరియు నిరంతర భోజన వసతి కల్పించబడుతోంది.'
                : 'Free holy prasadam meals are distributed continuously to all devotees throughout Dasara festival days.'}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center p-16">
            <LoadingSpinner size="lg" className="text-orange-600" />
          </div>
        )}

        {error && (
          <ErrorState
            message={locale === 'te' ? 'ఆహార స్థలాలు లోడ్ కాలేదు' : 'Could not load food locations'}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && (!locations || locations.length === 0) && (
          <EmptyState
            message={locale === 'te' ? 'ఆహార సమాచారం అందుబాటులో లేదు' : 'No food information available'}
          />
        )}

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {locations?.map((location) => (
            <div key={location.id} className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
              <div>
                <div className="flex items-start gap-3.5 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 text-orange-600 shadow-inner">
                    <Utensils size={22} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-(--color-text)">
                      {locale === 'te' ? location.name_te : location.name}
                    </h3>
                    {location.operating_hours && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-700 font-semibold mt-1">
                        <Clock size={12} />
                        <span>{location.operating_hours}</span>
                      </div>
                    )}
                  </div>
                </div>

                {location.description && (
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed bg-orange-50/40 p-3 rounded-xl border border-orange-100/60 mb-4">
                    {locale === 'te' ? location.description_te : location.description}
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
                  <span>{locale === 'te' ? 'ఈ భవనానికి మార్గం' : t('navigate')}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
