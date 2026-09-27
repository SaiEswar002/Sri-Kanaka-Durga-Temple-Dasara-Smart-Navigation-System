import type { Metadata } from 'next';
import SectorsClient from './sectors-client';

export const metadata: Metadata = { title: 'Sectors — Admin | Kanaka Durga Nav' };

export default function AdminSectorsPage() {
  return <SectorsClient />;
}
