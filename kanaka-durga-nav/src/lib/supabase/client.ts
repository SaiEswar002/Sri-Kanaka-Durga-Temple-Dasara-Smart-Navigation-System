import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://rqmkggkphnrqswbpolzd.supabase.co';
const DEFAULT_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbWtnZ2twaG5ycXN3YnBvbHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTQyODEsImV4cCI6MjEwNTAzMDI4MX0.oxqhkTpWuyoVsixtvowzAArpwVwmZV9ti6Jih8f6x-g';

// Client-side Supabase client (uses NEXT_PUBLIC_ vars with safe fallback)
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON;
  return createBrowserClient(url, anonKey);
}
