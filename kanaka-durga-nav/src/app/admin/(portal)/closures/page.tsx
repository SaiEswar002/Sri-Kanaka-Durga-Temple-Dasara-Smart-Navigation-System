import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Closures — Admin' };

export default async function AdminClosuresPage() {
  const supabase = await createServerSupabaseClient();
  const { data: closures } = await supabase
    .from('route_closures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Route Closures</h1>
          <p className="text-sm text-gray-500 mt-1">Active closures affect pilgrim routing automatically</p>
        </div>
        <button className="btn btn-primary btn-sm" disabled>+ Add Closure</button>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="#b45309" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#b45309" strokeWidth="2" strokeLinecap="round"/></svg>
        Active closures will be sent to the routing engine to avoid routing pilgrims through them.
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Title</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Start</th>
              <th className="text-left px-4 py-3 font-semibold">End</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {closures?.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium max-w-xs truncate">{c.title}</td>
                <td className="px-4 py-3 text-gray-600">{c.closure_type}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'badge border',
                    c.status === 'ACTIVE'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : c.status === 'SCHEDULED'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  )}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(c.start_time).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">
                  {c.end_time ? new Date(c.end_time).toLocaleString() : 'Open-ended'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
