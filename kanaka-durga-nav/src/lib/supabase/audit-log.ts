/**
 * Audit Logging Helper
 *
 * Records administrative mutations to the audit_logs table.
 * Uses the service-role client so that writes are not blocked by RLS.
 *
 * IMPORTANT:
 *  - Never log raw auth credentials, tokens, or passwords.
 *  - Only log fields relevant to the administrative action.
 *  - old_values and new_values are used for change tracking only.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditEntry {
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  admin_user_id: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}

/**
 * Write an audit log entry. Fire-and-forget — errors are logged to console
 * but do not throw, to avoid breaking the primary operation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('audit_logs').insert({
      action: entry.action,
      table_name: entry.table_name,
      record_id: entry.record_id ?? null,
      admin_user_id: entry.admin_user_id === 'demo' ? null : (entry.admin_user_id ?? null),
      old_values: entry.old_values ?? null,
      new_values: entry.new_values ?? null,
    });
    if (error) {
      console.warn('[AuditLog] Failed to write audit entry:', error.message);
    }
  } catch (err) {
    console.warn('[AuditLog] Unexpected error writing audit entry:', err);
  }
}
