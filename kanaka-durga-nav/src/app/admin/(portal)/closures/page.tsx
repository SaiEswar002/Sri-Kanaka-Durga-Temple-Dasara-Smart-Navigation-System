import type { Metadata } from 'next';
import ClosuresClient from './closures-client';
export const metadata: Metadata = { title: 'Route Closures — Admin' };
export default function AdminClosuresPage() {
  return <ClosuresClient />;
}
