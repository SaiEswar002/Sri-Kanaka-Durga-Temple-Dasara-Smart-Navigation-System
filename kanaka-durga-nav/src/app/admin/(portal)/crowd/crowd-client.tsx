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
}

interface CrowdStatusRow {
  id: string;
  entity_id: string;
  entity_type: string;
  crowd_level: CrowdLevel;
  data_source: string;
  updated_at: string;
}

export default function AdminCrowdClient() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  /* ── Fetch sectors (simplified — no crowd fields) ────────── */
  const { data: sectors, isLoading } = useQuery({
    queryKey: ['admin_sectors_crowd'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name')
        .order('created_at');
      if (error) throw error;
      return data as SectorRow[];
    },
  });

  /* ── Fetch latest crowd_status per sector ────────────────── */
  const { data: crowdStatuses } = useQuery({
    queryKey: ['admin_crowd_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crowd_status')
        .select('id, entity_id, entity_type, crowd_level, data_source, updated_at')
        .eq('entity_type', 'SECTOR')
        .order('updated_at', { ascending: false });
      if (error) return [] as CrowdStatusRow[];
      return data as CrowdStatusRow[];
    },
  });

  // Build a map of entity_id → latest crowd status
  const crowdMap: Record<string, CrowdStatusRow> = {};
  for (const cs of crowdStatuses ?? []) {
    if (!crowdMap[cs.entity_id]) {
      crowdMap[cs.entity_id] = cs;
    }
  }

  /* ── Realtime ────────────────────────────────────────────── */
  useEffect(() => {
    const ch = supabase.channel('admin_crowd_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crowd_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_crowd_statuses'] });
        queryClient.invalidateQueries({ queryKey: ['crowd_status'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crowd_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_crowd_statuses'] });
        queryClient.invalidateQueries({ queryKey: ['crowd_status'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  /* ── Update crowd level ──────────────────────────────────── */
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
      queryClient.invalidateQueries({ queryKey: ['admin_crowd_statuses'] });
      queryClient.invalidateQueries({ queryKey: ['crowd_status'] });
    },
    onError: () => setSaving(null),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users size={22} style={{ color: 'var(--color-primary)' }} />
            Crowd Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Update sector crowd levels — pilgrims see colour-coded alerts instantly
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border"
          style={{ color: 'var(--color-success)', background: '#F0FDF4', borderColor: '#86EFAC' }}>
          <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: 'var(--color-success)' }} />
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
          <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Loading sectors...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-surface-secondary)', borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs">Sector</th>
                <th className="text-left px-4 py-3 font-semibold text-xs">Current Level</th>
                <th className="text-left px-4 py-3 font-semibold text-xs w-56">Update Level</th>
                <th className="text-left px-4 py-3 font-semibold text-xs">Last Updated</th>
                <th className="text-left px-4 py-3 font-semibold text-xs">Source</th>
              </tr>
            </thead>
            <tbody>
              {sectors?.map(s => {
                const cs = crowdMap[s.id];
                const currentLevel: CrowdLevel = cs?.crowd_level ?? 'NORMAL';
                const cfg = CROWD_LEVEL_CONFIG[currentLevel];
                const isSavingThis = saving === s.id;
                const justSaved = lastUpdated === s.id;
                return (
                  <tr key={s.id} className="transition-colors" style={{
                    background: justSaved ? '#F0FDF4' : undefined,
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{s.name}</td>
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
                            value={currentLevel}
                            disabled={isSavingThis}
                            onChange={e => updateCrowd.mutate({ sector_id: s.id, crowd_level: e.target.value as CrowdLevel })}
                          >
                            {CROWD_LEVELS.map(l => (
                              <option key={l} value={l}>{CROWD_LEVEL_CONFIG[l].label}</option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                        {isSavingThis && <RefreshCw size={14} className="animate-spin shrink-0" style={{ color: 'var(--color-primary)' }} />}
                        {justSaved && <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>✓ Saved</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {cs?.updated_at
                        ? new Date(cs.updated_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase" style={{ color: 'var(--color-text-muted)' }}>
                      {cs?.data_source ?? 'MANUAL'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 p-3 rounded-xl text-xs"
        style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
        <strong>Tip:</strong> Changing a sector to <strong>HIGH</strong> or <strong>CRITICAL</strong> will show a red alert banner on the pilgrim Home page for that sector. CRITICAL triggers an urgent notification banner.
      </div>
    </div>
  );
}
