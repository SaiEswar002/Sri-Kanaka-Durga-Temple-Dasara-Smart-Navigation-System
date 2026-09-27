'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Trash2, Edit3, MessageSquare, ChevronDown, RefreshCw, X,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DarshanQueue } from '@/types';

const supabase = createClient();

interface QueueForm {
  name: string;
  name_te: string;
  queue_type: string;
  status: string;
  current_count: number;
  max_capacity: number | '';
  estimated_wait_minutes: number | '';
  notes: string;
}

const DEFAULT_FORM: QueueForm = {
  name: '', name_te: '', queue_type: 'GENERAL', status: 'OPEN',
  current_count: 0, max_capacity: '', estimated_wait_minutes: '', notes: '',
};

export default function AdminQueuesClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [locId, setLocId] = useState('');
  const [form, setForm] = useState<QueueForm>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data: queues, isLoading } = useQuery({
    queryKey: ['admin_queues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('darshan_queues')
        .select('*, location:locations(id, name)')
        .order('created_at');
      if (error) throw error;
      return data as (DarshanQueue & { location?: { id: string; name: string } | null })[];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations_for_queue'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('id, name').order('name');
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel('admin_queues_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'darshan_queues' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_queues'] });
        queryClient.invalidateQueries({ queryKey: ['darshan_queues'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!locId) throw new Error('Select a location');
      const res = await fetch('/api/admin/queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, location_id: locId,
          max_capacity: form.max_capacity === '' ? null : Number(form.max_capacity),
          estimated_wait_minutes: form.estimated_wait_minutes === '' ? null : Number(form.estimated_wait_minutes),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_queues'] }); queryClient.invalidateQueries({ queryKey: ['darshan_queues'] }); setShowForm(false); setForm(DEFAULT_FORM); setLocId(''); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/admin/queues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, ...form,
          max_capacity: form.max_capacity === '' ? null : Number(form.max_capacity),
          estimated_wait_minutes: form.estimated_wait_minutes === '' ? null : Number(form.estimated_wait_minutes),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_queues'] }); queryClient.invalidateQueries({ queryKey: ['darshan_queues'] }); setShowForm(false); setEditingId(null); setForm(DEFAULT_FORM); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/queues?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_queues'] }); queryClient.invalidateQueries({ queryKey: ['darshan_queues'] }); },
  });

  // Quick count update (inline)
  const quickCount = useMutation({
    mutationFn: async ({ id, current_count, estimated_wait_minutes }: { id: string; current_count: number; estimated_wait_minutes: number | null }) => {
      const res = await fetch('/api/admin/queues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, current_count, estimated_wait_minutes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_queues'] }); queryClient.invalidateQueries({ queryKey: ['darshan_queues'] }); },
  });

  function openEdit(q: DarshanQueue) {
    setEditingId(q.id);
    setLocId(q.location_id);
    setForm({
      name: q.name, name_te: q.name_te ?? '',
      queue_type: q.queue_type, status: q.status,
      current_count: q.current_count,
      max_capacity: q.max_capacity ?? '',
      estimated_wait_minutes: q.estimated_wait_minutes ?? '',
      notes: q.notes ?? '',
    });
    setShowForm(true); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name required'); return; }
    if (editingId) updateMut.mutate(editingId);
    else createMut.mutate();
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare size={22} className="text-primary" />
            Darshan Queues
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage queue counts and wait times — pilgrims see live updates</p>
        </div>
        <button className="btn btn-primary btn-sm gap-1.5" onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM); setLocId(''); setError(null); }}>
          <Plus size={16} /> Add Queue
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-black/5">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Queue' : 'Add Queue'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }} className="btn btn-ghost btn-sm"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Location</label>
                <div className="relative">
                  <select className="input w-full appearance-none pr-8" value={locId} onChange={e => setLocId(e.target.value)} required>
                    <option value="">Select location...</option>
                    {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Queue Name *</label>
                  <input className="input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Queue 1 — General" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Name (Telugu)</label>
                  <input className="input w-full" value={form.name_te} onChange={e => setForm(f => ({ ...f, name_te: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Type</label>
                  <div className="relative">
                    <select className="input w-full appearance-none pr-8" value={form.queue_type} onChange={e => setForm(f => ({ ...f, queue_type: e.target.value }))}>
                      {['GENERAL','SPECIAL','VIP','DIVYANG','SEVAS'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Status</label>
                  <div className="relative">
                    <select className="input w-full appearance-none pr-8" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {['OPEN','CLOSED','SUSPENDED','FULL'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Count</label>
                  <input type="number" min={0} className="input w-full" value={form.current_count} onChange={e => setForm(f => ({ ...f, current_count: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Max Capacity</label>
                  <input type="number" min={0} className="input w-full" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Wait (min)</label>
                  <input type="number" min={0} className="input w-full" value={form.estimated_wait_minutes} onChange={e => setForm(f => ({ ...f, estimated_wait_minutes: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isSaving} className="btn btn-primary flex-1 gap-2">
                  {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {editingId ? 'Save' : 'Create Queue'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setError(null); }} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table with inline count editing */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400"><RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading...</div>
        ) : !queues?.length ? (
          <div className="p-8 text-center text-gray-400"><MessageSquare size={28} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No queues configured yet.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Queue Name</th>
                <th className="text-left px-4 py-3 font-semibold">Location</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Count</th>
                <th className="text-left px-4 py-3 font-semibold">Wait</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {queues.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium">{q.name}{q.is_demo_data && <span className="text-blue-500 text-[10px] ml-1 bg-blue-50 px-1 rounded">DEMO</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[120px]">{(q.location as unknown as { name: string } | null)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{q.queue_type}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge border text-xs',
                      q.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      q.status === 'FULL' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    )}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        defaultValue={q.current_count}
                        className="input py-1 px-2 w-20 text-sm"
                        onBlur={e => {
                          const newCount = Number(e.target.value);
                          if (newCount !== q.current_count) {
                            quickCount.mutate({ id: q.id, current_count: newCount, estimated_wait_minutes: q.estimated_wait_minutes });
                          }
                        }}
                        title="Click to edit count — saves on blur"
                      />
                      {q.max_capacity && <span className="text-gray-400 text-xs">/ {q.max_capacity}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.estimated_wait_minutes != null ? `${q.estimated_wait_minutes} min` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(q)} className="btn btn-ghost btn-xs gap-1 text-gray-500 hover:text-primary"><Edit3 size={13} /></button>
                      <button onClick={() => { if (confirm(`Delete "${q.name}"?`)) deleteMut.mutate(q.id); }} className="btn btn-ghost btn-xs text-gray-500 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">💡 Click on the count field and change value — it auto-saves when you click away</p>
    </div>
  );
}
