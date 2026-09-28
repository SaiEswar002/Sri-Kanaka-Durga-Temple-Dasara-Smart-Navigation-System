import type { Metadata } from 'next';
import { EmergencyClient } from './emergency-client';

export const metadata: Metadata = { title: 'Emergency — Admin' };

export default function AdminEmergencyPage() {
  return <EmergencyClient />;
}
