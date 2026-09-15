import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export const metadata: Metadata = { title: 'Sub-Sectors — Admin' };
export default async function AdminSubSectorsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: subSectors } = await supabase.from('sub_sectors').select('*, sector:sectors(name)').order('display_order');
  return (
    <div>
      <h1 className='text-2xl font-bold mb-6'>Sub-Sectors</h1>
      <div className='card overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='text-left px-4 py-3 font-semibold'>Name</th>
              <th className='text-left px-4 py-3 font-semibold'>Sector</th>
              <th className='text-left px-4 py-3 font-semibold'>Crowd Level</th>
              <th className='text-left px-4 py-3 font-semibold'>Status</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {subSectors?.map((ss) => (
              <tr key={ss.id} className='hover:bg-gray-50'>
                <td className='px-4 py-3 font-medium'>{ss.name}</td>
                <td className='px-4 py-3 text-gray-600'>{ss.sector?.name ?? '—'}</td>
                <td className='px-4 py-3'><span className='badge bg-blue-100 text-blue-700 border-blue-200'>{ss.crowd_level}</span></td>
                <td className='px-4 py-3'>{ss.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
