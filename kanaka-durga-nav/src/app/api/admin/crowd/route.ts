import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/admin/crowd — update sector crowd level
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await req.json();
    const { sector_id, crowd_level } = body;
    if (!sector_id || !crowd_level) {
      return NextResponse.json({ error: 'sector_id and crowd_level required' }, { status: 400 });
    }

    // Update sector crowd_level directly
    const { data: sectorData, error: sectorErr } = await supabase
      .from('sectors')
      .update({
        crowd_level,
        crowd_updated_at: new Date().toISOString(),
        crowd_source: 'MANUAL',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sector_id)
      .select()
      .single();

    if (sectorErr) return NextResponse.json({ error: sectorErr.message }, { status: 400 });

    // Also upsert into crowd_status for history
    await supabase.from('crowd_status').insert({
      entity_type: 'SECTOR',
      entity_id: sector_id,
      crowd_level,
      data_source: 'MANUAL',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(sectorData);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
