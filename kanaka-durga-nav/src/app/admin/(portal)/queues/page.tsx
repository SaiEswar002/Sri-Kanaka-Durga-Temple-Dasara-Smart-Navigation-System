import type { Metadata } from 'next';
import QueuesClient from './queues-client';
export const metadata: Metadata = { title: 'Queues — Admin' };
export default function AdminQueuesPage() { return <QueuesClient />; }
