import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import type { ReactNode } from 'react';

export default async function AdminPortalLayout({ children }: { children: ReactNode }) {
  // Demo mode bypass — matches middleware cookie check
  const cookieStore = await cookies();
  const isDemo = cookieStore.get('admin_demo')?.value === '1';

  const isDevPlaceholder =
    process.env.NODE_ENV === 'development' &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'));

  // Skip auth for demo mode or dev placeholder
  if (!isDemo && !isDevPlaceholder) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect('/admin/login');
    }

    // Verify user is actually in admin_users table
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role:roles(slug)')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminUser) {
      redirect('/');
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
