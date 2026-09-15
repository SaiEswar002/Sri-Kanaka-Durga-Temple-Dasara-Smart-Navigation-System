import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase client (uses NEXT_PUBLIC_ vars only)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
