import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ParkingAvailabilityStatus } from '@/types';

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

/** Format seconds as readable remaining duration (always rounds up so user isn't surprised) */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 min';
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return remainingMin > 0 ? `${hours}h ${remainingMin}m` : `${hours}h`;
}

/** Parking status to display config */
export const PARKING_STATUS_CONFIG: Record<ParkingAvailabilityStatus, { label: string; label_te: string; color: string }> = {
  AVAILABLE: { label: 'Available',  label_te: 'అందుబాటులో ఉంది',   color: 'text-green-600' },
  FILLING:   { label: 'Filling',    label_te: 'నిండుతోంది',         color: 'text-amber-600' },
  FULL:      { label: 'Full',       label_te: 'నిండిపోయింది',       color: 'text-red-600' },
  CLOSED:    { label: 'Closed',     label_te: 'మూసివేయబడింది',      color: 'text-gray-600' },
  UNKNOWN:   { label: 'Unknown',    label_te: 'తెలియదు',            color: 'text-gray-400' },
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
