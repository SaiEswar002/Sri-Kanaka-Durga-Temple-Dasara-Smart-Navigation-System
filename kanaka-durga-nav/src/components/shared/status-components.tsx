'use client';

import { cn } from '@/lib/utils';
import type { CrowdLevel } from '@/types';
import { CROWD_LEVEL_CONFIG } from '@/lib/utils';
import { AlertTriangle, Info, Wifi } from 'lucide-react';

interface CrowdBadgeProps {
  level: CrowdLevel;
  showLabel?: boolean;
  locale?: string;
  className?: string;
}

export function CrowdBadge({ level, showLabel = true, locale = 'en', className }: CrowdBadgeProps) {
  const config = CROWD_LEVEL_CONFIG[level];
  return (
    <span className={cn('badge', config.bg, config.color, 'border', className)}>
      <span className="status-dot" style={{ background: 'currentColor' }} />
      {showLabel && (locale === 'te' ? config.label_te : config.label)}
    </span>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div
      className={cn(
        'border-2 border-current border-t-transparent rounded-full animate-spin',
        sizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message = 'Something went wrong', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 gap-4 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500">
        <AlertTriangle size={28} aria-hidden />
      </div>
      <p className="text-[var(--color-text-secondary)] text-sm max-w-xs">{message}</p>
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  message?: string;
  icon?: string;
  className?: string;
}

export function EmptyState({ message = 'No data available', icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 gap-3 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-[var(--color-primary-subtle)] border border-[var(--color-primary-muted)] flex items-center justify-center text-[var(--color-primary)]">
        <Info size={26} aria-hidden />
      </div>
      <p className="text-[var(--color-text-muted)] text-sm">{message}</p>
    </div>
  );
}

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  return (
    <div className={cn(
      'bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-700 font-medium flex items-center justify-center gap-2',
      className
    )}>
      <Wifi size={14} aria-hidden className="text-amber-600" />
      <span>You&apos;re offline — showing last known data</span>
    </div>
  );
}

interface DemoBannerProps {
  className?: string;
}

export function DemoBanner({ className }: DemoBannerProps) {
  return (
    <div className={cn(
      'bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-start gap-2',
      className
    )}>
      <Info size={14} className="flex-shrink-0 mt-0.5 text-blue-600" aria-hidden />
      <span>
        <strong>DEMO DATA</strong> — All locations, phone numbers, and capacities shown are
        illustrative placeholders. Real data will be provided by temple authorities.
      </span>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn('skeleton h-4 rounded', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}
