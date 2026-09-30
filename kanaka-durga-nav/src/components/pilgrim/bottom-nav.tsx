'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Home, Navigation, Car, Cross, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',         icon: Home,       label: 'Home',       labelTe: 'హోమ్' },
  { href: '/navigate', icon: Navigation, label: 'Map',        labelTe: 'మ్యాప్' },
  { href: '/parking',  icon: Car,        label: 'Parking',    labelTe: 'పార్కింగ్' },
  { href: '/medical',  icon: Cross,      label: 'Medical',    labelTe: 'వైద్యం' },
  { href: '/food',     icon: Utensils,   label: 'Annadanam',  labelTe: 'అన్నదానం' },
] as const;

export function PilgrimBottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  // useSyncExternalStore: React 19 idiomatic hydration guard (no setState in effect)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return null;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, icon: Icon, label, labelTe }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'bottom-nav-item',
              isActive && 'active'
            )}
            aria-label={locale === 'te' ? labelTe : label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
            <span>{locale === 'te' ? labelTe : label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
