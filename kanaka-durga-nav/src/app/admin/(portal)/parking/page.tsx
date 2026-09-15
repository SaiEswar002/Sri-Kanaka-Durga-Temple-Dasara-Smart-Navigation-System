import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export const metadata: Metadata = { title: 'Parking — Admin' };
export default async function AdminParkingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: areas } = await supabase.from('parking_areas').select('*, current_status:parking_status(*)').order('created_at');
  return (
    <div>
      <h1 className='text-2xl font-bold mb-2'>Parking Management</h1>
      <div className='card overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='text-left px-4 py-3 font-semibold'>Area</th>
              <th className='text-left px-4 py-3 font-semibold'>Capacity</th>
              <th className='text-left px-4 py-3 font-semibold'>Occupied</th>
              <th className='text-left px-4 py-3 font-semibold'>Available</th>
              <th className='text-left px-4 py-3 font-semibold'>Status</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {areas?.map((a) => {
              const s = Array.isArray(a.current_status) ? a.current_status[0] : a.current_status;
              return (
                <tr key={a.id} className='hover:bg-gray-50'>
                  <td className='px-4 py-3 font-medium'>{a.name}</td>
                  <td className='px-4 py-3'>{a.total_capacity}</td>
                  <td className='px-4 py-3'>{s?.occupied ?? '—'}</td>
                  <td className='px-4 py-3 text-green-600 font-medium'>{s?.available ?? '—'}</td>
                  <td className='px-4 py-3'>{s?.status ?? 'UNKNOWN'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
