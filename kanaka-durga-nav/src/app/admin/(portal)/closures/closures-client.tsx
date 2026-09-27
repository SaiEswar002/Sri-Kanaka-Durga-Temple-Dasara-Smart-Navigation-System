'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Trash2, Edit3, ShieldX, ChevronDown, RefreshCw, X,
  AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RouteClosure } from '@/types';

const supabase = createClient();

const CLOSURE_TYPE_OPTS = ['ALL', 'PEDESTRIAN', 'VEHICLE'];
const STATUS_OPTS = ['ACTIVE', 'SCHEDULED', 'RESOLVED', 'CANCELLED'];

interface ClosureForm {
  title: string;
  title_te: string;
  reason: string;
  closure_type: string;
  status: string;
  start_time: string;
  end_time: string;
}

const DEFAULT_FORM: ClosureForm = {
  title: '',
  title_te: '',
  reason: '',
  closure_type: 'ALL',
  status: 'ACTIVE',
  start_time: new Date().toISOString().slice(0, 16),
  end_time: '',
};

export default function AdminClosuresClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClosureForm>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data: closures, isLoading } = useQuery({
    queryKey: ['admin_closures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_closures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as RouteClosure[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel('admin_closures_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'route_closures' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_closures'] });
        queryClient.invalidateQueries({ queryKey: ['route_closures'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const createMut = useMutation({
    mutationFn: async (f: ClosureForm) => {
      const res = await fetch('/api/admin/closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          start_time: f.start_time ? new Date(f.start_time).toISOString() : new Date().toISOString(),
          end_time: f.end_time ? new Date(f.end_time).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_closures'] }); queryClient.invalidateQueries({ queryKey: ['route_closures'] }); setShowForm(false); setForm(DEFAULT_FORM); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...f }: ClosureForm & { id: string }) => {
      const res = await fetch('/api/admin/closures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, ...f,
          start_time: f.start_time ? new Date(f.start_time).toISOString() : new Date().toISOString(),
          end_time: f.end_time ? new Date(f.end_time).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_closures'] }); queryClient.invalidateQueries({ queryKey: ['route_closures'] }); setShowForm(false); setEditingId(null); setForm(DEFAULT_FORM); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/closures?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin_closures'] }); queryClient.invalidateQueries({ queryKey: ['route_closures'] }); },
  });

  const resolveQuick = (c: RouteClosure) => updateMut.mutate({ ...DEFAULT_FORM, id: c.id, title: c.title, title_te: c.title_te ?? '', reason: c.reason ?? '', closure_type: c.closure_type, status: 'RESOLVED', start_time: c.start_time, end_time: new Date().toISOString().slice(0, 16) });

  function openEdit(c: RouteClosure) {
    setEditingId(c.id);
    setForm({
      title: c.title, title_te: c.title_te ?? '', reason: c.reason ?? '',
      closure_type: c.closure_type, status: c.status,
      start_time: c.start_time ? new Date(c.start_time).toISOString().slice(0, 16) : '',
      end_time: c.end_time ? new Date(c.end_time).toISOString().slice(0, 16) : '',
    });
    setShowForm(true); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (editingId) updateMut.mutate({ ...form, id: editingId });
    else createMut.mutate(form);
  }

  const isSaving = createMut.isPending || updateMut.isPending;
  const activeCount = closures?.filter(c => c.status === 'ACTIVE').length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldX size={22} className="text-red-500" />
            Route Closures
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Active closures reroute pilgrims automatically — changes are live
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm gap-1.5"
          onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM); setError(null); }}
        >
          <Plus size={16} /> Add Closure
        </button>
      </div>

      {/* Active alert */}
      {activeCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700 flex items-center gap-2 font-medium">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          {activeCount} active closure{activeCount !== 1 ? 's' : ''} — pilgrims are being rerouted around these areas
          <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-black/5">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Closure' : 'Add Route Closure'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }} className="btn btn-ghost btn-sm"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} />{error}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Title (English) *</label>
                <input className="input w-full" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Ghat Road Closed for Procession" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Title (Telugu)</label>
                <input className="input w-full" value={form.title_te} onChange={e => setForm(f => ({ ...f, title_te: e.target.value }))} placeholder="తెలుగులో" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Reason</label>
                <input className="input w-full" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why is this path closed?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Closure Type</label>
                  <div className="relative">
                    <select className="input w-full appearance-none pr-8" value={form.closure_type} onChange={e => setForm(f => ({ ...f, closure_type: e.target.value }))}>
                      {CLOSURE_TYPE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Status</label>
                  <div className="relative">
                    <select className="input w-full appearance-none pr-8" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Start Time</label>
                  <input type="datetime-local" className="input w-full" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">End Time (optional)</label>
                  <input type="datetime-local" className="input w-full" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isSaving} className="btn btn-primary flex-1 gap-2">
                  {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {editingId ? 'Save Changes' : 'Create Closure'}
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
          <div className="p-8 text-center text-gray-400"><RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading...</div>
        ) : !closures?.length ? (
          <div className="p-8 text-center text-gray-400"><ShieldX size={28} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No closures. Add one to reroute pilgrims.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Start</th>
                <th className="text-left px-4 py-3 font-semibold">End</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {closures.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">
                    {c.title}
                    {c.is_demo_data && <span className="text-blue-500 text-[10px] font-bold ml-1 bg-blue-50 px-1.5 py-0.5 rounded">DEMO</span>}
                    {c.reason && <div className="text-xs text-gray-400 truncate">{c.reason}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.closure_type}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge border text-xs',
                      c.status === 'ACTIVE' ? 'bg-red-100 text-red-700 border-red-200' :
                      c.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    )}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <div className="flex items-center gap-1"><Clock size={11} />{new Date(c.start_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.end_time ? new Date(c.end_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : <span className="text-gray-300">Open-ended</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.status === 'ACTIVE' && (
                        <button onClick={() => resolveQuick(c)} className="btn btn-ghost btn-xs gap-1 text-emerald-600 hover:bg-emerald-50" title="Mark resolved">
                          <CheckCircle2 size={13} /> Resolve
                        </button>
                      )}
                      <button onClick={() => openEdit(c)} className="btn btn-ghost btn-xs gap-1 text-gray-500 hover:text-primary"><Edit3 size={13} /></button>
                      <button onClick={() => { if (confirm(`Delete "${c.title}"?`)) deleteMut.mutate(c.id); }} className="btn btn-ghost btn-xs text-gray-500 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
