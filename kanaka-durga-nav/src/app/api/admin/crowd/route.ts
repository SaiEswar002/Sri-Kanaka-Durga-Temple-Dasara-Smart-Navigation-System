import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/supabase/admin-auth';

// POST /api/admin/crowd — update sector crowd level via crowd_status table
// Phase 2: crowd_level no longer lives on the sectors table, only in crowd_status
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'crowd');
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { sector_id, crowd_level } = body;
    if (!sector_id || !crowd_level) {
      return NextResponse.json({ error: 'sector_id and crowd_level required' }, { status: 400 });
    }

    // Verify sector exists
    const { data: sector, error: secErr } = await supabase
      .from('sectors')
      .select('id')
      .eq('id', sector_id)
      .single();
    if (secErr || !sector) {
      return NextResponse.json({ error: 'sector not found' }, { status: 404 });
    }

    // Insert into crowd_status (the source of truth for crowd levels post Phase 2)
    const { data, error } = await supabase
      .from('crowd_status')
      .insert({
        entity_type: 'SECTOR',
        entity_id: sector_id,
        crowd_level,
        data_source: 'MANUAL',
        updated_by: auth.adminId !== 'demo' ? auth.adminId : null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
