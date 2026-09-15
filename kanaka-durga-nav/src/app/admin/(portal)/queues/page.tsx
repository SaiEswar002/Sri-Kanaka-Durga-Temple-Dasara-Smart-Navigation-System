import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export const metadata: Metadata = { title: 'Queues — Admin' };
export default async function AdminQueuesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: queues } = await supabase.from('darshan_queues').select('*, location:locations(name)').order('created_at');
  return (
    <div>
      <h1 className='text-2xl font-bold mb-2'>Darshan Queues</h1>
      <div className='card overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='text-left px-4 py-3 font-semibold'>Queue</th>
              <th className='text-left px-4 py-3 font-semibold'>Type</th>
              <th className='text-left px-4 py-3 font-semibold'>Status</th>
              <th className='text-left px-4 py-3 font-semibold'>Count</th>
              <th className='text-left px-4 py-3 font-semibold'>Wait (min)</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {queues?.map((q) => (
              <tr key={q.id} className='hover:bg-gray-50'>
                <td className='px-4 py-3 font-medium'>{q.name}</td>
                <td className='px-4 py-3 text-gray-600'>{q.queue_type}</td>
                <td className='px-4 py-3'><span className='badge bg-green-100 text-green-700 border-green-200'>{q.status}</span></td>
                <td className='px-4 py-3'>{q.current_count}</td>
                <td className='px-4 py-3'>{q.estimated_wait_minutes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
