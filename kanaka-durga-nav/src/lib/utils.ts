import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CrowdLevel, ParkingAvailabilityStatus, IncidentPriority, AnnouncementPriority } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format meters as a readable distance string */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format seconds as readable duration */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return remainingMin > 0 ? `${hours}h ${remainingMin}m` : `${hours}h`;
}

/** Crowd level to display config */
export const CROWD_LEVEL_CONFIG: Record<CrowdLevel, { label: string; label_te: string; color: string; bg: string }> = {
  LOW:      { label: 'Low Crowd',      label_te: 'తక్కువ జనసమూహం',   color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  NORMAL:   { label: 'Normal',         label_te: 'సాధారణం',          color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  MEDIUM:   { label: 'Moderate',       label_te: 'మోస్తరు',          color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  HIGH:     { label: 'High Crowd',     label_te: 'అధిక జనసమూహం',    color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  CRITICAL: { label: 'Very Crowded',   label_te: 'చాలా జనసమూహం',    color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
};

/** Parking status to display config */
export const PARKING_STATUS_CONFIG: Record<ParkingAvailabilityStatus, { label: string; label_te: string; color: string }> = {
  AVAILABLE: { label: 'Available',  label_te: 'అందుబాటులో ఉంది',   color: 'text-green-600' },
  FILLING:   { label: 'Filling',    label_te: 'నిండుతోంది',         color: 'text-amber-600' },
  FULL:      { label: 'Full',       label_te: 'నిండిపోయింది',       color: 'text-red-600' },
  CLOSED:    { label: 'Closed',     label_te: 'మూసివేయబడింది',      color: 'text-gray-600' },
  UNKNOWN:   { label: 'Unknown',    label_te: 'తెలియదు',            color: 'text-gray-400' },
};

/** Priority badge config */
export const PRIORITY_CONFIG: Record<AnnouncementPriority, { label: string; color: string }> = {
  INFO:    { label: 'Info',    color: 'bg-blue-100 text-blue-800 border-blue-200' },
  NOTICE:  { label: 'Notice', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  WARNING: { label: 'Warning',color: 'bg-orange-100 text-orange-800 border-orange-200' },
  URGENT:  { label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200' },
};

export const INCIDENT_PRIORITY_CONFIG: Record<IncidentPriority, { label: string; color: string }> = {
  LOW:      { label: 'Low',      color: 'bg-green-100 text-green-800' },
  MEDIUM:   { label: 'Medium',   color: 'bg-yellow-100 text-yellow-800' },
  HIGH:     { label: 'High',     color: 'bg-orange-100 text-orange-800' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800' },
};

/** Check if a string is a valid UUID */
export function isUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/** Generic safe JSON parse */
export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
