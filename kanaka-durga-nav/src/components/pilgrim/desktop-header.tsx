'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Home, Eye, Car, Cross, Utensils, Bus,
  AlertTriangle, Navigation, Shield
} from 'lucide-react';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { cn } from '@/lib/utils';

const DESKTOP_NAV_LINKS = [
  { href: '/',          icon: Home,          labelKey: 'home',      labelTe: 'హోమ్',       isEmergency: false },
  { href: '/darshan',   icon: Eye,           labelKey: 'darshan',   labelTe: 'దర్శనం',     isEmergency: false },
  { href: '/parking',   icon: Car,           labelKey: 'parking',   labelTe: 'పార్కింగ్',   isEmergency: false },
  { href: '/medical',   icon: Cross,         labelKey: 'medical',   labelTe: 'వైద్యం',      isEmergency: false },
  { href: '/food',      icon: Utensils,      labelKey: 'food',      labelTe: 'అన్నదానం',   isEmergency: false },
  { href: '/bus',       icon: Bus,           labelKey: 'bus',       labelTe: 'బస్సు',       isEmergency: false },
  { href: '/navigate',  icon: Navigation,    labelKey: 'navigate',  labelTe: 'మ్యాప్',      isEmergency: false },
  { href: '/emergency', icon: AlertTriangle, labelKey: 'emergency', labelTe: 'ఎమర్జెన్సీ',  isEmergency: true  },
] as const;

// Flame/lamp SVG for temple brand icon
function DiyaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 6 10.5 7 12 7C13.5 7 14.5 6 14.5 4.5C14.5 3 13.5 2 12 2Z" fill="#F2C94C"/>
      <path d="M12 8C9 8 7 10 7 13C7 16 9 18 12 22C15 18 17 16 17 13C17 10 15 8 12 8Z" fill="#FBBF24" opacity="0.9"/>
      <circle cx="12" cy="13" r="2.5" fill="#FFF8E7" opacity="0.95"/>
    </svg>
  );
}

export function PilgrimDesktopHeader() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const locale = useLocale();

  // useSyncExternalStore is the React 19 idiomatic pattern for hydration guards.
  // It avoids calling setState inside a useEffect (react-hooks/set-state-in-effect).
  const mounted = useSyncExternalStore(
    () => () => {},           // subscribe — no-op (no external store to subscribe to)
    () => true,               // getSnapshot (client) — always mounted on client
    () => false,              // getServerSnapshot — never mounted on server
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
            {/* Diya flame icon */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0"
              style={{ background: 'rgba(212,160,23,0.2)', border: '1.5px solid rgba(242,201,76,0.4)' }}
            >
              <DiyaIcon />
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
            <nav className="flex items-center gap-0.5 flex-1 justify-center" aria-label="Desktop navigation">
              {DESKTOP_NAV_LINKS.map(({ href, icon: Icon, labelKey, labelTe, isEmergency }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap min-h-[36px]',
                      isEmergency
                        ? isActive
                          ? 'bg-red-600 text-white shadow-md'
                          : 'text-red-300 hover:bg-red-700/40 hover:text-white border border-red-500/30'
                        : isActive
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
