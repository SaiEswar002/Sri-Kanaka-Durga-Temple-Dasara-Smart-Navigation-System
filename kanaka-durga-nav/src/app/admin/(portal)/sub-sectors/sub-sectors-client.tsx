'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Trash2, Edit3, MapPin, RefreshCw, X,
  CheckCircle2, AlertCircle, ChevronDown, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

const supabase = createClient();

/* ─── Types ──────────────────────────────────────────────── */
type Status     = 'ACTIVE' | 'INACTIVE' | 'RESTRICTED' | 'CLOSED';
type CrowdLevel = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface SubSector {
  id: string;
  sector_id: string;
  name: string;
  name_te: string;
  description: string | null;
  description_te: string | null;
  slug: string;
  status: Status;
  crowd_level: CrowdLevel;
  display_order: number;
  centroid?: { type: string; coordinates: [number, number] } | null;
  is_demo_data: boolean;
  sector?: { id: string; name: string };
}

interface Sector {
  id: string;
  name: string;
  name_te: string;
}

interface SubSectorForm {
  sector_id: string;
  name: string;
  name_te: string;
  description: string;
  description_te: string;
  slug: string;
  status: Status;
  crowd_level: CrowdLevel;
  display_order: number;
  lat: number | '';
  lng: number | '';
}

const DEFAULT_FORM: SubSectorForm = {
  sector_id: '',
  name: '',
  name_te: '',
  description: '',
  description_te: '',
  slug: '',
  status: 'ACTIVE',
  crowd_level: 'NORMAL',
  display_order: 0,
  lat: '',
  lng: '',
};

