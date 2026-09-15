'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Bell, Megaphone } from 'lucide-react';
import { useAnnouncements } from '@/hooks/use-data';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/shared/status-components';
import { PRIORITY_CONFIG, cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Announcement, AnnouncementPriority } from '@/types';

export default function AnnouncementsPage() {
  const t = useTranslations('announcements');
  const locale = useLocale();
  const { data: announcements, isLoading, error, refetch } = useAnnouncements();

  return (
    <div>
      <header className="page-header" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' }}>
        <Bell size={24} aria-hidden />
        <div>
          <h1 className="text-xl font-bold">{t('title')}</h1>
          <p className="text-white/70 text-sm">
            {announcements ? `${announcements.length} active` : 'Live updates'}
          </p>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {isLoading && <div className="flex justify-center p-12"><LoadingSpinner size="lg" className="text-purple-600" /></div>}
        {error && <ErrorState message="Could not load announcements" onRetry={() => refetch()} />}
        {!isLoading && !error && (!announcements || announcements.length === 0) && (
          <EmptyState icon={Megaphone} message={t('noAnnouncements')} />
        )}

        {announcements?.map((ann) => (
          <AnnouncementCard key={ann.id} announcement={ann} locale={locale} t={t} />
        ))}
      </div>
    </div>
  );
}

function AnnouncementCard({ announcement: ann, locale, t }: { announcement: Announcement; locale: string; t: ReturnType<typeof useTranslations> }) {
  const pc = PRIORITY_CONFIG[ann.priority as AnnouncementPriority];
  const isUrgent = ann.priority === 'URGENT';

  return (
    <article
      className={cn(
        'card p-4',
        isUrgent && 'border-red-200 bg-red-50'
      )}
      aria-label={locale === 'te' ? ann.title_te : ann.title}
    >
      <div className="flex items-start gap-3">
        <span className={cn('badge border shrink-0 mt-0.5', pc.color)}>
          {['INFO', 'NOTICE', 'WARNING', 'URGENT'].includes(ann.priority)
            ? t(`priority.${ann.priority}` as 'priority.INFO')
            : ann.priority}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className={cn('font-bold text-sm leading-tight', isUrgent ? 'text-red-800' : 'text-(--color-text)')}>
            {locale === 'te' ? ann.title_te : ann.title}
          </h2>
          <p className={cn('text-sm mt-2 leading-relaxed', isUrgent ? 'text-red-700' : 'text-text-secondary')}>
            {locale === 'te' ? ann.message_te : ann.message}
          </p>
          <p className="text-xs text-text-muted mt-2">
            {formatDistanceToNow(new Date(ann.starts_at), { addSuffix: true })}
            {ann.is_demo_data && <span className="ml-2 text-blue-500 font-medium">[DEMO]</span>}
          </p>
        </div>
      </div>
    </article>
  );
}
