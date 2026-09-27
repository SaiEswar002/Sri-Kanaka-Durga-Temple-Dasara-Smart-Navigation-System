import type { Metadata } from 'next';
import ParkingClient from './parking-client';
export const metadata: Metadata = { title: 'Parking — Admin' };
export default function AdminParkingPage() { return <ParkingClient />; }
