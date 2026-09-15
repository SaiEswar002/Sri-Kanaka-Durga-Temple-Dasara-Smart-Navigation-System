import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ── DEMO MODE & DEV PLACEHOLDER BYPASS ───────────────────────────────────
  // Check BEFORE any Supabase calls so we don't hit a placeholder URL.
  const isDemo = request.cookies.get('admin_demo')?.value === '1';
  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  // If demo cookie is set OR supabase is not configured, bypass auth for /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (request.nextUrl.pathname === '/admin/login') {
      return supabaseResponse;
    }
    if (isDemo || isPlaceholder) {
      return supabaseResponse;
    }
  }

  // ── REAL SUPABASE AUTH (production only) ─────────────────────────────────
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

  // Protect admin routes (production)
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.searchParams.set('redirected', 'true');
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}
