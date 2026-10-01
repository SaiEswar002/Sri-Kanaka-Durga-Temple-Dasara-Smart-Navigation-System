import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const DEFAULT_SUPABASE_URL = 'https://rqmkggkphnrqswbpolzd.supabase.co';
const DEFAULT_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbWtnZ2twaG5ycXN3YnBvbHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTQyODEsImV4cCI6MjEwNTAzMDI4MX0.oxqhkTpWuyoVsixtvowzAArpwVwmZV9ti6Jih8f6x-g';

// Server-side Supabase client (Next.js App Router server components/actions)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON;

  return createServerClient(
    url,
    anonKey,
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  return createServerClient(
    url,
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
