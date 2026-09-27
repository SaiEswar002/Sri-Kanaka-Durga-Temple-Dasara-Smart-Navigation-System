'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Home, Eye, Car, Cross, Bus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',          icon: Home,          label: 'Home',       labelTe: 'హోమ్',       isEmergency: false },
  { href: '/darshan',   icon: Eye,           label: 'Darshan',    labelTe: 'దర్శనం',     isEmergency: false },
  { href: '/parking',   icon: Car,           label: 'Parking',    labelTe: 'పార్కింగ్',   isEmergency: false },
  { href: '/medical',   icon: Cross,         label: 'Medical',    labelTe: 'వైద్యం',      isEmergency: false },
  { href: '/bus',       icon: Bus,           label: 'Bus',        labelTe: 'బస్సు',       isEmergency: false },
  { href: '/emergency', icon: AlertTriangle, label: 'SOS',        labelTe: 'SOS',         isEmergency: true  },
] as const;

export function PilgrimBottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, icon: Icon, label, labelTe, isEmergency }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'bottom-nav-item',
              isActive && 'active',
              isEmergency && 'emergency'
            )}
            aria-label={locale === 'te' ? labelTe : label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Emergency gets a special pill background */}
            {isEmergency ? (
              <div
                className="flex items-center justify-center w-10 h-8 rounded-lg mb-0.5"
                style={{ background: 'rgba(198, 40, 40, 0.1)' }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              </div>
            ) : (
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
            )}
            <span>{locale === 'te' ? labelTe : label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
