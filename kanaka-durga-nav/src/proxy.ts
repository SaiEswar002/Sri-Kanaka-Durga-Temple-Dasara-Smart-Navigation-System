import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Run Supabase session update (handles auth + admin protection)
  const supabaseResponse = await updateSession(request);

  // If it's a redirect (auth protection), return it
  if (supabaseResponse.status === 307 || supabaseResponse.status === 302) {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
