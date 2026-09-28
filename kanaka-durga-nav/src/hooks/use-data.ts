'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  Location, DarshanQueue, ParkingArea, Announcement,
  EmergencyPoint, CrowdStatus, RouteClosure, Sector, SubSector,
  LocationCategory
} from '@/types';
import {
  DEMO_CATEGORIES,
  DEMO_SECTORS,
  DEMO_LOCATIONS,
  DEMO_DARSHAN_QUEUES,
  DEMO_PARKING_AREAS,
  DEMO_ANNOUNCEMENTS,
  DEMO_EMERGENCY_POINTS,
  DEMO_ROUTE_CLOSURES,
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
// SECTORS
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
          .neq('status', 'CLOSED')
          .order('display_order');
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
        let query = supabase
          .from('sub_sectors')
          .select('*, sector:sectors(*)')
          .neq('status', 'CLOSED')
          .order('display_order');
        if (sectorId) {
          query = query.eq('sector_id', sectorId);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data as SubSector[];
      } catch {
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
// LOCATIONS
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
          .in('status', ['ACTIVE', 'TEMPORARY'])
          .order('display_order');

        if (categorySlug) {
          query = supabase
            .from('locations')
            .select('*, category:location_categories!inner(*), sector:sectors(*), sub_sector:sub_sectors(*)')
            .eq('location_categories.slug', categorySlug)
            .in('status', ['ACTIVE', 'TEMPORARY'])
            .order('display_order');
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

  // Realtime: when admin adds/edits/deletes a location/sector/sub-sector, refresh all pilgrim views
  useEffect(() => {
    try {
      const channel = supabase
        .channel('locations_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, () => {
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_sectors' }, () => {
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
// DARSHAN QUEUES — with realtime subscription
// ============================================================
export function useDarshanQueues() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['darshan_queues'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('darshan_queues')
          .select('*, location:locations(*, category:location_categories(*))')
          .order('created_at');
        if (error || !data || data.length === 0) return DEMO_DARSHAN_QUEUES;
        return data as DarshanQueue[];
      } catch (e) {
        console.warn('[useDarshanQueues] Supabase unavailable, using demo queues:', e);
        return DEMO_DARSHAN_QUEUES;
      }
    },
  });

  // Realtime subscription (safe try-catch)
  useEffect(() => {
    try {
      const channel = supabase
        .channel('darshan_queues_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'darshan_queues' }, () => {
          queryClient.invalidateQueries({ queryKey: ['darshan_queues'] });
        })
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    } catch {}
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

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    } catch {}
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
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('status', 'ACTIVE')
          .lte('starts_at', new Date().toISOString())
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .order('priority', { ascending: false })
          .order('starts_at', { ascending: false })
          .limit(20);
        if (error || !data || data.length === 0) return DEMO_ANNOUNCEMENTS;
        return data as Announcement[];
      } catch (e) {
        console.warn('[useAnnouncements] Supabase unavailable, using demo announcements:', e);
        return DEMO_ANNOUNCEMENTS;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('announcements_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
        })
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    } catch {}
  }, [queryClient]);

  return query;
}

// ============================================================
// EMERGENCY POINTS
// ============================================================
export function useEmergencyPoints() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['emergency_points'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('emergency_points')
          .select('*, location:locations(*)')
          .eq('status', 'ACTIVE')
          .order('emergency_type');
        if (error || !data || data.length === 0) return DEMO_EMERGENCY_POINTS;
        return data as EmergencyPoint[];
      } catch (e) {
        console.warn('[useEmergencyPoints] Supabase unavailable, using demo points:', e);
        return DEMO_EMERGENCY_POINTS;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('emergency_points_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_points' }, () => {
          queryClient.invalidateQueries({ queryKey: ['emergency_points'] });
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  return query;
}

// ============================================================
// CROWD STATUS — with realtime
// ============================================================
export function useCrowdStatus() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['crowd_status'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('crowd_status')
          .select('*')
          .order('updated_at', { ascending: false });
        if (error || !data) return [];
        return data as CrowdStatus[];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('crowd_status_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crowd_status' }, () => {
          queryClient.invalidateQueries({ queryKey: ['crowd_status'] });
          queryClient.invalidateQueries({ queryKey: ['sectors'] });
        })
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    } catch {}
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
      try {
        const { data, error } = await supabase
          .from('route_closures')
          .select('*')
          .in('status', ['SCHEDULED', 'ACTIVE'])
          .order('created_at', { ascending: false });
        if (error || !data || data.length === 0) return DEMO_ROUTE_CLOSURES;
        return data as RouteClosure[];
      } catch (e) {
        console.warn('[useActiveClosures] Supabase unavailable, using demo closures:', e);
        return DEMO_ROUTE_CLOSURES;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('closures_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'route_closures' }, () => {
          queryClient.invalidateQueries({ queryKey: ['route_closures'] });
        })
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    } catch {}
  }, [queryClient]);

  return query;
}

// ============================================================
// ADMIN — ALL SECTORS (including non-public ones, for dashboard)
// ============================================================
export function useAdminSectors() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin_sectors'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('sectors')
          .select('id, name, crowd_level, status')
          .order('display_order');
        if (error || !data) return [] as Array<{ id: string; name: string; crowd_level: string; status: string }>;
        return data as Array<{ id: string; name: string; crowd_level: string; status: string }>;
      } catch {
        return [] as Array<{ id: string; name: string; crowd_level: string; status: string }>;
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('admin_sectors_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, () => {
          queryClient.invalidateQueries({ queryKey: ['admin_sectors'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crowd_status' }, () => {
          queryClient.invalidateQueries({ queryKey: ['admin_sectors'] });
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  return query;
}

// ============================================================
// ADMIN — EMERGENCY INCIDENTS (open/responding) with realtime
// ============================================================
export function useEmergencyIncidents() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['emergency_incidents'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('emergency_incidents')
          .select('*')
          .in('status', ['OPEN', 'RESPONDING'])
          .order('created_at', { ascending: false })
          .limit(10);
        if (error || !data) return [] as import('@/types').EmergencyIncident[];
        return data as import('@/types').EmergencyIncident[];
      } catch {
        return [] as import('@/types').EmergencyIncident[];
      }
    },
  });

  useEffect(() => {
    try {
      const channel = supabase
        .channel('emergency_incidents_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_incidents' }, () => {
          queryClient.invalidateQueries({ queryKey: ['emergency_incidents'] });
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

