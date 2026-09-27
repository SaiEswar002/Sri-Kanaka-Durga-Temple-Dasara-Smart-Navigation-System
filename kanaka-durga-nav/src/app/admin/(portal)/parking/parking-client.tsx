'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Car, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParkingArea, ParkingAvailabilityStatus } from '@/types';

const supabase = createClient();

const STATUS_OPTS: ParkingAvailabilityStatus[] = ['AVAILABLE', 'FILLING', 'FULL', 'CLOSED', 'UNKNOWN'];

const STATUS_BADGE: Record<ParkingAvailabilityStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FILLING:   'bg-amber-100 text-amber-700 border-amber-200',
  FULL:      'bg-red-100 text-red-700 border-red-200',
  CLOSED:    'bg-gray-200 text-gray-600 border-gray-300',
  UNKNOWN:   'bg-gray-100 text-gray-500 border-gray-200',
};

export default function AdminParkingClient() {
  const queryClient = useQueryClient();

  const { data: areas, isLoading } = useQuery({
    queryKey: ['admin_parking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parking_areas')
        .select('*, current_status:parking_status(*), location:locations(name)')
        .order('created_at');
      if (error) throw error;
      return data as ParkingArea[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel('admin_parking_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_parking'] });
        queryClient.invalidateQueries({ queryKey: ['parking_areas'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const updateParking = useMutation({
    mutationFn: async ({
      parking_area_id, occupied, available, status, total
    }: { parking_area_id: string; occupied: number; available: number; status: ParkingAvailabilityStatus; total: number }) => {
      // Auto-compute status if not manually set
      const autoStatus: ParkingAvailabilityStatus = available === 0 ? 'FULL' :
        available / total < 0.15 ? 'FILLING' : 'AVAILABLE';
      const res = await fetch('/api/admin/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parking_area_id, occupied, available, status: status ?? autoStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_parking'] });
      queryClient.invalidateQueries({ queryKey: ['parking_areas'] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car size={22} className="text-primary" />
            Parking Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Update parking availability — pilgrims see live counts and status colours
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-2 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Live sync
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading parking areas...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Area</th>
                <th className="text-left px-4 py-3 font-semibold">Total</th>
                <th className="text-left px-4 py-3 font-semibold">Occupied</th>
                <th className="text-left px-4 py-3 font-semibold">Available</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {areas?.map(area => {
                const s = Array.isArray(area.current_status) ? area.current_status[0] : area.current_status;
                const status: ParkingAvailabilityStatus = s?.status ?? 'UNKNOWN';
                return (
                  <tr key={area.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{area.name}</td>
                    <td className="px-4 py-3 text-gray-600">{area.total_capacity}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={area.total_capacity}
                        defaultValue={s?.occupied ?? 0}
                        className="input py-1 px-2 w-20 text-sm"
                        id={`occupied-${area.id}`}
                        title="Click to edit — saves on blur"
                        onBlur={e => {
                          const occ = Math.max(0, Math.min(Number(e.target.value), area.total_capacity));
                          const avail = area.total_capacity - occ;
                          const avInput = document.getElementById(`available-${area.id}`) as HTMLInputElement;
                          if (avInput) avInput.value = String(avail);
                          updateParking.mutate({
                            parking_area_id: area.id,
                            occupied: occ,
                            available: avail,
                            status,
                            total: area.total_capacity,
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={area.total_capacity}
                        defaultValue={s?.available ?? area.total_capacity}
                        className="input py-1 px-2 w-20 text-sm"
                        id={`available-${area.id}`}
                        title="Click to edit — saves on blur"
                        onBlur={e => {
                          const avail = Math.max(0, Math.min(Number(e.target.value), area.total_capacity));
                          const occ = area.total_capacity - avail;
                          const occInput = document.getElementById(`occupied-${area.id}`) as HTMLInputElement;
                          if (occInput) occInput.value = String(occ);
                          updateParking.mutate({
                            parking_area_id: area.id,
                            occupied: occ,
                            available: avail,
                            status,
                            total: area.total_capacity,
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge border text-xs', STATUS_BADGE[status])}>{status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative w-32">
                        <select
                          className="input w-full appearance-none pr-8 text-sm py-1.5"
                          defaultValue={status}
                          onChange={e => updateParking.mutate({
                            parking_area_id: area.id,
                            occupied: s?.occupied ?? 0,
                            available: s?.available ?? area.total_capacity,
                            status: e.target.value as ParkingAvailabilityStatus,
                            total: area.total_capacity,
                          })}
                        >
                          {STATUS_OPTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">💡 Edit Occupied or Available count and click away — status updates automatically. Pilgrims see changes immediately.</p>
    </div>
  );
}