/* ─── Helpers ────────────────────────────────────────────── */
function toSlug(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const STATUS_COLORS: Record<Status, string> = {
  ACTIVE:     'bg-green-100 text-green-700 border-green-200',
  INACTIVE:   'bg-gray-100 text-gray-600 border-gray-200',
  RESTRICTED: 'bg-amber-100 text-amber-700 border-amber-200',
  CLOSED:     'bg-red-100 text-red-700 border-red-200',
};

const CROWD_COLORS: Record<CrowdLevel, string> = {
  LOW:      'bg-green-100 text-green-700 border-green-200',
  NORMAL:   'bg-blue-100 text-blue-700 border-blue-200',
  MEDIUM:   'bg-amber-100 text-amber-700 border-amber-200',
  HIGH:     'bg-orange-100 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
};

/* ─── Sub-Sectors Client ─────────────────────────────────── */
export default function SubSectorsClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubSectorForm>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string>('');

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin_sub_sectors_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_sectors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_sub_sectors'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  /* ── Fetch sectors (for dropdown) ──────────────────────── */
  const { data: sectors } = useQuery({
    queryKey: ['admin_sectors_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name, name_te')
        .eq('status', 'ACTIVE')
        .order('display_order');
      if (error) throw error;
      return data as Sector[];
    },
  });

  /* ── Fetch sub-sectors ──────────────────────────────────── */
  const { data: subSectors, isLoading } = useQuery({
    queryKey: ['admin_sub_sectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_sectors')
        .select('*, sector:sectors(id, name)')
        .order('sector_id')
        .order('display_order')
        .order('name');
      if (error) throw error;
      return data as SubSector[];
    },
  });

  /* ── Save (create / update) — via API route (service role) ── */
  const saveMutation = useMutation({
    mutationFn: async (payload: SubSectorForm) => {
      if (!payload.sector_id) throw new Error('Please select a parent sector.');
      const { lat, lng, ...rest } = payload;
      const centroid = typeof lat === 'number' && typeof lng === 'number'
        ? { type: 'Point', coordinates: [lng, lat] }
        : null;
      const body = { ...rest, centroid };
      const res = editingId
        ? await fetch('/api/admin/sub-sectors', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...body }),
          })
        : await fetch('/api/admin/sub-sectors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_sub_sectors'] });
      closeForm();
    },
    onError: (e: Error) => setError(e.message),
  });

  /* ── Delete — via API route (service role) ───────────────── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/sub-sectors?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_sub_sectors'] });
      setDeleteConfirm(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  /* ── Form helpers ───────────────────────────────────────── */
  function openNew() {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, sector_id: filterSector || sectors?.[0]?.id || '' });
    setError(null);
    setShowForm(true);
  }

  function openEdit(ss: SubSector) {
    setEditingId(ss.id);
    const [lng, lat] = ss.centroid?.coordinates ?? ['', ''];
    setForm({
      sector_id: ss.sector_id,
      name: ss.name,
      name_te: ss.name_te,
      description: ss.description ?? '',
      description_te: ss.description_te ?? '',
      slug: ss.slug,
      status: ss.status,
      crowd_level: ss.crowd_level,
      display_order: ss.display_order,
      lat: typeof lat === 'number' ? lat : '',
      lng: typeof lng === 'number' ? lng : '',
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sector_id) { setError('Please select a parent sector.'); return; }
    if (!form.name.trim()) { setError('Name (English) is required.'); return; }
    if (!form.name_te.trim()) { setError('Name (Telugu) is required.'); return; }
    if (!form.slug.trim()) { setError('Slug is required.'); return; }
    saveMutation.mutate(form);
  }

  const set = <K extends keyof SubSectorForm>(k: K, v: SubSectorForm[K]) => {
    setForm((f) => ({
      ...f,
      [k]: v,
      ...(k === 'name' ? { slug: toSlug(v as string) } : {}),
    }));
  };

  // Filtered list
  const displayed = filterSector
    ? (subSectors ?? []).filter((ss) => ss.sector_id === filterSector)
    : (subSectors ?? []);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div>
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
            Sub-Sectors
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Manage sub-zones within each sector — changes sync live to pilgrims
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-success)' }}>
            <span className="inline-flex w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
            Live sync
          </span>
          <button onClick={openNew} className="btn btn-primary text-sm" id="add-sub-sector-btn">
            <Plus size={16} />
            New Sub-Sector
          </button>
        </div>
      </div>

      {/* ── Sector filter ────────────────────────────────── */}
      {sectors && sectors.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <Layers size={15} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Filter by sector:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterSector('')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                !filterSector
                  ? 'border-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)]'
              )}
              style={!filterSector ? { background: 'var(--color-primary)' } : { color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
            >
              All ({subSectors?.length ?? 0})
            </button>
            {sectors.map((sec) => {
              const count = (subSectors ?? []).filter((ss) => ss.sector_id === sec.id).length;
              const active = filterSector === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setFilterSector(sec.id)}
                  className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-colors')}
                  style={active
                    ? { background: 'var(--color-primary)', color: 'white', border: '1px solid var(--color-primary)' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                  }
                >
                  {sec.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────── */}
      {error && !showForm && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid #FECACA' }}>
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw size={22} className="animate-spin mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading sub-sectors…</p>
          </div>
        ) : displayed.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name (EN)</th>
                <th>Name (TE)</th>
                <th>Parent Sector</th>
                <th>Crowd Level</th>
                <th>Status</th>
                <th>Order</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((ss) => (
                <tr key={ss.id}>
                  <td className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {ss.name}
                    {ss.is_demo_data && (
                      <span className="ml-2 badge text-[10px]" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid #BFDBFE' }}>
                        DEMO
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-telugu)' }}>{ss.name_te}</td>
                  <td>
                    <span className="badge text-xs" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-muted)' }}>
                      {ss.sector?.name ?? '—'}
                    </span>
                  </td>
                  <td><span className={cn('badge', CROWD_COLORS[ss.crowd_level])}>{ss.crowd_level}</span></td>
                  <td><span className={cn('badge', STATUS_COLORS[ss.status])}>{ss.status}</span></td>
                  <td className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{ss.display_order}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(ss)}
                        className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                        title="Edit"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      {deleteConfirm === ss.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(ss.id)}
                            className="px-2 py-1 text-xs font-bold rounded"
                            style={{ background: 'var(--color-danger)', color: 'white' }}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? '…' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-xs rounded"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(ss.id)}
                          className="p-2 rounded-lg transition-colors hover:bg-red-50"
                          title="Delete"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <MapPin size={32} className="mx-auto mb-3 opacity-25" />
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>
              {filterSector ? 'No sub-sectors in this sector' : 'No sub-sectors yet'}
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {sectors && sectors.length === 0
                ? 'Create a sector first before adding sub-sectors.'
                : 'Add a sub-sector to this sector to get started.'}
            </p>
            {sectors && sectors.length > 0 && (
              <button onClick={openNew} className="btn btn-primary btn-sm">
                <Plus size={14} /> Add Sub-Sector
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          ADD / EDIT MODAL
          ══════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', maxHeight: '92vh', overflowY: 'auto' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              <div className="flex items-center gap-2.5">
                <Layers size={18} />
                <h2 className="text-base font-bold">{editingId ? 'Edit Sub-Sector' : 'New Sub-Sector'}</h2>
              </div>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="px-3 py-2 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid #FECACA' }}>
                  <AlertCircle size={15} />{error}
                </div>
              )}

              {/* Parent sector */}
              <div>
                <label className="label">Parent Sector *</label>
                <div className="relative">
                  <select
                    className="select pr-8"
                    value={form.sector_id}
                    onChange={(e) => set('sector_id', e.target.value)}
                    required
                  >
                    <option value="">— Select a sector —</option>
                    {(sectors ?? []).map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                </div>
                {(!sectors || sectors.length === 0) && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                    No active sectors found. Create a sector first.
                  </p>
                )}
              </div>

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Name (English) *</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Gate 1 Entry Zone"
                    required
                  />
                </div>
                <div>
                  <label className="label">Name (Telugu) *</label>
                  <input
                    className="input"
                    value={form.name_te}
                    onChange={(e) => set('name_te', e.target.value)}
                    placeholder="గేట్ 1 ప్రవేశ ప్రాంతం"
                    style={{ fontFamily: 'var(--font-telugu)' }}
                    required
                  />
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className="label">Slug *</label>
                <input
                  className="input font-mono text-sm"
                  value={form.slug}
                  onChange={(e) => set('slug', toSlug(e.target.value))}
                  placeholder="gate-1-entry-zone"
                  required
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Auto-generated from name. Must be unique.</p>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Description (EN)</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Brief description…"
                  />
                </div>
                <div>
                  <label className="label">Description (TE)</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    value={form.description_te}
                    onChange={(e) => set('description_te', e.target.value)}
                    placeholder="వివరణ…"
                    style={{ fontFamily: 'var(--font-telugu)' }}
                  />
                </div>
              </div>

              {/* Status / Crowd / Order */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Status</label>
                  <div className="relative">
                    <select className="select pr-8" value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="RESTRICTED">Restricted</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="label">Crowd Level</label>
                  <div className="relative">
                    <select className="select pr-8" value={form.crowd_level} onChange={(e) => set('crowd_level', e.target.value as CrowdLevel)}>
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="label">Display Order</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.display_order}
                    onChange={(e) => set('display_order', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Coordinates (Centroid) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Latitude (Centroid)</label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    value={form.lat}
                    onChange={(e) => set('lat', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="16.5148"
                  />
                </div>
                <div>
                  <label className="label">Longitude (Centroid)</label>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    value={form.lng}
                    onChange={(e) => set('lng', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="80.6238"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={closeForm} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                  ) : (
                    <><CheckCircle2 size={14} /> {editingId ? 'Save Changes' : 'Create Sub-Sector'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
