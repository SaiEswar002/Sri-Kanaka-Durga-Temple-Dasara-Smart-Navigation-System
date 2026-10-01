import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  try {
    // Run Supabase session update (handles auth + admin protection)
    const supabaseResponse = await updateSession(request);

    // If it's a redirect (auth protection), return it
    if (supabaseResponse.status === 307 || supabaseResponse.status === 302) {
      return supabaseResponse;
    }

    return supabaseResponse;
  } catch (error) {
    console.error('[proxy] Unhandled error in request proxy:', error);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
