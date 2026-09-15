'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Home, Eye, Car, Plus, Utensils, Bus,
  AlertTriangle, Navigation, Shield, Flame
} from 'lucide-react';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { cn } from '@/lib/utils';

const DESKTOP_NAV_LINKS = [
  { href: '/',          icon: Home,          labelKey: 'home',      labelTe: 'హోమ్',       isEmergency: false },
  { href: '/darshan',   icon: Eye,           labelKey: 'darshan',   labelTe: 'దర్శనం',     isEmergency: false },
  { href: '/parking',   icon: Car,           labelKey: 'parking',   labelTe: 'పార్కింగ్',   isEmergency: false },
  { href: '/medical',   icon: Plus,          labelKey: 'medical',   labelTe: 'వైద్యం',      isEmergency: false },
  { href: '/food',      icon: Utensils,      labelKey: 'food',      labelTe: 'అన్నదానం',   isEmergency: false },
  { href: '/bus',       icon: Bus,           labelKey: 'bus',       labelTe: 'బస్సు',       isEmergency: false },
  { href: '/navigate',  icon: Navigation,    labelKey: 'navigate',  labelTe: 'మ్యాప్',      isEmergency: false },
  { href: '/emergency', icon: AlertTriangle, labelKey: 'emergency', labelTe: 'ఎమర్జెన్సీ',  isEmergency: true  },
] as const;

export function PilgrimDesktopHeader() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const locale = useLocale();

  // Prevent hydration mismatch: render header only after client mounts
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <header className="hidden md:flex sticky top-0 z-40 bg-gradient-to-r from-[#7a1425] via-[#9b1b30] to-[#7a1425] text-white shadow-lg border-b border-white/10 h-16 items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between gap-4">

          {/* Logo & Temple Branding */}
          <Link
            href="/"
            className="flex items-center gap-3 group text-white no-underline focus:outline-none flex-shrink-0"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/30 border border-amber-300/50 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform flex-shrink-0">
              <Flame size={20} className="text-amber-300" aria-hidden />
            </div>
            <div className="hidden lg:block">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white whitespace-nowrap">
                  Sri Kanaka Durga Temple
                </span>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                  Dasara 2026
                </span>
              </div>
              <p className="text-xs text-white/70 whitespace-nowrap">
                Smart Navigation System • Vijayawada
              </p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          {mounted && (
            <nav className="flex items-center gap-0.5 flex-1 justify-center" aria-label="Desktop navigation">
              {DESKTOP_NAV_LINKS.map(({ href, icon: Icon, labelKey, labelTe, isEmergency }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap',
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
                    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                    <span>{locale === 'te' ? labelTe : t(labelKey as any)}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {mounted && <LanguageToggle currentLocale={locale} />}
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 transition-colors shadow-sm whitespace-nowrap"
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
