import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Cameras — Admin' };

export default async function AdminCamerasPage() {
  const supabase = await createServerSupabaseClient();
  const { data: cameras } = await supabase
    .from('cameras')
    .select('*, sector:sectors(name)')
    .order('created_at');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Cameras</h1>
          <p className="text-sm text-gray-500 mt-1">
            Camera integration architecture. See CAMERA-API-INTEGRATION.md for setup.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" disabled>+ Add Camera</button>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
        📸 Camera API integration is pending. The schema and service interface are ready — see CAMERA-API-INTEGRATION.md.
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Sector</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cameras?.map((cam) => (
              <tr key={cam.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{cam.name}</td>
                <td className="px-4 py-3 text-gray-600">{cam.camera_type}</td>
                <td className="px-4 py-3 text-gray-500">
                  {Array.isArray(cam.sector) ? cam.sector[0]?.name : (cam.sector as {name?: string} | null)?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'badge border',
                    cam.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-red-100 text-red-700 border-red-200'
                  )}>
                    {cam.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {cam.last_seen_at ? new Date(cam.last_seen_at).toLocaleString() : 'Never'}
                </td>
              </tr>
            ))}
            {(!cameras || cameras.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No cameras configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
