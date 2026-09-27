import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/admin/closures — create route closure
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();

    const { data, error } = await supabase
      .from('route_closures')
      .insert({
        title: body.title,
        title_te: body.title_te ?? body.title,
        reason: body.reason ?? null,
        reason_te: body.reason_te ?? null,
        closure_type: body.closure_type ?? 'ALL',
        status: body.status ?? 'ACTIVE',
        start_time: body.start_time ?? new Date().toISOString(),
        end_time: body.end_time ?? null,
        affected_area: null,
        closure_line: null,
        waypoints: null,
        sector_id: body.sector_id ?? null,
        sub_sector_id: null,
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

// PATCH /api/admin/closures — update status
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('route_closures')
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

// DELETE /api/admin/closures?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase.from('route_closures').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
