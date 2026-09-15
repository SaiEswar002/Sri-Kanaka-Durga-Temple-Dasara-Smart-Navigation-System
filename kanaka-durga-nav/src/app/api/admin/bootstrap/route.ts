import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Admin bootstrap API route
// Called during the first admin login to provision SUPER_ADMIN
// IMPORTANT: This uses the service-role key — never expose to the browser
// This endpoint is only called from server components or trusted server code

const bootstrapSchema = z.object({
  auth_user_id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Verify this is called server-side with a valid server token
    const authHeader = request.headers.get('Authorization');
    const expectedToken = process.env.ADMIN_BOOTSTRAP_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { auth_user_id, email, display_name } = parsed.data;

    // Parse the comma-separated SUPER_ADMIN_EMAILS env var
    const superAdminEmailsRaw = process.env.SUPER_ADMIN_EMAILS ?? '';
    const superAdminEmails = superAdminEmailsRaw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (superAdminEmails.length === 0) {
      return NextResponse.json(
        { error: 'SUPER_ADMIN_EMAILS not configured on server' },
        { status: 500 }
      );
    }

    // Use service-role client for the bootstrap function
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc('provision_super_admin_if_eligible', {
      p_auth_user_id: auth_user_id,
      p_email: email,
      p_display_name: display_name,
      p_super_admin_emails: superAdminEmails,
    });

    if (error) {
      console.error('[Admin Bootstrap] RPC error:', error);
      return NextResponse.json({ error: 'Bootstrap failed' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Email not in SUPER_ADMIN_EMAILS list — access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      admin_id: data[0].admin_id,
      role: data[0].role_slug,
      was_provisioned: data[0].was_provisioned,
    });
  } catch (err) {
    console.error('[Admin Bootstrap] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Disable GET for this endpoint
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
