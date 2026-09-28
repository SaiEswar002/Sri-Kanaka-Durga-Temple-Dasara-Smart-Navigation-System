import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';

// GET /api/admin/locations — fetch all locations for admin (requires any admin role)
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, null);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('locations')
      .select('*, category:location_categories(id, name, slug), sector:sectors(id, name), sub_sector:sub_sectors(id, name, slug)')
      .order('display_order');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/admin/locations — create location
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'locations');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();

    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: body.name,
        name_te: body.name_te ?? body.name,
        category_id: body.category_id,
        sector_id: body.sector_id ?? null,
        sub_sector_id: body.sub_sector_id ?? null,
        position: body.position ?? { type: 'Point', coordinates: [80.6065, 16.5154] },
        status: body.status ?? 'ACTIVE',
        description: body.description ?? null,
        description_te: body.description_te ?? null,
        address: body.address ?? null,
        address_te: null,
        contact_phone: body.contact_phone ?? null,
        contact_name: body.contact_name ?? null,
        operating_hours: body.operating_hours ?? null,
        capacity: body.capacity ?? null,
        is_accessible: body.is_accessible ?? false,
        is_demo_data: false,
        metadata: {},
        display_order: body.display_order ?? 999,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/admin/locations — update location
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'locations');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('locations')
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

// DELETE /api/admin/locations?id=xxx
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'locations');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
