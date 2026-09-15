'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Map, Users, Car, Clock, Megaphone,
  AlertTriangle, Camera, MapPin, GitBranch, Bus, Settings, LogOut,
  ChevronRight, Shield, Menu, X, ArrowLeft
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
      { href: '/admin/crowd',     icon: Users,            label: 'Crowd' },
      { href: '/admin/queues',    icon: Clock,            label: 'Darshan Queues' },
      { href: '/admin/parking',   icon: Car,              label: 'Parking' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/announcements', icon: Megaphone,      label: 'Announcements' },
      { href: '/admin/closures',      icon: GitBranch,      label: 'Route Closures' },
      { href: '/admin/emergency',     icon: AlertTriangle,  label: 'Emergency' },
      { href: '/admin/buses',         icon: Bus,            label: 'Buses' },
    ],
  },
  {
    label: 'Data',
    items: [
      { href: '/admin/sectors',       icon: MapPin,    label: 'Sectors' },
      { href: '/admin/sub-sectors',   icon: MapPin,    label: 'Sub-Sectors' },
      { href: '/admin/locations',     icon: MapPin,    label: 'Locations' },
      { href: '/admin/cameras',       icon: Camera,    label: 'Cameras' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/users',   icon: Shield,   label: 'Users & Roles' },
      { href: '/admin/system',  icon: Settings, label: 'System' },
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
    window.location.href = '/admin/login';
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-border">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 text-decoration-none">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-(--color-primary-muted)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 6 10.5 7 12 7C13.5 7 14.5 6 14.5 4.5C14.5 3 13.5 2 12 2Z" fill="#c9a227"/>
              <path d="M12 8C9 8 7 10 7 13C7 16 9 18 12 22C15 18 17 16 17 13C17 10 15 8 12 8Z" fill="#9b1b30"/>
              <circle cx="12" cy="13" r="2" fill="#fdf0f2" opacity="0.9"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm text-(--color-text) leading-tight">Kanaka Durga</p>
            <p className="text-[11px] text-text-muted font-medium">Command Center</p>
          </div>
        </Link>
        {isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 rounded-lg"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4" aria-label="Admin navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
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
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={16} aria-hidden className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={14} aria-hidden />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom links: Pilgrim site & Logout */}
      <div className="p-3 border-t border-border space-y-1 bg-gray-50/50">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={15} />
          <span>View Pilgrim Site</span>
        </Link>
        <button
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors w-full text-left cursor-pointer"
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut size={15} aria-hidden />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar toggle button */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-border px-4 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm text-gray-900">Admin Command Center</span>
        </div>
        <Link
          href="/"
          className="text-xs font-bold text-primary hover:underline"
        >
          Pilgrim App →
        </Link>
      </div>

      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
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

      {/* Desktop Sidebar (Fixed on Laptop) */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-30" aria-label="Admin sidebar">
        {navContent}
      </aside>
    </>
  );
}
