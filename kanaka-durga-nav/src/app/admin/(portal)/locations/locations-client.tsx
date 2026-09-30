'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Trash2, Edit3, MapPin, RefreshCw, X, AlertCircle,
  CheckCircle2, ChevronDown, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Location, LocationCategory, Sector } from '@/types';

const supabase = createClient();

/* ─── Types (Phase 2 simplified) ─────────────────────────── */
interface LocationForm {
  name: string;
  name_te: string;
  category_id: string;
  sector_id: string;
  sub_sector_id: string;
  description: string;
  address: string;
  lat: number | '';
  lng: number | '';
}

const DEFAULT_FORM: LocationForm = {
  name: '', name_te: '', category_id: '', sector_id: '', sub_sector_id: '',
  description: '', address: '',
  lat: '', lng: '',
};

/* ─── Locations Admin Client ─────────────────────────────── */
export default function AdminLocationsClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  /* ── Queries ────────────────────────────────────────────── */
  const { data: locations, isLoading } = useQuery({
    queryKey: ['admin_locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*, category:location_categories(id, name, slug), sector:sectors(id, name), sub_sector:sub_sectors(id, name)')
        .order('created_at');
      if (error) throw error;
      return data as Location[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['location_categories'],
    queryFn: async () => {
      const { data } = await supabase.from('location_categories').select('id, name, slug').order('display_order');
      return data as LocationCategory[];
    },
  });

  const { data: sectors } = useQuery({
    queryKey: ['sectors_for_loc'],
    queryFn: async () => {
      const { data } = await supabase.from('sectors').select('id, name').order('created_at');
      return data as Sector[];
    },
  });

  const { data: allSubSectors } = useQuery({
    queryKey: ['sub_sectors_for_loc'],
    queryFn: async () => {
      const { data } = await supabase.from('sub_sectors').select('id, name, sector_id').order('created_at');
      return (data ?? []) as { id: string; name: string; sector_id: string }[];
    },
  });

  // Sub-sectors filtered by chosen sector
  const availableSubSectors = allSubSectors?.filter(s => !form.sector_id || s.sector_id === form.sector_id) ?? [];

  /* ── Realtime ───────────────────────────────────────────── */
  useEffect(() => {
    const ch = supabase.channel('admin_locations_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_locations'] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  /* ── Create mutation ────────────────────────────────────── */
  const createMut = useMutation({
    mutationFn: async (f: LocationForm) => {
      const lat = typeof f.lat === 'number' ? f.lat : null;
      const lng = typeof f.lng === 'number' ? f.lng : null;
      if (lat === null || lng === null) throw new Error('Latitude and Longitude are required.');

      // Client-side sector/sub-sector validation
      if (f.sub_sector_id && f.sector_id) {
        const ss = allSubSectors?.find(s => s.id === f.sub_sector_id);
        if (ss && ss.sector_id !== f.sector_id) {
          throw new Error('Selected sub-sector does not belong to the chosen sector.');
        }
      }

      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, name_te: f.name_te || f.name,
          category_id: f.category_id,
          sector_id: f.sector_id || null,
          sub_sector_id: f.sub_sector_id || null,
          position: { type: 'Point', coordinates: [lng, lat] },
          description: f.description || null,
          address: f.address || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  /* ── Update mutation ────────────────────────────────────── */
  const updateMut = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: LocationForm }) => {
      const lat = typeof f.lat === 'number' ? f.lat : null;
      const lng = typeof f.lng === 'number' ? f.lng : null;
      if (lat === null || lng === null) throw new Error('Latitude and Longitude are required.');

      // Client-side sector/sub-sector validation
      if (f.sub_sector_id && f.sector_id) {
        const ss = allSubSectors?.find(s => s.id === f.sub_sector_id);
        if (ss && ss.sector_id !== f.sector_id) {
          throw new Error('Selected sub-sector does not belong to the chosen sector.');
        }
      }

      const res = await fetch('/api/admin/locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: f.name, name_te: f.name_te || f.name,
          category_id: f.category_id,
          sector_id: f.sector_id || null,
          sub_sector_id: f.sub_sector_id || null,
          position: { type: 'Point', coordinates: [lng, lat] },
          description: f.description || null,
          address: f.address || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowForm(false);
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  /* ── Delete mutation ────────────────────────────────────── */
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/locations?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });

  /* ── Open edit modal ────────────────────────────────────── */
  function openEdit(loc: Location) {
    setEditingId(loc.id);
    const [lng, lat] = loc.position?.coordinates ?? [80.6065, 16.5154];
    setForm({
      name: loc.name,
      name_te: loc.name_te ?? '',
      category_id: loc.category_id ?? (loc.category as LocationCategory | null)?.id ?? '',
      sector_id: loc.sector_id ?? (loc.sector as Sector | null)?.id ?? '',
      sub_sector_id: loc.sub_sector_id ?? (loc.sub_sector as { id: string } | null)?.id ?? '',
      description: loc.description ?? '',
      address: loc.address ?? '',
      lat: lat ?? '',
      lng: lng ?? '',
    });
    setShowForm(true);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.category_id) { setError('Category is required.'); return; }
    if (form.lat === '' || form.lng === '') { setError('Latitude and Longitude are required.'); return; }
    if (editingId) updateMut.mutate({ id: editingId, f: form });
    else createMut.mutate(form);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  const filtered = locations?.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin size={22} style={{ color: 'var(--color-primary)' }} />
            Locations
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Add / edit facility locations — new pins appear on the pilgrim map immediately
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm gap-1.5"
          onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM); setError(null); }}
          id="add-location-btn"
        >
          <Plus size={16} /> Add Location
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-3" style={{ color: 'var(--color-text-muted)' }} />
        <input
          className="input pl-8 w-full"
          placeholder="Search locations..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ══════════════════════════════════════════════════
          ADD / EDIT MODAL
          ══════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-xl max-h-[90dvh] overflow-y-auto"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              <div className="flex items-center gap-2.5">
                <MapPin size={18} />
                <h2 className="font-bold text-base">{editingId ? 'Edit Location' : 'Add Location'}</h2>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
                className="p-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="px-3 py-2 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid #FECACA' }}>
                  <AlertCircle size={15} />{error}
                </div>
              )}

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name (English) *</label>
                  <input
                    className="input w-full"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Darshan Queue 1"
                    required
                  />
                </div>
                <div>
                  <label className="label">Name (Telugu)</label>
                  <input
                    className="input w-full"
                    value={form.name_te}
                    onChange={e => setForm(f => ({ ...f, name_te: e.target.value }))}
                    placeholder="తెలుగు పేరు"
                    style={{ fontFamily: 'var(--font-telugu)' }}
                  />
                </div>
              </div>

              {/* Category + Sector + Sub-Sector */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Category *</label>
                  <div className="relative">
                    <select
                      className="input w-full appearance-none pr-8"
                      value={form.category_id}
                      onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                      required
                    >
                      <option value="">Select…</option>
                      {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="label">Sector</label>
                  <div className="relative">
                    <select
                      className="input w-full appearance-none pr-8"
                      value={form.sector_id}
                      onChange={e => setForm(f => ({ ...f, sector_id: e.target.value, sub_sector_id: '' }))}
                    >
                      <option value="">None</option>
                      {sectors?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="label">Sub-Sector</label>
                  <div className="relative">
                    <select
                      className="input w-full appearance-none pr-8"
                      value={form.sub_sector_id}
                      onChange={e => setForm(f => ({ ...f, sub_sector_id: e.target.value }))}
                      disabled={!form.sector_id}
                    >
                      <option value="">None</option>
                      {availableSubSectors.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  {!form.sector_id && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Select a sector first</p>
                  )}
                </div>
              </div>

              {/* Lat / Lng — required */}
              <div>
                <label className="label mb-2 block">Map Coordinates *</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Latitude (°N)</label>
                    <input
                      type="number" step="any"
                      className="input w-full"
                      value={form.lat}
                      onChange={e => setForm(f => ({ ...f, lat: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                      placeholder="16.5154"
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Longitude (°E)</label>
                    <input
                      type="number" step="any"
                      className="input w-full"
                      value={form.lng}
                      onChange={e => setForm(f => ({ ...f, lng: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                      placeholder="80.6065"
                      required
                    />
                  </div>
                </div>
                {/* Coordinate presets for Indrakeeladri */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Presets:</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, lat: 16.515406, lng: 80.606534 }))}
                    className="text-[11px] px-2 py-0.5 rounded font-medium transition-colors"
                    style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                    Sanctum (16.5154, 80.6065)
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, lat: 16.514600, lng: 80.606800 }))}
                    className="text-[11px] px-2 py-0.5 rounded transition-colors"
                    style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}>
                    Ghat Road (16.5146, 80.6068)
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, lat: 16.513500, lng: 80.609500 }))}
                    className="text-[11px] px-2 py-0.5 rounded transition-colors"
                    style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}>
                    Canal Road (16.5135, 80.6095)
                  </button>
                </div>
                <p className="text-[11px] rounded px-2.5 py-1 mt-1"
                  style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                  ⚠️ Note: Wikipedia lists 80.6215°E incorrectly. True Indrakeeladri sanctum is <strong>16.5154°N, 80.6065°E</strong>.
                </p>
              </div>

              {/* Address */}
              <div>
                <label className="label">Address</label>
                <input
                  className="input w-full"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street / landmark"
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input w-full min-h-[60px] resize-none"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description visible to pilgrims…"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isSaving} className="btn btn-primary flex-1 gap-2">
                  {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {editingId ? 'Save Changes' : 'Add to Map'}
                </button>
                <button type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
                  className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Loading locations...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-surface-secondary)', borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-xs">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-xs">Sector</th>
                <th className="text-left px-4 py-3 font-semibold text-xs">Coords</th>
                <th className="text-right px-4 py-3 font-semibold text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(loc => {
                const cat = loc.category as LocationCategory | null;
                const sec = loc.sector as Sector | null;
                const [lng, lat] = loc.position?.coordinates ?? [];
                return (
                  <tr key={loc.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">
                      {loc.name}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{cat?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs max-w-[130px]" style={{ color: 'var(--color-text-muted)' }}>
                      <div className="font-medium truncate">{sec?.name ?? '—'}</div>
                      {(loc.sub_sector as { name?: string } | null)?.name && (
                        <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          ↳ {(loc.sub_sector as { name: string }).name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(loc)} className="btn btn-ghost btn-xs gap-1" style={{ color: 'var(--color-text-muted)' }}>
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${loc.name}"? This removes it from the pilgrim map.`)) deleteMut.mutate(loc.id); }}
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {search ? 'No matching locations.' : 'No locations yet — add one above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
        💡 New locations appear as map pins for pilgrims within seconds via realtime sync
      </p>
    </div>
  );
}
