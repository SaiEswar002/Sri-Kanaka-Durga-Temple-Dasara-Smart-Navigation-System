import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Audit Logs — Admin' };

interface AuditLog {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  admin_user_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  admin_user: { email: string; display_name: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200',
  LOGIN:  'bg-purple-100 text-purple-800 border-purple-200',
  LOGOUT: 'bg-gray-100 text-gray-700 border-gray-200',
};

const TABLE_LABELS: Record<string, string> = {
  parking_status:       'Parking',
  locations:            'Locations',
  sectors:              'Sectors',
  sub_sectors:          'Sub-Sectors',
};

export default async function AdminAuditLogsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, action, table_name, record_id, admin_user_id, old_values, new_values, created_at, admin_user:admin_users(email, display_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  // Supabase join returns array for object relations — normalize
  const normalizedLogs: AuditLog[] = (logs ?? []).map((log) => ({
    ...log,
    admin_user: Array.isArray(log.admin_user)
      ? (log.admin_user[0] as { email: string; display_name: string } | undefined) ?? null
      : log.admin_user as { email: string; display_name: string } | null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Administrative action history — last 100 entries
          </p>
        </div>
        <span className="badge bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold">
          Read-only
        </span>
      </div>

      {normalizedLogs.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <p className="font-medium">No audit log entries yet.</p>
          <p className="text-sm mt-1">Log entries appear here after administrative actions.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-600 uppercase tracking-wide">When</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-600 uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-600 uppercase tracking-wide">Table</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-600 uppercase tracking-wide">Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-600 uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {normalizedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      dateStyle: 'short', timeStyle: 'short', hour12: true,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge border text-xs font-bold', ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700 border-gray-200')}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium text-xs">
                    {TABLE_LABELS[log.table_name ?? ''] ?? log.table_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {log.admin_user
                      ? <span title={log.admin_user.email}>{log.admin_user.display_name}</span>
                      : <span className="text-gray-400 italic">System</span>}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {log.new_values && (
                      <div className="text-xs text-gray-500 truncate font-mono">
                        {Object.entries(log.new_values)
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${String(v).slice(0, 20)}`)
                          .join(' · ')}
                      </div>
                    )}
                    {!log.new_values && log.old_values && (
                      <span className="text-xs text-red-500 italic">Deleted record</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
