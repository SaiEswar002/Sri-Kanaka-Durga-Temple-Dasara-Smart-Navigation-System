import type { Metadata } from 'next';
import SubSectorsClient from './sub-sectors-client';

export const metadata: Metadata = { title: 'Sub-Sectors — Admin | Kanaka Durga Nav' };

export default function AdminSubSectorsPage() {
  return <SubSectorsClient />;
}
