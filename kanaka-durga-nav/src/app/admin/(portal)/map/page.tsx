import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Live Map — Admin' };
export default function AdminMapPage() {
  return (
    <div>
      <h1 className='text-2xl font-bold mb-2'>Live Map</h1>
      <p className='text-sm text-gray-500 mb-6'>All sectors, sub-sectors, locations, crowd levels, closures, and parking on one map.</p>
      <div className='card' style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3f0', fontSize: 14, color: '#8a6070' }}>
        🗺️ MapLibre admin map — connect map tile provider and Supabase to activate
      </div>
    </div>
  );
}
