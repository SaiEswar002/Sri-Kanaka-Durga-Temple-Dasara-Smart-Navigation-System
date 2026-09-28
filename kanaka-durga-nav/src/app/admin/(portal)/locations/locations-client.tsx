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

interface LocationForm {
  name: string;
  name_te: string;
  category_id: string;
  sector_id: string;
  sub_sector_id: string;
  status: string;
  address: string;
  description: string;
  contact_phone: string;
  operating_hours: string;
  lat: number | '';
  lng: number | '';
  is_accessible: boolean;
}

const DEFAULT_FORM: LocationForm = {
  name: '', name_te: '', category_id: '', sector_id: '', sub_sector_id: '', status: 'ACTIVE',
  address: '', description: '', contact_phone: '', operating_hours: '',
  lat: '', lng: '', is_accessible: false,
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-gray-100 text-gray-500 border-gray-200',
  TEMPORARY: 'bg-amber-100 text-amber-700 border-amber-200',
  CLOSED: 'bg-red-100 text-red-600 border-red-200',
};

export default function AdminLocationsClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: locations, isLoading } = useQuery({
    queryKey: ['admin_locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*, category:location_categories(id, name, slug), sector:sectors(id, name), sub_sector:sub_sectors(id, name)')
        .order('display_order');
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
      const { data } = await supabase.from('sectors').select('id, name').order('display_order');
      return data as Sector[];
    },
  });

  const { data: allSubSectors } = useQuery({
    queryKey: ['sub_sectors_for_loc'],
    queryFn: async () => {
      const { data } = await supabase.from('sub_sectors').select('id, name, sector_id').order('display_order');
      return (data ?? []) as { id: string; name: string; sector_id: string }[];
    },
  });

  const availableSubSectors = allSubSectors?.filter(s => !form.sector_id || s.sector_id === form.sector_id) ?? [];

  // Realtime: invalidate pilgrim map when locations change
  useEffect(() => {
    const ch = supabase.channel('admin_locations_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_locations'] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const createMut = useMutation({
    mutationFn: async (f: LocationForm) => {
      const lat = typeof f.lat === 'number' ? f.lat : 16.5148;
      const lng = typeof f.lng === 'number' ? f.lng : 80.6238;
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          position: { type: 'Point', coordinates: [lng, lat] },
          sector_id: f.sector_id || null,
          sub_sector_id: f.sub_sector_id || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_locations'] }); queryClient.invalidateQueries({ queryKey: ['locations'] }); setShowForm(false); setForm(DEFAULT_FORM); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: LocationForm }) => {
      const lat = typeof f.lat === 'number' ? f.lat : undefined;
      const lng = typeof f.lng === 'number' ? f.lng : undefined;
      const res = await fetch('/api/admin/locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, ...f,
          position: lat !== undefined && lng !== undefined ? { type: 'Point', coordinates: [lng, lat] } : undefined,
          sector_id: f.sector_id || null,
          sub_sector_id: f.sub_sector_id || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_locations'] }); queryClient.invalidateQueries({ queryKey: ['locations'] }); setShowForm(false); setEditingId(null); setForm(DEFAULT_FORM); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/locations?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_locations'] }); queryClient.invalidateQueries({ queryKey: ['locations'] }); },
  });

  function openEdit(loc: Location) {
    setEditingId(loc.id);
    const [lng, lat] = loc.position?.coordinates ?? [80.6238, 16.5148];
    setForm({
      name: loc.name, name_te: loc.name_te ?? '',
      category_id: loc.category_id ?? (loc.category as LocationCategory | null)?.id ?? '',
      sector_id: loc.sector_id ?? (loc.sector as Sector | null)?.id ?? '',
      sub_sector_id: loc.sub_sector_id ?? (loc.sub_sector as { id: string } | null)?.id ?? '',
      status: loc.status, address: loc.address ?? '',
      description: loc.description ?? '',
      contact_phone: loc.contact_phone ?? '',
      operating_hours: loc.operating_hours ?? '',
      lat: lat ?? '', lng: lng ?? '',
      is_accessible: loc.is_accessible ?? false,
    });
    setShowForm(true); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name required'); return; }
    if (!form.category_id) { setError('Category required'); return; }
    if (editingId) updateMut.mutate({ id: editingId, f: form });
    else createMut.mutate(form);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  const filtered = locations?.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin size={22} className="text-primary" />
            Locations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Add / edit facility locations — new pins appear on the pilgrim map immediately
          </p>
        </div>
        <button className="btn btn-primary btn-sm gap-1.5" onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM); setError(null); }}>
          <Plus size={16} /> Add Location
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-3 text-gray-400" />
        <input className="input pl-8 w-full" placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-black/5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Location' : 'Add Location'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }} className="btn btn-ghost btn-sm"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Name (English) *</label>
                  <input className="input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Darshan Queue 1" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Name (Telugu)</label>
                  <input className="input w-full" value={form.name_te} onChange={e => setForm(f => ({ ...f, name_te: e.target.value }))} placeholder="తెలుగు పేరు" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Category *</label>
                  <div className="relative">
                    <select className="input w-full appearance-none pr-8" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                      <option value="">Select category...</option>
                      {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Sector</label>
                  <div className="relative">
                    <select className="input w-full appearance-none pr-8" value={form.sector_id} onChange={e => setForm(f => ({ ...f, sector_id: e.target.value, sub_sector_id: '' }))}>
                      <option value="">None</option>
                      {sectors?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Sub-Sector</label>
                  <div className="relative">
                    <select className="input w-full appearance-none pr-8" value={form.sub_sector_id} onChange={e => setForm(f => ({ ...f, sub_sector_id: e.target.value }))}>
                      <option value="">None</option>
                      {availableSubSectors.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Latitude</label>
                  <input type="number" step="any" className="input w-full" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value === '' ? '' : parseFloat(e.target.value) }))} placeholder="16.5148" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Longitude</label>
                  <input type="number" step="any" className="input w-full" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value === '' ? '' : parseFloat(e.target.value) }))} placeholder="80.6238" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Address</label>
                <input className="input w-full" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street / landmark" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Description</label>
                <textarea className="input w-full min-h-[60px] resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Contact Phone</label>
                  <input className="input w-full" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Operating Hours</label>
                  <input className="input w-full" value={form.operating_hours} onChange={e => setForm(f => ({ ...f, operating_hours: e.target.value }))} placeholder="e.g. 5am – 10pm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Status</label>
                  <div className="relative">
                    <select className="input w-full appearance-none pr-8" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {['ACTIVE','INACTIVE','TEMPORARY','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" id="accessible" checked={form.is_accessible} onChange={e => setForm(f => ({ ...f, is_accessible: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  <label htmlFor="accessible" className="text-sm font-semibold">Wheelchair Accessible</label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isSaving} className="btn btn-primary flex-1 gap-2">
                  {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {editingId ? 'Save Changes' : 'Add to Map'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setError(null); }} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400"><RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading locations...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">Sector</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Coords</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered?.map(loc => {
                const cat = loc.category as LocationCategory | null;
                const sec = loc.sector as Sector | null;
                const [lng, lat] = loc.position?.coordinates ?? [];
                return (
                  <tr key={loc.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">
                      {loc.name}
                      {loc.is_demo_data && <span className="text-blue-500 text-[10px] ml-1 bg-blue-50 px-1 rounded">DEMO</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize text-xs">{cat?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[130px]">
                      <div className="font-medium truncate">{sec?.name ?? '—'}</div>
                      {(loc.sub_sector as { name?: string } | null)?.name && (
                        <div className="text-[10px] text-gray-400 truncate">↳ {(loc.sub_sector as { name: string }).name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge border text-xs', STATUS_BADGE[loc.status] ?? 'bg-gray-100 text-gray-600 border-gray-200')}>
                        {loc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(loc)} className="btn btn-ghost btn-xs gap-1 text-gray-500 hover:text-primary"><Edit3 size={13} /> Edit</button>
                        <button onClick={() => { if (confirm(`Delete "${loc.name}"? This removes it from the pilgrim map.`)) deleteMut.mutate(loc.id); }} className="btn btn-ghost btn-xs text-gray-500 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">💡 New locations appear as map pins for pilgrims within seconds via realtime sync</p>
    </div>
  );
}
