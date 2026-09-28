import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';
import { writeAuditLog } from '@/lib/supabase/audit-log';

// POST /api/admin/announcements — create announcement
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'announcements');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: body.title,
        title_te: body.title_te ?? body.title,
        message: body.message ?? body.title,
        message_te: body.message_te ?? body.message ?? body.title,
        priority: body.priority ?? 'INFO',
        status: body.status ?? 'ACTIVE',
        target_audience: body.target_audience ?? 'ALL',
        starts_at: body.starts_at ?? new Date().toISOString(),
        expires_at: body.expires_at ?? null,
        created_by: auth.adminId !== 'demo' ? auth.adminId : null,
        is_demo_data: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: 'CREATE',
      table_name: 'announcements',
      record_id: data.id,
      admin_user_id: auth.adminId,
      new_values: { title: data.title, priority: data.priority, status: data.status },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/admin/announcements — update announcement
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'announcements');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: oldData } = await supabase
      .from('announcements')
      .select('title, priority, status')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('announcements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: 'UPDATE',
      table_name: 'announcements',
      record_id: id,
      admin_user_id: auth.adminId,
      old_values: oldData ?? null,
      new_values: updates,
    });

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/admin/announcements?id=xxx
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'announcements');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: oldData } = await supabase
      .from('announcements')
      .select('title, priority, status')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: 'DELETE',
      table_name: 'announcements',
      record_id: id,
      admin_user_id: auth.adminId,
      old_values: oldData ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
