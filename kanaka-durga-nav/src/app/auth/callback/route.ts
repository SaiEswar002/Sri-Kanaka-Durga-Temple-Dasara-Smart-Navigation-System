import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';

  // Sanitize next redirect URL to prevent open redirect attacks
  // Must be an internal relative path starting with '/' and not '//'
  const isSafeRelative = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\');
  const safeNext = isSafeRelative ? rawNext : '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_code`);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/?auth_error=oauth_failed`);
  }

  const user = data.user;
  const userEmail = user.email?.toLowerCase();

  // If redirecting to an admin route, verify that this account is an explicitly authorized active admin
  if (safeNext.startsWith('/admin')) {
    let isAuthorizedAdmin = false;

    try {
      const serviceClient = createServiceRoleClient();

      if (userEmail) {
        // Query admin_users by auth_user_id or pre-provisioned email
        const { data: adminRecord } = await serviceClient
          .from('admin_users')
          .select('id, auth_user_id, is_active')
          .or(`auth_user_id.eq.${user.id},email.eq.${userEmail}`)
          .eq('is_active', true)
          .maybeSingle();

        if (adminRecord) {
          isAuthorizedAdmin = true;

          // Link auth_user_id if not yet bound, and record login timestamp
          if (adminRecord.auth_user_id !== user.id) {
            await serviceClient
              .from('admin_users')
              .update({ auth_user_id: user.id, last_login_at: new Date().toISOString() })
              .eq('id', adminRecord.id);
          } else {
            await serviceClient
              .from('admin_users')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', adminRecord.id);
          }
        }
      }
    } catch (err) {
      console.error('[auth/callback] Error verifying admin user status:', err);
    }

    if (!isAuthorizedAdmin) {
      // Devotee / unauthorized user attempted to sign into admin portal via Google OAuth
      return NextResponse.redirect(`${origin}/admin/login?error=unauthorized`);
    }

    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // Normal pilgrim destination
  return NextResponse.redirect(`${origin}${safeNext}`);
}
