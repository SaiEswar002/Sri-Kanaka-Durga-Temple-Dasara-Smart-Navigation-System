'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Home, Navigation, Car, Cross, Utensils, Shield
} from 'lucide-react';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { cn } from '@/lib/utils';

const DESKTOP_NAV_LINKS = [
  { href: '/',         icon: Home,       labelKey: 'home',     labelTe: 'హోమ్' },
  { href: '/navigate', icon: Navigation, labelKey: 'navigate', labelTe: 'మ్యాప్' },
  { href: '/parking',  icon: Car,        labelKey: 'parking',  labelTe: 'పార్కింగ్' },
  { href: '/medical',  icon: Cross,      labelKey: 'medical',  labelTe: 'వైద్యం' },
  { href: '/food',     icon: Utensils,   labelKey: 'food',     labelTe: 'అన్నదానం' },
] as const;

export function PilgrimDesktopHeader() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const locale = useLocale();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <header
      className="pilgrim-header hidden md:flex sticky top-0 z-40 text-white shadow-lg h-16 items-center"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="flex items-center justify-between gap-4">

          {/* ── Temple Brand ─────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center gap-3 group text-white no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg shrink-0"
            aria-label="Sri Kanaka Durga Temple — Home"
          >
            {/* Durga Maa photo logo */}
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-inner group-hover:scale-105 transition-transform shrink-0"
              style={{ border: '2px solid rgba(242,201,76,0.5)', boxShadow: '0 0 0 2px rgba(212,160,23,0.2)' }}
            >
              <Image
                src="/durgamaatha.jpeg"
                alt="Sri Kanaka Durga Maa"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Name — Cinzel for temple brand */}
            <div className="hidden lg:block">
              <p
                className="font-display text-sm font-semibold tracking-wide text-white leading-tight whitespace-nowrap"
                style={{ fontFamily: "'Cinzel', Georgia, serif", fontWeight: 600, letterSpacing: '0.04em' }}
              >
                Sri Kanaka Durga Temple
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-white/65 whitespace-nowrap" style={{ fontFamily: "'Forum', Georgia, serif" }}>
                  Smart Navigation • Vijayawada
                </p>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap"
                  style={{ background: 'rgba(212,160,23,0.35)', color: '#F2C94C', border: '1px solid rgba(242,201,76,0.3)' }}
                >
                  Dasara 2026
                </span>
              </div>
            </div>
          </Link>

          {/* ── Center Nav Links ──────────────────────────────── */}
          {mounted && (
            <nav className="flex items-center gap-1 flex-1 justify-center" aria-label="Desktop navigation">
              {DESKTOP_NAV_LINKS.map(({ href, icon: Icon, labelKey, labelTe }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap min-h-[36px]',
                      isActive
                        ? 'bg-white/18 text-white shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      size={14}
                      strokeWidth={isActive ? 2.5 : 2}
                      aria-hidden
                    />
                    <span>{locale === 'te' ? labelTe : t(labelKey as Parameters<typeof t>[0])}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* ── Right Actions ─────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {mounted && <LanguageToggle currentLocale={locale} />}
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
              style={{
                background: 'rgba(212,160,23,0.18)',
                color: '#F2C94C',
                border: '1px solid rgba(212,160,23,0.3)',
              }}
              title="Admin Command Center"
            >
              <Shield size={13} aria-hidden />
              <span>Admin</span>
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}
