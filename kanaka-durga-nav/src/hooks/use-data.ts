'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  Location, DarshanQueue, ParkingArea, Announcement,
  EmergencyPoint, CrowdStatus, RouteClosure, Sector, SubSector,
  LocationCategory, ParkingStatus
} from '@/types';

const supabase = createClient();

// ============================================================
// LOCATION CATEGORIES
// ============================================================
export function useLocationCategories() {
  return useQuery({
    queryKey: ['location_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as LocationCategory[];
    },
    staleTime: 5 * 60_000, // 5 minutes — rarely changes
  });
}

// ============================================================
// SECTORS
// ============================================================
export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .neq('status', 'CLOSED')
        .order('display_order');
      if (error) throw error;
      return data as Sector[];
    },
  });
}

export function useSubSectors(sectorId?: string) {
  return useQuery({
    queryKey: ['sub_sectors', sectorId],
    queryFn: async () => {
      let query = supabase
        .from('sub_sectors')
        .select('*, sector:sectors(*)')
        .neq('status', 'CLOSED')
        .order('display_order');
      if (sectorId) {
        query = query.eq('sector_id', sectorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as SubSector[];
    },
  });
}

// ============================================================
// LOCATIONS
// ============================================================
export function useLocations(categorySlug?: string) {
  return useQuery({
    queryKey: ['locations', categorySlug],
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select('*, category:location_categories(*), sector:sectors(*)')
        .in('status', ['ACTIVE', 'TEMPORARY'])
        .order('display_order');

      if (categorySlug) {
        // Join through category
        query = supabase
          .from('locations')
          .select('*, category:location_categories!inner(*), sector:sectors(*)')
          .eq('location_categories.slug', categorySlug)
          .in('status', ['ACTIVE', 'TEMPORARY'])
          .order('display_order');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Location[];
    },
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: ['location', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*, category:location_categories(*), sector:sectors(*), sub_sector:sub_sectors(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Location;
    },
    enabled: !!id,
  });
}

// ============================================================
// DARSHAN QUEUES — with realtime subscription
// ============================================================
export function useDarshanQueues() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['darshan_queues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('darshan_queues')
        .select('*, location:locations(*, category:location_categories(*))')
        .order('created_at');
      if (error) throw error;
      return data as DarshanQueue[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('darshan_queues_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'darshan_queues' }, () => {
        queryClient.invalidateQueries({ queryKey: ['darshan_queues'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// ============================================================
// PARKING AREAS + STATUS — with realtime
// ============================================================
export function useParkingAreas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['parking_areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parking_areas')
        .select('*, current_status:parking_status(*), location:locations(*)')
        .order('created_at');
      if (error) throw error;
      return data as ParkingArea[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('parking_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['parking_areas'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// ============================================================
// ANNOUNCEMENTS — with realtime
// ============================================================
export function useAnnouncements() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'ACTIVE')
        .lte('starts_at', new Date().toISOString())
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('priority', { ascending: false })
        .order('starts_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Announcement[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('announcements_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// ============================================================
// EMERGENCY POINTS
// ============================================================
export function useEmergencyPoints() {
  return useQuery({
    queryKey: ['emergency_points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_points')
        .select('*, location:locations(*)')
        .eq('status', 'ACTIVE')
        .order('emergency_type');
      if (error) throw error;
      return data as EmergencyPoint[];
    },
  });
}

// ============================================================
// CROWD STATUS — with realtime
// ============================================================
export function useCrowdStatus() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['crowd_status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crowd_status')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as CrowdStatus[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('crowd_status_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crowd_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['crowd_status'] });
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// ============================================================
// ACTIVE ROUTE CLOSURES — with realtime
// ============================================================
export function useActiveClosures() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['route_closures', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_closures')
        .select('*')
        .in('status', ['SCHEDULED', 'ACTIVE'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RouteClosure[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('closures_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'route_closures' }, () => {
        queryClient.invalidateQueries({ queryKey: ['route_closures'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}
