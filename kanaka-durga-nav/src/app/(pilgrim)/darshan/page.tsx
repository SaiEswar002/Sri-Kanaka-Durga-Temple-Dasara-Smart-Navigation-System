'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Eye, Navigation, Clock, Users, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDarshanQueues } from '@/hooks/use-data';
import { LoadingSpinner, ErrorState, EmptyState, DemoBanner } from '@/components/shared/status-components';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { DarshanQueue } from '@/types';

const STATUS_COLORS = {
  OPEN:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED:    'bg-gray-100 text-gray-600 border-gray-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
  FULL:      'bg-red-50 text-red-700 border-red-200',
} as const;

export default function DarshanPage() {
  const t = useTranslations('darshan');
  const locale = useLocale();
  const { data: queues, isLoading, error, refetch } = useDarshanQueues();

  return (
    <div className="w-full">
      {/* Header */}
      <header className="page-header">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Eye size={24} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
              <p className="text-white/80 text-xs sm:text-sm">
                {locale === 'te' ? 'ప్రత్యక్ష క్యూ లైన్ల నిరీక్షణ సమయం & సమాచారం' : 'Live darshan queue wait times & real-time occupancy'}
              </p>
            </div>
          </div>
          <Link
            href="/navigate?category=darshan"
            className="hidden sm:inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
          >
            <Navigation size={14} />
            <span>{locale === 'te' ? 'క్యూ వద్దకు నావిగేట్ చేయండి' : 'Navigate to Queues'}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <DemoBanner />

        {isLoading && (
          <div className="flex justify-center p-16">
            <LoadingSpinner size="lg" className="text-primary" />
          </div>
        )}

        {error && (
          <ErrorState
            message={locale === 'te' ? 'క్యూ సమాచారం లోడ్ కాలేదు' : 'Could not load queue information'}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && (!queues || queues.length === 0) && (
          <EmptyState
            message={locale === 'te' ? 'ప్రస్తుతం క్యూ సమాచారం అందుబాటులో లేదు' : 'No queue information available'}
          />
        )}

        {/* Responsive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {queues?.map((queue) => (
            <QueueCard key={queue.id} queue={queue} locale={locale} t={t} />
          ))}
        </div>

        {/* Navigate to Darshan CTA for Mobile */}
        {queues && queues.length > 0 && (
          <div className="sm:hidden pt-2">
            <Link
              href="/navigate?category=darshan"
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
            >
              <Navigation size={20} aria-hidden />
              <span>{t('navigate')}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function QueueCard({ queue, locale, t }: { queue: DarshanQueue; locale: string; t: ReturnType<typeof useTranslations> }) {
  const statusColor = STATUS_COLORS[queue.status] ?? STATUS_COLORS.OPEN;
  const occupancyPct = queue.max_capacity
    ? Math.round((queue.current_count / queue.max_capacity) * 100)
    : null;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      <div>
        {/* Queue name + status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-(--color-text)">
              {locale === 'te' ? queue.name_te : queue.name}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('badge border text-xs font-semibold px-2.5 py-0.5', statusColor)}>
                {['OPEN', 'CLOSED', 'SUSPENDED', 'FULL'].includes(queue.status)
                  ? t(`status.${queue.status}` as 'status.OPEN')
                  : queue.status}
              </span>
              <span className="badge bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                {['GENERAL', 'SPECIAL', 'VIP', 'DIVYANG', 'SEVAS'].includes(queue.queue_type)
                  ? t(`queueType.${queue.queue_type}` as 'queueType.GENERAL')
                  : queue.queue_type}
              </span>
            </div>
          </div>
        </div>

        {/* Wait time + count */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface-alt rounded-xl p-3.5 text-center border border-black/5">
            <div className="flex items-center justify-center gap-1.5 text-text-muted mb-1">
              <Clock size={15} aria-hidden />
              <span className="text-xs font-medium">{t('waitTime')}</span>
            </div>
            <p className="text-2xl font-black text-primary">
              {queue.estimated_wait_minutes ?? '—'}
              <span className="text-xs font-normal text-text-muted ml-1">{t('minutes')}</span>
            </p>
          </div>

          <div className="bg-surface-alt rounded-xl p-3.5 text-center border border-black/5">
            <div className="flex items-center justify-center gap-1.5 text-text-muted mb-1">
              <Users size={15} aria-hidden />
              <span className="text-xs font-medium">{t('currentCount')}</span>
            </div>
            <p className="text-2xl font-black text-(--color-text)">
              {queue.current_count.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Capacity bar */}
        {occupancyPct !== null && (
          <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex justify-between text-xs font-semibold text-text-muted mb-1.5">
              <span>{locale === 'te' ? 'క్యూ సామర్థ్యం' : 'Queue Occupancy'}</span>
              <span className={cn(
                occupancyPct < 50 ? 'text-emerald-700' :
                occupancyPct < 80 ? 'text-amber-700' : 'text-red-700'
              )}>{occupancyPct}%</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  occupancyPct < 50 ? 'bg-emerald-500' :
                  occupancyPct < 80 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                role="progressbar"
                aria-valuenow={occupancyPct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        {queue.notes && (
          <p className="text-xs text-text-muted leading-relaxed bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
            {locale === 'te' ? queue.notes_te : queue.notes}
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-border mt-4">
        <Link
          href={`/navigate?location=${queue.location_id || ''}`}
          className="btn btn-outline w-full text-xs font-bold py-2 flex items-center justify-center gap-1.5"
        >
          <Navigation size={14} />
          <span>{locale === 'te' ? 'ఈ క్యూకి మార్గం' : 'Directions to this Queue'}</span>
        </Link>
      </div>
    </div>
  );
}
