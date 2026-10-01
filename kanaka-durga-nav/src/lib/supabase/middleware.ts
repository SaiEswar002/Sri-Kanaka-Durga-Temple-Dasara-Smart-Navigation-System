import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const DEFAULT_SUPABASE_URL = 'https://rqmkggkphnrqswbpolzd.supabase.co';
const DEFAULT_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbWtnZ2twaG5ycXN3YnBvbHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTQyODEsImV4cCI6MjEwNTAzMDI4MX0.oxqhkTpWuyoVsixtvowzAArpwVwmZV9ti6Jih8f6x-g';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON;

  // Check if we are running in an unconfigured placeholder dev environment
  const isPlaceholder =
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder');

  // If in placeholder dev mode, skip remote auth checks gracefully
  if (isPlaceholder) {
    return supabaseResponse;
  }

  // Allow admin login page without restriction
  if (request.nextUrl.pathname === '/admin/login') {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    // Protect admin routes: redirect unauthenticated users to /admin/login
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!user) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/admin/login';
        loginUrl.searchParams.set('redirected', 'true');
        return NextResponse.redirect(loginUrl);
      }
    }
  } catch (err) {
    // Prevent unhandled exceptions in middleware from crashing the site with HTTP 500
    console.error('[updateSession] Error updating Supabase session in middleware:', err);
    return supabaseResponse;
  }

  return supabaseResponse;
}
