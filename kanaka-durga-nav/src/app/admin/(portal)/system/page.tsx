import type { Metadata } from 'next';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'System — Admin' };

const SERVICES = [
  {
    label: 'Supabase Database',
    icon: '🗄️',
    envVar: 'NEXT_PUBLIC_SUPABASE_URL',
    note: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
  },
  {
    label: 'Map Tile Provider',
    icon: '🗺️',
    envVar: 'NEXT_PUBLIC_MAP_TILE_PROVIDER',
    note: 'Set NEXT_PUBLIC_MAP_TILE_PROVIDER=maptiler|protomaps|osm-fallback',
  },
  {
    label: 'Routing Engine',
    icon: '🧭',
    envVar: 'NEXT_PUBLIC_ROUTING_PROVIDER',
    note: 'Set NEXT_PUBLIC_ROUTING_PROVIDER=osrm and OSRM_BASE_URL',
  },
  {
    label: 'Camera API',
    icon: '📸',
    envVar: 'CAMERA_API_PROVIDER',
    note: 'See CAMERA-API-INTEGRATION.md',
  },
] as const;

export default function AdminSystemPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">System Health</h1>
      <p className="text-sm text-gray-500 mb-6">
        Service status, configuration overview, and integration health.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SERVICES.map((item) => {
          const value = process.env[item.envVar];
          const isConfigured = !!value && !value.startsWith('placeholder');
          return (
            <div key={item.label} className="card p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-bold text-sm">{item.label}</p>
                  <p className={cn('text-xs font-medium', isConfigured ? 'text-green-600' : 'text-amber-600')}>
                    {value ?? 'Not configured'}
                  </p>
                </div>
                <span className={cn(
                  'ml-auto badge border text-xs',
                  isConfigured
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                )}>
                  {isConfigured ? 'OK' : 'Setup needed'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{item.note}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 card p-4">
        <h2 className="font-bold mb-3">Environment Quick Reference</h2>
        <p className="text-xs text-gray-500 mb-2">
          Configure these in your hosting provider&apos;s environment variables for production.
          <strong className="text-red-600"> Never commit .env.local to version control.</strong>
        </p>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto">
          <pre>{`# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only

# Map
NEXT_PUBLIC_MAP_TILE_PROVIDER=maptiler
NEXT_PUBLIC_MAPTILER_API_KEY=...

# Routing
NEXT_PUBLIC_ROUTING_PROVIDER=osrm
OSRM_BASE_URL=http://osrm.internal:5000  # server-only

# Admin
SUPER_ADMIN_EMAILS=admin@temple.org
ADMIN_BOOTSTRAP_SECRET=<openssl rand -base64 32>`}</pre>
        </div>
      </div>
    </div>
  );
}
