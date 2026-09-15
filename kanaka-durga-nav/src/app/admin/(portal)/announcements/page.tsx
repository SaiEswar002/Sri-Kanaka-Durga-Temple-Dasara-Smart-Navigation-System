import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export const metadata: Metadata = { title: 'Announcements — Admin' };
export default async function AdminAnnouncementsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: anns } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(30);
  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold'>Announcements</h1>
          <p className='text-sm text-gray-500 mt-1'>Create and manage bilingual announcements</p>
        </div>
        <button className='btn btn-primary btn-sm' disabled>+ New Announcement</button>
      </div>
      <div className='card overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='text-left px-4 py-3 font-semibold'>Title</th>
              <th className='text-left px-4 py-3 font-semibold'>Priority</th>
              <th className='text-left px-4 py-3 font-semibold'>Status</th>
              <th className='text-left px-4 py-3 font-semibold'>Starts</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {anns?.map((a) => (
              <tr key={a.id} className='hover:bg-gray-50'>
                <td className='px-4 py-3 font-medium max-w-xs truncate'>{a.title} {a.is_demo_data && <span className='text-blue-500 text-xs'>[DEMO]</span>}</td>
                <td className='px-4 py-3'><span className='badge bg-blue-100 text-blue-700 border-blue-200'>{a.priority}</span></td>
                <td className='px-4 py-3'>{a.status}</td>
                <td className='px-4 py-3 text-gray-500'>{new Date(a.starts_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
