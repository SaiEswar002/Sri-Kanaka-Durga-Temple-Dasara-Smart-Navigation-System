import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import type { ReactNode } from 'react';

export default async function AdminPortalLayout({ children }: { children: ReactNode }) {
  const isDevPlaceholder =
    process.env.NODE_ENV === 'development' &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'));

  // Enforce real admin authentication unless in local offline placeholder dev
  if (!isDevPlaceholder) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect('/admin/login');
    }

    const serviceClient = createServiceRoleClient();

    // Verify user is in admin_users table with an active admin role
    let { data: adminUser } = await serviceClient
      .from('admin_users')
      .select('id, role:roles(slug)')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    // If auth_user_id was not yet linked, link only if email matches a pre-provisioned active admin
    if (!adminUser && user.email) {
      const { data: adminByEmail } = await serviceClient
        .from('admin_users')
        .select('id, role:roles(slug)')
        .eq('email', user.email.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (adminByEmail) {
        await serviceClient
          .from('admin_users')
          .update({ auth_user_id: user.id, last_login_at: new Date().toISOString() })
          .eq('id', adminByEmail.id);
        adminUser = adminByEmail;
      }
    }

    if (!adminUser) {
      redirect('/admin/login?error=unauthorized');
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-18 md:pt-8 overflow-y-auto" id="admin-main-content">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
