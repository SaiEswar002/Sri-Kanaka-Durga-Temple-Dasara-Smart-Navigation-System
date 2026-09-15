import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Emergency — Admin' };

export default async function AdminEmergencyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: incidents } = await supabase
    .from('emergency_incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Emergency Incidents</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage emergency incidents on the ground</p>
        </div>
        <button className="btn btn-danger btn-sm" disabled>+ Report Incident</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Title</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Priority</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Reported</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {incidents?.map((inc) => (
              <tr key={inc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium max-w-xs truncate">{inc.title}</td>
                <td className="px-4 py-3 text-gray-600">{inc.incident_type}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'badge border',
                    inc.priority === 'CRITICAL'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  )}>
                    {inc.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'badge border',
                    inc.status === 'OPEN'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  )}>
                    {inc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(inc.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!incidents || incidents.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No incidents recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
