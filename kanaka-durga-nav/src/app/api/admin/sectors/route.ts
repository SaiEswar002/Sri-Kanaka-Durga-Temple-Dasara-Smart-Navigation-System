import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';

// POST /api/admin/sectors — create a new sector (Phase 2: no slug/status/crowd/coordinates)
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'locations');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();

    if (!body.name)    return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!body.name_te) return NextResponse.json({ error: 'name_te is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('sectors')
      .insert({
        name:           body.name,
        name_te:        body.name_te,
        description:    body.description    || null,
        description_te: body.description_te || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/admin/sectors — update a sector
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'locations');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Only allow updating safe fields
    const allowedUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined)           allowedUpdates.name = updates.name;
    if (updates.name_te !== undefined)        allowedUpdates.name_te = updates.name_te;
    if (updates.description !== undefined)    allowedUpdates.description = updates.description || null;
    if (updates.description_te !== undefined) allowedUpdates.description_te = updates.description_te || null;
    allowedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('sectors')
      .update(allowedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/admin/sectors?id=xxx
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'locations');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('sectors').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
