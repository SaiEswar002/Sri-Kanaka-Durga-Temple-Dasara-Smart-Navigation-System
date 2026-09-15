import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ── DEMO MODE BYPASS ─────────────────────────────────────────────────────
  // Allow unauthenticated access to /admin when demo cookie is set.
  // The cookie is set by the "Enter Demo Dashboard" button on the login page.
  const isDemo = request.cookies.get('admin_demo')?.value === '1';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Allow the login page always
    if (request.nextUrl.pathname === '/admin/login') {
      return supabaseResponse;
    }

    // Allow demo mode — no real auth needed for read-only dashboard preview
    if (isDemo) {
      return supabaseResponse;
    }

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.searchParams.set('redirected', 'true');
      return NextResponse.redirect(loginUrl);
    }

    // Additional admin verification happens at the page/API level
    // (checking admin_users table server-side)
    // We don't trust client-supplied role claims here
  }

  return supabaseResponse;
}
