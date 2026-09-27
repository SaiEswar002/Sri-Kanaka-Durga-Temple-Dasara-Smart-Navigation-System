import type { Metadata } from 'next';
import LocationsClient from './locations-client';
export const metadata: Metadata = { title: 'Locations — Admin' };
export default function AdminLocationsPage() { return <LocationsClient />; }
