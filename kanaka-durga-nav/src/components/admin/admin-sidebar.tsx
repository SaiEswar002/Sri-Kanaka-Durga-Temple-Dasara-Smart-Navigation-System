'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Map, Car, Camera, MapPin, Settings, LogOut,
  ChevronRight, Shield, Menu, X, ArrowLeft, ClipboardList, Layers,
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
      { href: '/admin/parking',   icon: Car,              label: 'Parking' },
    ],
  },
  {
    label: 'Data Management',
    items: [
      { href: '/admin/sectors',     icon: MapPin,  label: 'Sectors' },
      { href: '/admin/sub-sectors', icon: Layers,  label: 'Sub-Sectors' },
      { href: '/admin/locations',   icon: MapPin,  label: 'Locations' },
      { href: '/admin/cameras',     icon: Camera,  label: 'Cameras' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/users',      icon: Shield,        label: 'Users & Roles' },
      { href: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
      { href: '/admin/system',     icon: Settings,      label: 'System' },
    ],
  },
];

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

      {/* ── Brand ──────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 no-underline group" aria-label="Admin Dashboard">
          {/* Durga Maa photo logo */}
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform"
            style={{ border: '1.5px solid var(--color-primary-muted)', boxShadow: '0 0 0 2px var(--color-primary-subtle)' }}>
            <Image
              src="/durgamaatha.jpeg"
              alt="Sri Kanaka Durga"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
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

      {/* ── Navigation Groups ───────────────────────────────────── */}
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
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 no-underline',
                      isActive
                        ? 'text-white shadow-xs'
                        : 'hover:bg-[var(--color-surface-secondary)]'
                    )}
                    style={{
                      background: isActive ? 'var(--color-primary)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-sans)',
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={15}
                        className="shrink-0"
                        style={{ color: isActive ? '#FFFFFF' : 'inherit' }}
                        aria-hidden
                      />
                      <span className="truncate">{label}</span>
                    </div>
                    {isActive && (
                      <ChevronRight size={12} className="opacity-75 shrink-0" aria-hidden />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer / Logout ─────────────────────────────────────── */}
      <div
        className="p-3 border-t space-y-1"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-secondary)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors no-underline"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
        >
          <ArrowLeft size={13} aria-hidden />
          <span>Pilgrim View</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer"
          style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-sans)' }}
          aria-label="Sign out of admin portal"
        >
          <LogOut size={13} aria-hidden />
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-2.5 sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            aria-label="Open menu"
            aria-expanded={isMobileOpen}
          >
            <Menu size={18} />
          </button>
          <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
            <Image
              src="/durgamaatha.jpeg"
              alt="Sri Kanaka Durga"
              width={24}
              height={24}
              className="w-full h-full object-cover"
            />
          </div>
          <span
            className="text-xs font-bold"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
          >
            Kanaka Durga Admin
          </span>
        </div>
        <Link
          href="/"
          className="text-xs font-medium px-2 py-1 rounded transition-colors no-underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Pilgrim App →
        </Link>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <aside
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transition-transform duration-200 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Mobile admin navigation"
      >
        {navContent}
      </aside>

      {/* Desktop Sidebar (Fixed width, full height) */}
      <aside
        className="hidden md:flex flex-col w-56 lg:w-60 h-screen sticky top-0 shrink-0 z-30 select-none"
        aria-label="Admin navigation"
      >
        {navContent}
      </aside>
    </>
  );
}
