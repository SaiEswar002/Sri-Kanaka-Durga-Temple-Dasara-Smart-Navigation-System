'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Map, Users, Car, Clock, Megaphone,
  AlertTriangle, Camera, MapPin, GitBranch, Bus, Settings, LogOut,
  ChevronRight, Shield, Menu, X, ArrowLeft, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/map',       icon: Map,              label: 'Live Map' },
      { href: '/admin/crowd',     icon: Users,            label: 'Crowd Levels' },
      { href: '/admin/queues',    icon: Clock,            label: 'Darshan Queues' },
      { href: '/admin/parking',   icon: Car,              label: 'Parking' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/announcements', icon: Megaphone,     label: 'Announcements' },
      { href: '/admin/closures',      icon: GitBranch,     label: 'Route Closures' },
      { href: '/admin/emergency',     icon: AlertTriangle, label: 'Emergency' },
      { href: '/admin/buses',         icon: Bus,           label: 'Buses' },
    ],
  },
  {
    label: 'Data',
    items: [
      { href: '/admin/sectors',     icon: MapPin, label: 'Sectors' },
      { href: '/admin/sub-sectors', icon: MapPin, label: 'Sub-Sectors' },
      { href: '/admin/locations',   icon: MapPin, label: 'Locations' },
      { href: '/admin/cameras',     icon: Camera, label: 'Cameras' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/users',       icon: Shield,         label: 'Users & Roles' },
      { href: '/admin/audit-logs',  icon: ClipboardList,  label: 'Audit Logs' },
      { href: '/admin/system',      icon: Settings,       label: 'System' },
    ],
  },
];

// Temple diya icon for sidebar brand
function TempleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 6 10.5 7 12 7C13.5 7 14.5 6 14.5 4.5C14.5 3 13.5 2 12 2Z" fill="#D4A017"/>
      <path d="M12 8C9 8 7 10 7 13C7 16 9 18 12 22C15 18 17 16 17 13C17 10 15 8 12 8Z" fill="#9B1C31"/>
      <circle cx="12" cy="13" r="2" fill="#FFF0F2" opacity="0.9"/>
    </svg>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    document.cookie = 'admin_demo=; path=/; max-age=0; SameSite=Lax';
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const navContent = (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>

      {/* ── Brand ──────────────────────────────────────────── */}
      <div
        className="px-4 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 no-underline group" aria-label="Admin Dashboard">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
            style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)' }}
          >
            <TempleIcon />
          </div>
          <div>
            <p
              className="text-sm font-bold leading-tight"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
            >
              Kanaka Durga
            </p>
            <p
              className="text-[11px] font-medium"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
            >
              Command Center
            </p>
          </div>
        </Link>
        {isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navigation Groups ─────────────────────────────── */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4" aria-label="Admin navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className="px-2.5 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all',
                      isActive
                        ? 'text-white shadow-sm'
                        : 'hover:text-gray-900'
                    )}
                    style={isActive
                      ? { background: 'var(--color-primary)', color: 'white', fontFamily: 'var(--font-sans)' }
                      : { color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }
                    }
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={15} aria-hidden className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={13} aria-hidden />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Gold accent divider */}
      <div className="divider-temple mx-4" />

      {/* ── Bottom Links ──────────────────────────────────── */}
      <div className="p-3 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}
        >
          <ArrowLeft size={14} />
          <span>View Pilgrim Site</span>
        </Link>
        <button
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors w-full text-left cursor-pointer"
          style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-sans)' }}
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut size={14} aria-hidden />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 h-14 px-4 flex items-center justify-between z-30 shadow-sm"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text)' }}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <span
            className="font-bold text-sm"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
          >
            Admin Command Center
          </span>
        </div>
        <Link
          href="/"
          className="text-xs font-bold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-primary)' }}
        >
          Pilgrim App →
        </Link>
      </div>

      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'md:hidden fixed inset-y-0 left-0 w-72 z-50 transform transition-transform duration-200 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 h-screen sticky top-0 z-30" aria-label="Admin sidebar">
        {navContent}
      </aside>
    </>
  );
}
