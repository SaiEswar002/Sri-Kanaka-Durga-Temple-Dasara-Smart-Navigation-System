import type { Metadata } from 'next';
import CrowdClient from './crowd-client';
export const metadata: Metadata = { title: 'Crowd — Admin' };
export default function AdminCrowdPage() { return <CrowdClient />; }
