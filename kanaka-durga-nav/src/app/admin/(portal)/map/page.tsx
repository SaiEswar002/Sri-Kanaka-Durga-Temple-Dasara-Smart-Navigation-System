import type { Metadata } from 'next';
import { AdminMapClient } from './admin-map-client';

export const metadata: Metadata = { title: 'Live Map — Temple Command Center' };

export default function AdminMapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Temple Command Center Live Map</h1>
        <p className="text-xs sm:text-sm text-gray-500">
          Real-time GIS map of all sectors, sub-sectors, ghat roads, key facilities, and parking hubs.
        </p>
      </div>

      <AdminMapClient />
    </div>
  );
}
