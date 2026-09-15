import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export const metadata: Metadata = { title: 'Sectors — Admin' };
export default async function AdminSectorsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: sectors } = await supabase.from('sectors').select('*').order('display_order');
  return (
    <div>
      <h1 className='text-2xl font-bold mb-6'>Sectors</h1>
      <div className='card overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='text-left px-4 py-3 font-semibold'>Name (EN)</th>
              <th className='text-left px-4 py-3 font-semibold'>Name (TE)</th>
              <th className='text-left px-4 py-3 font-semibold'>Crowd Level</th>
              <th className='text-left px-4 py-3 font-semibold'>Status</th>
              <th className='text-left px-4 py-3 font-semibold'>Demo?</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {sectors?.map((s) => (
              <tr key={s.id} className='hover:bg-gray-50'>
                <td className='px-4 py-3 font-medium'>{s.name}</td>
                <td className='px-4 py-3 text-gray-600'>{s.name_te}</td>
                <td className='px-4 py-3'><span className='badge bg-blue-100 text-blue-700 border-blue-200'>{s.crowd_level}</span></td>
                <td className='px-4 py-3'>{s.status}</td>
                <td className='px-4 py-3'>{(s.metadata as {demo?:boolean})?.demo ? <span className='text-blue-500'>DEMO</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
