'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Trash2, Edit3, Megaphone, CheckCircle2, XCircle,
  AlertCircle, Info, Bell, ChevronDown, RefreshCw, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Announcement, AnnouncementPriority } from '@/types';
import { useEffect } from 'react';

const supabase = createClient();

const PRIORITY_CONFIG: Record<AnnouncementPriority, { label: string; badge: string; icon: React.ElementType }> = {
  URGENT:  { label: 'Urgent',  badge: 'bg-red-100 text-red-700 border-red-300',    icon: AlertCircle },
  WARNING: { label: 'Warning', badge: 'bg-amber-100 text-amber-700 border-amber-300', icon: Bell },
  NOTICE:  { label: 'Notice',  badge: 'bg-blue-100 text-blue-700 border-blue-300',   icon: Info },
  INFO:    { label: 'Info',    badge: 'bg-gray-100 text-gray-600 border-gray-300',   icon: Info },
};

interface AnnForm {
  title: string;
  title_te: string;
  message: string;
  priority: AnnouncementPriority;
  status: 'ACTIVE' | 'DRAFT' | 'EXPIRED';
  starts_at: string;
  expires_at: string;
}

const DEFAULT_FORM: AnnForm = {
  title: '',
  title_te: '',
  message: '',
  priority: 'INFO',
  status: 'ACTIVE',
  starts_at: new Date().toISOString().slice(0, 16),
  expires_at: '',
};

export default function AdminAnnouncementsClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnForm>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all announcements (admin sees all statuses) ──────────
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin_announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Announcement[];
    },
  });

  // ── Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin_announcements_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_announcements'] });
        queryClient.invalidateQueries({ queryKey: ['announcements'] }); // also refresh pilgrim side
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ── Create ─────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (f: AnnForm) => {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : new Date().toISOString(),
          expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  // ── Update ─────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...f }: AnnForm & { id: string }) => {
      const res = await fetch('/api/admin/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, ...f,
          starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : new Date().toISOString(),
          expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowForm(false);
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  // ── Delete ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  // ── Quick status toggle ────────────────────────────────────────
  const toggleStatus = (ann: Announcement) => {
    const newStatus = ann.status === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE';
    updateMutation.mutate({ ...form, id: ann.id, status: newStatus } as AnnForm & { id: string });
  };

  function openEdit(ann: Announcement) {
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      title_te: ann.title_te ?? '',
      message: ann.message ?? '',
      priority: ann.priority,
      status: ann.status as AnnForm['status'],
      starts_at: ann.starts_at ? new Date(ann.starts_at).toISOString().slice(0, 16) : '',
      expires_at: ann.expires_at ? new Date(ann.expires_at).toISOString().slice(0, 16) : '',
    });
    setShowForm(true);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (editingId) {
      updateMutation.mutate({ ...form, id: editingId });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone size={22} className="text-primary" />
            Announcements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create bilingual announcements — changes appear live to all pilgrims instantly
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm gap-1.5"
          onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM); setError(null); }}
        >
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      {/* Live count badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">
          {announcements?.filter(a => a.status === 'ACTIVE').length ?? 0} active
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">
          {announcements?.length ?? 0} total
        </span>
        <div className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Live sync — pilgrims see changes instantly
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-black/5">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">
                {editingId ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }} className="btn btn-ghost btn-sm">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1.5">Title (English) *</label>
                <input
                  className="input w-full"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. VIP queue open at Gate 2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Title (Telugu)</label>
                <input
                  className="input w-full"
                  value={form.title_te}
                  onChange={e => setForm(f => ({ ...f, title_te: e.target.value }))}
                  placeholder="తెలుగులో శీర్షిక"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Message / Details</label>
                <textarea
                  className="input w-full min-h-[80px] resize-none"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Priority</label>
                  <div className="relative">
                    <select
                      className="input w-full appearance-none pr-8"
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value as AnnouncementPriority }))}
                    >
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Status</label>
                  <div className="relative">
                    <select
                      className="input w-full appearance-none pr-8"
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as AnnForm['status'] }))}
                    >
                      <option value="ACTIVE">Active (visible)</option>
                      <option value="DRAFT">Draft (hidden)</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Starts At</label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={form.starts_at}
                    onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Expires At (optional)</label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary flex-1 gap-2"
                >
                  {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {editingId ? 'Save Changes' : 'Publish Announcement'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
                  className="btn btn-outline"
                >
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
          <div className="p-8 text-center text-gray-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Loading announcements...
          </div>
        ) : !announcements?.length ? (
          <div className="p-8 text-center text-gray-400">
            <Megaphone size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No announcements yet. Create the first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">Priority</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Starts</th>
                <th className="text-left px-4 py-3 font-semibold">Expires</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {announcements.map((ann) => {
                const cfg = PRIORITY_CONFIG[ann.priority];
                const Icon = cfg.icon;
                return (
                  <tr key={ann.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3">
                      <div className="font-medium max-w-xs truncate flex items-center gap-1.5">
                        <Icon size={14} className="text-gray-400 shrink-0" />
                        {ann.title}
                        {ann.is_demo_data && (
                          <span className="text-blue-500 text-[10px] font-bold uppercase ml-1 bg-blue-50 px-1.5 py-0.5 rounded">DEMO</span>
                        )}
                      </div>
                      {ann.title_te && ann.title_te !== ann.title && (
                        <div className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{ann.title_te}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge border text-xs', cfg.badge)}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(ann)}
                        className={cn(
                          'badge border text-xs cursor-pointer hover:opacity-80 transition-opacity',
                          ann.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : ann.status === 'DRAFT'
                            ? 'bg-gray-100 text-gray-500 border-gray-200'
                            : 'bg-red-50 text-red-500 border-red-200'
                        )}
                        title="Click to toggle Active/Expired"
                      >
                        {ann.status === 'ACTIVE' ? <CheckCircle2 size={11} className="inline mr-0.5" /> : <XCircle size={11} className="inline mr-0.5" />}
                        {ann.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(ann.starts_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {ann.expires_at
                        ? new Date(ann.expires_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(ann)}
                          className="btn btn-ghost btn-xs gap-1 text-gray-500 hover:text-primary"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${ann.title}"?`)) deleteMutation.mutate(ann.id);
                          }}
                          className="btn btn-ghost btn-xs gap-1 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
