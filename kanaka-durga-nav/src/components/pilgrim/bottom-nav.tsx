'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Eye, Car, Plus, Utensils, Bus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',           icon: Home,         labelKey: 'home'      },
  { href: '/darshan',    icon: Eye,          labelKey: 'darshan'   },
  { href: '/parking',    icon: Car,          labelKey: 'parking'   },
  { href: '/medical',    icon: Plus,         labelKey: 'medical'   },
  { href: '/bus',        icon: Bus,          labelKey: 'bus'       },
  { href: '/emergency',  icon: AlertTriangle, labelKey: 'emergency' },
] as const;

export function PilgrimBottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn('bottom-nav-item', isActive && 'active')}
            aria-label={t(labelKey)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.5 : 1.8}
              aria-hidden="true"
            />
            <span>{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
