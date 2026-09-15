import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client (Next.js App Router server components/actions)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get('admin_demo')?.value === '1';

  // In demo mode, use service role client if available so server components can query data without RLS blocking
  if (isDemo && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createServiceRoleClient();
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — cookie writes are ignored (handled by middleware)
          }
        },
      },
    }
  );
}

// Service-role client — NEVER exposed to the browser
// Only for server-side privileged operations (admin bootstrap, etc.)
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This is a server-only operation.');
  }
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
