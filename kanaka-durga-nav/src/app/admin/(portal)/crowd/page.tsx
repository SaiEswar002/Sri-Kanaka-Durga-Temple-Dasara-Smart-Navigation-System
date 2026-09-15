import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CROWD_LEVEL_CONFIG, cn } from '@/lib/utils';
import type { CrowdLevel } from '@/types';

export const metadata: Metadata = { title: 'Crowd — Admin' };

export default async function AdminCrowdPage() {
  const supabase = await createServerSupabaseClient();
  const { data: sectors } = await supabase
    .from('sectors')
    .select('id, name, crowd_level, crowd_updated_at, crowd_source, status')
    .order('display_order');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Crowd Management</h1>
      <p className="text-sm text-gray-500 mb-6">
        Current crowd levels by sector. Update manually or via camera integration.
      </p>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Sector</th>
              <th className="text-left px-4 py-3 font-semibold">Crowd Level</th>
              <th className="text-left px-4 py-3 font-semibold">Source</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sectors?.map((s) => {
              const cfg = CROWD_LEVEL_CONFIG[s.crowd_level as CrowdLevel];
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge border', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.crowd_source ?? 'MANUAL'}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-gray-100 text-gray-600 border-gray-200">{s.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
