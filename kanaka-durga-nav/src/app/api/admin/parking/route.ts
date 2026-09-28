import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';

// POST /api/admin/parking — update parking availability
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'parking');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();

    // Upsert parking status for a parking area
    const { parking_area_id, occupied, available, status } = body;
    if (!parking_area_id) return NextResponse.json({ error: 'parking_area_id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('parking_status')
      .upsert({
        parking_area_id,
        occupied: occupied ?? 0,
        available: available ?? 0,
        status: status ?? 'AVAILABLE',
        data_source: 'MANUAL',
        updated_by: auth.adminId !== 'demo' ? auth.adminId : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'parking_area_id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
