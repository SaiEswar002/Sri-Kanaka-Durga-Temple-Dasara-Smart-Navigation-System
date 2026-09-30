'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  Location, ParkingArea, Sector, SubSector,
  LocationCategory
} from '@/types';
import {
  DEMO_CATEGORIES,
  DEMO_SECTORS,
  DEMO_LOCATIONS,
  DEMO_PARKING_AREAS,
} from '@/lib/mock-data';

const supabase = createClient();

// ============================================================
// LOCATION CATEGORIES
// ============================================================
export function useLocationCategories() {
  return useQuery({
    queryKey: ['location_categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('location_categories')
          .select('*')
          .order('display_order');
        if (error || !data || data.length === 0) return DEMO_CATEGORIES;
        return data as LocationCategory[];
      } catch (e) {
        console.warn('[useLocationCategories] Supabase unavailable, using demo categories:', e);
        return DEMO_CATEGORIES;
      }
    },
    staleTime: 5 * 60_000,
  });
}

// ============================================================
// SECTORS — Phase 2: no status/slug/display_order filter
// ============================================================
export function useSectors() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sectors'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('sectors')
          .select('*')
          .order('created_at');
        if (error || !data || data.length === 0) return DEMO_SECTORS;
        return data as Sector[];
      } catch (e) {
        console.warn('[useSectors] Supabase unavailable, using demo sectors:', e);
        return DEMO_SECTORS;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('sectors_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, () => {
          queryClient.invalidateQueries({ queryKey: ['sectors'] });
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  return query;
}

export function useSubSectors(sectorId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sub_sectors', sectorId],
    queryFn: async () => {
      try {
        let q = supabase
          .from('sub_sectors')
          .select('*, sector:sectors(*)')
          .order('created_at');
        if (sectorId) {
          q = q.eq('sector_id', sectorId);
        }
        const { data, error } = await q;
        if (error || !data) return [];
        return data as SubSector[];
      } catch (e) {
        console.warn('[useSubSectors] Supabase unavailable:', e);
        return [];
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('sub_sectors_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_sectors' }, () => {
          queryClient.invalidateQueries({ queryKey: ['sub_sectors'] });
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  return query;
}

// ============================================================
// LOCATIONS — Phase 2 simplified query
// ============================================================
export function useLocations(categorySlug?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['locations', categorySlug],
    queryFn: async () => {
      try {
        let query = supabase
          .from('locations')
          .select('*, category:location_categories(*), sector:sectors(*), sub_sector:sub_sectors(*)')
          .order('name');

        if (categorySlug) {
          const { data: catData } = await supabase
            .from('location_categories')
            .select('id')
            .eq('slug', categorySlug)
            .single();

          if (catData) {
            query = query.eq('category_id', catData.id);
          }
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
          if (categorySlug) {
            return DEMO_LOCATIONS.filter((l) => l.category?.slug === categorySlug);
          }
          return DEMO_LOCATIONS;
        }
        return data as Location[];
      } catch (e) {
        console.warn('[useLocations] Supabase unavailable, using demo locations:', e);
        if (categorySlug) {
          return DEMO_LOCATIONS.filter((l) => l.category?.slug === categorySlug);
        }
        return DEMO_LOCATIONS;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('locations_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  return query;
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: ['location', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*, category:location_categories(*), sector:sectors(*), sub_sector:sub_sectors(*)')
          .eq('id', id)
          .single();
        if (error || !data) {
          return DEMO_LOCATIONS.find((l) => l.id === id) ?? null;
        }
        return data as Location;
      } catch (e) {
        console.warn('[useLocation] Supabase unavailable, using demo location:', e);
        return DEMO_LOCATIONS.find((l) => l.id === id) ?? null;
      }
    },
    enabled: !!id,
  });
}

// ============================================================
// PARKING AREAS + STATUS — with realtime
// ============================================================
export function useParkingAreas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['parking_areas'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('parking_areas')
          .select('*, current_status:parking_status(*), location:locations(*)')
          .order('created_at');
        if (error || !data || data.length === 0) return DEMO_PARKING_AREAS;
        return data as ParkingArea[];
      } catch (e) {
        console.warn('[useParkingAreas] Supabase unavailable, using demo parking:', e);
        return DEMO_PARKING_AREAS;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('parking_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_status' }, () => {
          queryClient.invalidateQueries({ queryKey: ['parking_areas'] });
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  return query;
}

// ============================================================
// ADMIN — ALL SECTORS (for dashboard/selectors)
// ============================================================
export function useAdminSectors() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin_sectors'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('sectors')
          .select('id, name, name_te')
          .order('created_at');
        if (error || !data) return [] as Array<{ id: string; name: string; name_te: string }>;
        return data as Array<{ id: string; name: string; name_te: string }>;
      } catch {
        return [] as Array<{ id: string; name: string; name_te: string }>;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('admin_sectors_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, () => {
          queryClient.invalidateQueries({ queryKey: ['admin_sectors'] });
          queryClient.invalidateQueries({ queryKey: ['sectors'] });
          queryClient.invalidateQueries({ queryKey: ['sub_sectors'] });
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  return query;
}

// ============================================================
// ADMIN — PARKING STATUS joined with area name, with realtime
// ============================================================
export function useAdminParkingStatus() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin_parking_status'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('parking_status')
          .select('id, parking_area_id, occupied, available, status, updated_at, parking_area:parking_areas(name)')
          .order('updated_at', { ascending: false });
        if (error || !data) return [] as Array<{ id: string; occupied: number; available: number; status: import('@/types').ParkingAvailabilityStatus; updated_at: string; parking_area: { name: string } | null }>;
        return data as unknown as Array<{ id: string; occupied: number; available: number; status: import('@/types').ParkingAvailabilityStatus; updated_at: string; parking_area: { name: string } | null }>;
      } catch {
        return [] as Array<{ id: string; occupied: number; available: number; status: import('@/types').ParkingAvailabilityStatus; updated_at: string; parking_area: { name: string } | null }>;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('admin_parking_status_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_status' }, () => {
          queryClient.invalidateQueries({ queryKey: ['admin_parking_status'] });
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  return query;
}
