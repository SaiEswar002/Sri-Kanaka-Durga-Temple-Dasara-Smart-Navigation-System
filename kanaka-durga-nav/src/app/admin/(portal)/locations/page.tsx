import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Locations — Admin' };

export default async function AdminLocationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: locations } = await supabase
    .from('locations')
    .select('*, category:location_categories(name, slug), sector:sectors(name)')
    .order('display_order')
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-sm text-gray-500 mt-1">All facility locations across the temple complex</p>
        </div>
        <button className="btn btn-primary btn-sm" disabled>+ Add Location</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Category</th>
              <th className="text-left px-4 py-3 font-semibold">Sector</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Demo?</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {locations?.map((loc) => (
              <tr key={loc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium max-w-xs truncate">{loc.name}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">
                  {Array.isArray(loc.category) ? loc.category[0]?.name : (loc.category as {name?: string} | null)?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-xs">
                  {Array.isArray(loc.sector) ? loc.sector[0]?.name : (loc.sector as {name?: string} | null)?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'badge border',
                    loc.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  )}>
                    {loc.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {loc.is_demo_data ? (
                    <span className="text-blue-500 font-medium">DEMO</span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
