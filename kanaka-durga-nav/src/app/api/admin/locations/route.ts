import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';

// GET /api/admin/locations — fetch all locations for admin
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, null);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('locations')
      .select('*, category:location_categories(id, name, slug), sector:sectors(id, name), sub_sector:sub_sectors(id, name)')
      .order('created_at');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/admin/locations — create location (Phase 2: no contact/status/hours/accessibility)
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'locations');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();

    if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!body.category_id) return NextResponse.json({ error: 'category_id is required' }, { status: 400 });

    // Server-side validation: lat/lng required
    const lat = typeof body.lat === 'number' ? body.lat : (body.position?.coordinates?.[1] ?? null);
    const lng = typeof body.lng === 'number' ? body.lng : (body.position?.coordinates?.[0] ?? null);
    if (lat === null || lng === null) {
      return NextResponse.json({ error: 'latitude and longitude are required' }, { status: 400 });
    }

    // Server-side validation: sub_sector must belong to sector
    if (body.sector_id && body.sub_sector_id) {
      const { data: ss } = await supabase
        .from('sub_sectors')
        .select('sector_id')
        .eq('id', body.sub_sector_id)
        .single();
      if (!ss || ss.sector_id !== body.sector_id) {
        return NextResponse.json(
          { error: `sub_sector does not belong to selected sector` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({
        name:         body.name,
        name_te:      body.name_te ?? body.name,
        category_id:  body.category_id,
        sector_id:    body.sector_id    || null,
        sub_sector_id: body.sub_sector_id || null,
        position:     body.position ?? { type: 'Point', coordinates: [lng, lat] },
        description:  body.description  || null,
        address:      body.address      || null,
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

    // Server-side validation: sub_sector must belong to sector
    const sectorId = updates.sector_id;
    const subSectorId = updates.sub_sector_id;
    if (sectorId && subSectorId) {
      const { data: ss } = await supabase
        .from('sub_sectors')
        .select('sector_id')
        .eq('id', subSectorId)
        .single();
      if (!ss || ss.sector_id !== sectorId) {
        return NextResponse.json(
          { error: `sub_sector does not belong to selected sector` },
          { status: 400 }
        );
      }
    }

    // Build allowed update fields only
    const allowedUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined)         allowedUpdates.name = updates.name;
    if (updates.name_te !== undefined)      allowedUpdates.name_te = updates.name_te;
    if (updates.category_id !== undefined)  allowedUpdates.category_id = updates.category_id;
    if (updates.sector_id !== undefined)    allowedUpdates.sector_id = updates.sector_id || null;
    if (updates.sub_sector_id !== undefined) allowedUpdates.sub_sector_id = updates.sub_sector_id || null;
    if (updates.position !== undefined)     allowedUpdates.position = updates.position;
    if (updates.description !== undefined)  allowedUpdates.description = updates.description || null;
    if (updates.address !== undefined)      allowedUpdates.address = updates.address || null;

    const { data, error } = await supabase
      .from('locations')
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
