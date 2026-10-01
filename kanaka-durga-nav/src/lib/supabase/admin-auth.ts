/**
 * Admin API Authentication Guard
 *
 * Centralises the authentication + authorisation check for all
 * /api/admin/* mutation endpoints.
 *
 * IMPORTANT:
 *  - We never trust a role or user_id sent from the browser.
 *  - The service-role client is used ONLY for the privileged admin_users lookup.
 *  - Demo / placeholder mode bypasses auth (read-only dev environment).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from './server';
import type { AdminRole } from '@/types';

// Permission map mirroring the RBAC migration.
// SUPER_ADMIN grants everything via the `all: true` wildcard.
const ROLE_PERMISSIONS: Record<AdminRole, Record<string, boolean>> = {
  SUPER_ADMIN:       { all: true },
  OPERATIONS_ADMIN:  { locations: true, parking: true, sectors: true },
  FACILITY_MANAGER:  { locations: true, parking: true },
  VIEW_ONLY:         { read_only: true },
};

export interface AdminAuthSuccess {
  ok: true;
  adminId: string;
  userId: string;
  email: string;
  role: AdminRole;
}

export interface AdminAuthFailure {
  ok: false;
  response: NextResponse;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

/**
 * Verify that the incoming request carries a valid Supabase session belonging
 * to an active admin with the required permission.
 *
 * @param request  - The incoming Next.js API route request.
 * @param required - The permission key required (e.g. 'crowd', 'closures').
 *                   Pass `null` to only require *any* active admin role.
 */
export async function requireAdminAuth(
  request: NextRequest,
  required: string | null,
): Promise<AdminAuthResult> {
  // Placeholder bypass for local development without configured Supabase
  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isPlaceholder) {
    return {
      ok: true,
      adminId: 'dev-admin',
      userId: 'dev-admin',
      email: 'dev-admin@local.test',
      role: 'SUPER_ADMIN',
    };
  }

  // 1. Verify the Supabase session from request cookies (anon client — no privilege)
  let userId: string;
  let userEmail: string;

  try {
    let cookieResponse = NextResponse.next({ request });

    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            cookieResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error } = await anonClient.auth.getUser();

    if (error || !user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized — no valid session' }, { status: 401 }),
      };
    }

    userId = user.id;
    userEmail = user.email ?? '';
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication check failed' }, { status: 500 }),
    };
  }

  // 2. Look up admin_users record via service-role (needed because admin_users RLS
  //    blocks reads unless you are already an admin — chicken-and-egg problem).
  try {
    const serviceClient = createServiceRoleClient();

    const { data: adminUser, error: adminError } = await serviceClient
      .from('admin_users')
      .select('id, email, is_active, role:roles(slug)')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .single();

    if (adminError || !adminUser) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Forbidden — no admin record found for this user' },
          { status: 403 }
        ),
      };
    }

    // 3. Extract role slug (Supabase join returns object or array)
    const roleRecord = adminUser.role as { slug: string } | { slug: string }[] | null;
    let roleSlug: string | undefined;

    if (Array.isArray(roleRecord)) {
      roleSlug = roleRecord[0]?.slug;
    } else if (roleRecord && typeof roleRecord === 'object') {
      roleSlug = (roleRecord as { slug: string }).slug;
    }

    if (!roleSlug) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Forbidden — admin role not configured' },
          { status: 403 }
        ),
      };
    }

    const role = roleSlug as AdminRole;

    // 4. Enforce the required permission
    if (required !== null) {
      const permissions = ROLE_PERMISSIONS[role] ?? {};
      const hasAll = permissions['all'] === true;
      const hasSpecific = permissions[required] === true;

      if (!hasAll && !hasSpecific) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: `Forbidden — role '${role}' does not have the '${required}' permission` },
            { status: 403 }
          ),
        };
      }
    }

    return {
      ok: true,
      adminId: adminUser.id as string,
      userId,
      email: userEmail,
      role,
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authorization check failed' }, { status: 500 }),
    };
  }
}

/** Require SUPER_ADMIN role specifically. */
export async function requireSuperAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const result = await requireAdminAuth(request, 'all');
  if (!result.ok) return result;

  if (result.role !== 'SUPER_ADMIN') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden — SUPER_ADMIN role required' },
        { status: 403 }
      ),
    };
  }

  return result;
}
