import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Buses — Admin' };
export default function AdminBusesPage() {
  return (
    <div>
      <h1 className='text-2xl font-bold mb-2'>Bus & Shuttle Management</h1>
      <p className='text-sm text-gray-500 mb-6'>Bus routes and stops management. Route/stop tables are deferred pending real route data from the transport authority.</p>
      <div className='card p-8 text-center text-gray-500'>
        Bus route management will be enabled once real bus route data is provided. Architecture is ready — add bus_routes and bus_stops tables to the schema when data is available.
      </div>
    </div>
  );
}
