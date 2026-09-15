'use client';

import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface LanguageToggleProps {
  className?: string;
  currentLocale: string;
}

export function LanguageToggle({ className, currentLocale }: LanguageToggleProps) {
  const { setLocale } = useLocale();

  return (
    <div
      className={cn('flex items-center gap-1 bg-white/20 rounded-full p-1', className)}
      role="group"
      aria-label="Language selection"
    >
      <button
        onClick={() => setLocale('en')}
        className={cn(
          'px-3 py-1 rounded-full text-sm font-semibold transition-all',
          currentLocale === 'en'
            ? 'bg-white text-primary'
            : 'text-white/80 hover:text-white'
        )}
        aria-pressed={currentLocale === 'en'}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => setLocale('te')}
        className={cn(
          'px-3 py-1 rounded-full text-sm font-semibold transition-all',
          currentLocale === 'te'
            ? 'bg-white text-primary'
            : 'text-white/80 hover:text-white'
        )}
        aria-pressed={currentLocale === 'te'}
        aria-label="తెలుగులో మార్చు"
      >
        తె
      </button>
    </div>
  );
}
