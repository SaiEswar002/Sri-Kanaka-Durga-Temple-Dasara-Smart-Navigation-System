'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Users, RefreshCw, ChevronDown } from 'lucide-react';
import { cn, CROWD_LEVEL_CONFIG } from '@/lib/utils';
import type { CrowdLevel } from '@/types';

const supabase = createClient();

const CROWD_LEVELS: CrowdLevel[] = ['LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface SectorRow {
  id: string;
  name: string;
  crowd_level: CrowdLevel;
  crowd_updated_at: string | null;
  crowd_source: string | null;
  status: string;
}

export default function AdminCrowdClient() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data: sectors, isLoading } = useQuery({
    queryKey: ['admin_sectors_crowd'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name, crowd_level, crowd_updated_at, crowd_source, status')
        .order('display_order');
      if (error) throw error;
      return data as SectorRow[];
    },
  });

  // Realtime — sector crowd updates refresh the pilgrim home page too
  useEffect(() => {
    const ch = supabase.channel('admin_crowd_rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sectors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_sectors_crowd'] });
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
        queryClient.invalidateQueries({ queryKey: ['crowd_status'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const updateCrowd = useMutation({
    mutationFn: async ({ sector_id, crowd_level }: { sector_id: string; crowd_level: CrowdLevel }) => {
      setSaving(sector_id);
      const res = await fetch('/api/admin/crowd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector_id, crowd_level }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (_, vars) => {
      setSaving(null);
      setLastUpdated(vars.sector_id);
      setTimeout(() => setLastUpdated(null), 2000);
      queryClient.invalidateQueries({ queryKey: ['admin_sectors_crowd'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
    },
    onError: () => setSaving(null),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users size={22} className="text-primary" />
            Crowd Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Update sector crowd levels — pilgrims see colour-coded alerts instantly
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-2 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Live — all users see changes immediately
        </div>
      </div>

      {/* Crowd level legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CROWD_LEVELS.map(level => {
          const cfg = CROWD_LEVEL_CONFIG[level];
          return (
            <span key={level} className={cn('badge border text-xs', cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Loading sectors...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Sector</th>
                <th className="text-left px-4 py-3 font-semibold">Current Level</th>
                <th className="text-left px-4 py-3 font-semibold w-56">Update Level</th>
                <th className="text-left px-4 py-3 font-semibold">Last Updated</th>
                <th className="text-left px-4 py-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sectors?.map(s => {
                const cfg = CROWD_LEVEL_CONFIG[s.crowd_level];
                const isSavingThis = saving === s.id;
                const justSaved = lastUpdated === s.id;
                return (
                  <tr key={s.id} className={cn('transition-colors', justSaved && 'bg-emerald-50')}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge border text-xs font-semibold', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <select
                            className="input w-full appearance-none pr-8 text-sm py-1.5"
                            defaultValue={s.crowd_level}
                            disabled={isSavingThis}
                            onChange={e => updateCrowd.mutate({ sector_id: s.id, crowd_level: e.target.value as CrowdLevel })}
                          >
                            {CROWD_LEVELS.map(l => (
                              <option key={l} value={l}>{CROWD_LEVEL_CONFIG[l].label}</option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                        </div>
                        {isSavingThis && <RefreshCw size={14} className="animate-spin text-primary shrink-0" />}
                        {justSaved && <span className="text-emerald-500 text-xs font-semibold">✓ Saved</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {s.crowd_updated_at
                        ? new Date(s.crowd_updated_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs uppercase">
                      {s.crowd_source ?? 'MANUAL'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
        <strong>Tip:</strong> Changing a sector to <strong>HIGH</strong> or <strong>CRITICAL</strong> will show a red alert banner on the pilgrim Home page for that sector. CRITICAL triggers an urgent notification banner.
      </div>
    </div>
  );
}
