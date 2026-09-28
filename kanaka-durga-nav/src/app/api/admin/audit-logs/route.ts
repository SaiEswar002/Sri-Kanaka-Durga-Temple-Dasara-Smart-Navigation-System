import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';

// GET /api/admin/audit-logs — read audit log (any admin, read-only)
export async function GET(req: NextRequest) {
  // Any active admin can read audit logs
  const auth = await requireAdminAuth(req, null);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const url = new URL(req.url);
    const table = url.searchParams.get('table');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 200);

    let query = supabase
      .from('audit_logs')
      .select('id, action, table_name, record_id, admin_user_id, old_values, new_values, created_at, admin_user:admin_users(email, display_name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (table) {
      query = query.eq('table_name', table);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
