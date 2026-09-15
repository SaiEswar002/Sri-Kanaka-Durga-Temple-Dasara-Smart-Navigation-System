import { PilgrimDesktopHeader } from '@/components/pilgrim/desktop-header';
import { PilgrimBottomNav } from '@/components/pilgrim/bottom-nav';
import type { ReactNode } from 'react';

export default function PilgrimLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pilgrim-shell">
      <PilgrimDesktopHeader />
      <main className="pilgrim-content" id="main-content">
        {children}
      </main>
      <PilgrimBottomNav />
    </div>
  );
}
