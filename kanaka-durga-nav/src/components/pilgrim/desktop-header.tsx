'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Home, Eye, Car, Plus, Utensils, Bus,
  AlertTriangle, Map, Shield, Navigation
} from 'lucide-react';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { cn } from '@/lib/utils';

const DESKTOP_NAV_LINKS = [
  { href: '/',          icon: Home,          labelKey: 'home',      labelTe: 'హోమ్',      isEmergency: false },
  { href: '/darshan',   icon: Eye,           labelKey: 'darshan',   labelTe: 'దర్శనం',    isEmergency: false },
  { href: '/parking',   icon: Car,           labelKey: 'parking',   labelTe: 'పార్కింగ్',  isEmergency: false },
  { href: '/medical',   icon: Plus,          labelKey: 'medical',   labelTe: 'వైద్యం',     isEmergency: false },
  { href: '/food',      icon: Utensils,      labelKey: 'food',      labelTe: 'అన్నదానం',  isEmergency: false },
  { href: '/bus',       icon: Bus,           labelKey: 'bus',       labelTe: 'బస్సు',      isEmergency: false },
  { href: '/navigate',  icon: Navigation,    labelKey: 'navigate',  labelTe: 'మ్యాప్',     isEmergency: false },
  { href: '/emergency', icon: AlertTriangle, labelKey: 'emergency', labelTe: 'ఎమర్జెన్సీ', isEmergency: true },
] as const;

export function PilgrimDesktopHeader() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const locale = useLocale();

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-gradient-to-r from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Temple Branding */}
          <Link
            href="/"
            className="flex items-center gap-3 group text-white no-underline focus:outline-none"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/30 border border-amber-300/50 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 6 10.5 7 12 7C13.5 7 14.5 6 14.5 4.5C14.5 3 13.5 2 12 2Z" fill="#f59e0b"/>
                <path d="M12 8C9 8 7 10 7 13C7 16 9 18 12 22C15 18 17 16 17 13C17 10 15 8 12 8Z" fill="#fbbf24"/>
                <circle cx="12" cy="13" r="2.5" fill="#fff8e1" opacity="0.9"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide text-white">
                  {locale === 'te' ? 'శ్రీ కనక దుర్గమ్మ దేవస్థానం' : 'Sri Kanaka Durga Temple'}
                </span>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Dasara 2026
                </span>
              </div>
              <p className="text-xs text-white/70">
                {locale === 'te' ? 'స్మార్ట్ నావిగేషన్ సిస్టమ్ • విజయవాడ' : 'Smart Navigation System • Vijayawada'}
              </p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="flex items-center gap-1" aria-label="Desktop navigation">
            {DESKTOP_NAV_LINKS.map(({ href, icon: Icon, labelKey, labelTe, isEmergency }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                    isActive
                      ? isEmergency
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white/20 text-white shadow-sm'
                      : isEmergency
                        ? 'text-red-300 hover:bg-red-600/30 hover:text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                  <span>{locale === 'te' ? labelTe : t(labelKey as any)}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Language Toggle & Admin Link */}
          <div className="flex items-center gap-3">
            <LanguageToggle currentLocale={locale} />

            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 transition-colors shadow-sm"
              title="Admin Command Center"
            >
              <Shield size={14} className="text-amber-300" aria-hidden />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
