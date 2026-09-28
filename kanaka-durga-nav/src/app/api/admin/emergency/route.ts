import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';
import { writeAuditLog } from '@/lib/supabase/audit-log';

// GET /api/admin/emergency — list recent incidents
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, null); // any active admin can read
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // optional filter

    let query = supabase
      .from('emergency_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/admin/emergency — report new incident
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'emergency');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();

    if (!body.title || !body.incident_type) {
      return NextResponse.json({ error: 'title and incident_type are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('emergency_incidents')
      .insert({
        title: body.title,
        incident_type: body.incident_type,
        description: body.description ?? null,
        location_text: body.location_text ?? null,
        sector_id: body.sector_id ?? null,
        sub_sector_id: body.sub_sector_id ?? null,
        status: 'OPEN',
        priority: body.priority ?? 'MEDIUM',
        reported_by: body.reported_by ?? null,
        assigned_to: body.assigned_to ?? null,
        response_notes: body.response_notes ?? null,
        created_by: auth.adminId !== 'demo' ? auth.adminId : null,
        is_demo_data: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: 'CREATE',
      table_name: 'emergency_incidents',
      record_id: data.id,
      admin_user_id: auth.adminId,
      new_values: {
        title: data.title,
        incident_type: data.incident_type,
        priority: data.priority,
        status: data.status,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/admin/emergency — update incident status/notes
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'emergency');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Fetch old values for audit
    const { data: oldData } = await supabase
      .from('emergency_incidents')
      .select('status, priority, assigned_to, response_notes')
      .eq('id', id)
      .single();

    // Only allow updating safe operational fields
    const safeUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) safeUpdates.status = updates.status;
    if (updates.priority !== undefined) safeUpdates.priority = updates.priority;
    if (updates.assigned_to !== undefined) safeUpdates.assigned_to = updates.assigned_to;
    if (updates.response_notes !== undefined) safeUpdates.response_notes = updates.response_notes;
    if (updates.location_text !== undefined) safeUpdates.location_text = updates.location_text;
    if (updates.description !== undefined) safeUpdates.description = updates.description;

    // Set resolved_at when resolving
    if (updates.status === 'RESOLVED') {
      safeUpdates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('emergency_incidents')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: 'UPDATE',
      table_name: 'emergency_incidents',
      record_id: id,
      admin_user_id: auth.adminId,
      old_values: oldData ?? null,
      new_values: safeUpdates as Record<string, unknown>,
    });

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/admin/emergency — cancel/delete incident (SUPER_ADMIN or OPERATIONS_ADMIN)
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'emergency');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: oldData } = await supabase
      .from('emergency_incidents')
      .select('title, incident_type, status')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('emergency_incidents')
      .update({ status: 'CANCELLED' })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: 'DELETE',
      table_name: 'emergency_incidents',
      record_id: id,
      admin_user_id: auth.adminId,
      old_values: oldData ?? null,
      new_values: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
