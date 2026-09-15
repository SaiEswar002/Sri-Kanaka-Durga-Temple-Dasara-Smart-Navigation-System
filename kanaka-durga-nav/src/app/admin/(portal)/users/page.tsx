import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export const metadata: Metadata = { title: 'Users — Admin' };
export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: users } = await supabase.from('admin_users').select('*, role:roles(name, slug)').order('created_at', { ascending: false });
  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold'>Users & Roles</h1>
          <p className='text-sm text-gray-500 mt-1'>Manage admin access. Only Super Admins can modify this list.</p>
        </div>
        <button className='btn btn-primary btn-sm' disabled>+ Add Admin User</button>
      </div>
      <div className='card overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='text-left px-4 py-3 font-semibold'>Email</th>
              <th className='text-left px-4 py-3 font-semibold'>Display Name</th>
              <th className='text-left px-4 py-3 font-semibold'>Role</th>
              <th className='text-left px-4 py-3 font-semibold'>Active</th>
              <th className='text-left px-4 py-3 font-semibold'>Last Login</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {users?.map((u) => (
              <tr key={u.id} className='hover:bg-gray-50'>
                <td className='px-4 py-3 font-medium'>{u.email}</td>
                <td className='px-4 py-3'>{u.display_name}</td>
                <td className='px-4 py-3'><span className='badge bg-purple-100 text-purple-700 border-purple-200'>{u.role?.slug ?? u.role_id}</span></td>
                <td className='px-4 py-3'>{u.is_active ? <span className='badge bg-emerald-100 text-emerald-700 border-emerald-200'>Active</span> : <span className='badge bg-gray-100 text-gray-600 border-gray-200'>Inactive</span>}</td>
                <td className='px-4 py-3 text-gray-500'>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
