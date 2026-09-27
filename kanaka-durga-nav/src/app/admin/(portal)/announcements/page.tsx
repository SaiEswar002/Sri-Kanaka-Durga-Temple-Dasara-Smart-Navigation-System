import type { Metadata } from 'next';
import AnnouncementsClient from './announcements-client';

export const metadata: Metadata = { title: 'Announcements — Admin' };

export default function AdminAnnouncementsPage() {
  return <AnnouncementsClient />;
}
