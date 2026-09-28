import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';

// POST /api/admin/queues — create queue or update count
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'queues');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();

    const { data, error } = await supabase
      .from('darshan_queues')
      .insert({
        location_id: body.location_id,
        name: body.name,
        name_te: body.name_te ?? body.name,
        queue_type: body.queue_type ?? 'GENERAL',
        status: body.status ?? 'OPEN',
        current_count: body.current_count ?? 0,
        max_capacity: body.max_capacity ?? null,
        estimated_wait_minutes: body.estimated_wait_minutes ?? null,
        notes: body.notes ?? null,
        notes_te: null,
        is_demo_data: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/admin/queues — update queue count, status, wait time
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'queues');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('darshan_queues')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/admin/queues?id=xxx
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'queues');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase.from('darshan_queues').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
