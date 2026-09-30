'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Trash2, Edit3, MapPin, RefreshCw, X,
  CheckCircle2, AlertCircle, Globe
} from 'lucide-react';


const supabase = createClient();

/* ─── Types (Phase 2 simplified) ─────────────────────────── */
interface Sector {
  id: string;
  name: string;
  name_te: string;
  description: string | null;
  description_te: string | null;
  created_at: string;
  updated_at: string;
}

interface SectorForm {
  name: string;
  name_te: string;
  description: string;
  description_te: string;
}

const DEFAULT_FORM: SectorForm = {
  name: '',
  name_te: '',
  description: '',
  description_te: '',
};

/* ─── Sectors Client ─────────────────────────────────────── */
export default function SectorsClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SectorForm>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin_sectors_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_sectors'] });
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  /* ── Fetch ─────────────────────────────────────────────── */
  const { data: sectors, isLoading } = useQuery({
    queryKey: ['admin_sectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as Sector[];
    },
  });

  /* ── Create / Update ────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async (payload: SectorForm) => {
      const res = editingId
        ? await fetch('/api/admin/sectors', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetch('/api/admin/sectors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_sectors'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      closeForm();
    },
    onError: (e: Error) => setError(e.message),
  });

  /* ── Delete ─────────────────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/sectors?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_sectors'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      setDeleteConfirm(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  /* ── Form helpers ───────────────────────────────────────── */
  function openNew() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(s: Sector) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      name_te: s.name_te,
      description: s.description ?? '',
      description_te: s.description_te ?? '',
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
    if (!form.name.trim()) { setError('Sector Name (English) is required.'); return; }
    if (!form.name_te.trim()) { setError('Sector Name (Telugu) is required.'); return; }
    saveMutation.mutate(form);
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div>
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
            Sectors
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Manage temple zone sectors — changes sync live to pilgrims
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-success)' }}>
            <span className="inline-flex w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
            Live sync
          </span>
          <button onClick={openNew} className="btn btn-primary text-sm" id="add-sector-btn">
            <Plus size={16} />
            New Sector
          </button>
        </div>
      </div>

      {/* ── Error toast ──────────────────────────────────── */}
      {error && !showForm && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid #FECACA' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw size={22} className="animate-spin mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading sectors…</p>
          </div>
        ) : sectors && sectors.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name (English)</th>
                <th>Name (Telugu)</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {s.name}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-telugu)' }}>{s.name_te}</td>
                  <td className="text-sm max-w-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {s.description ?? '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                        title="Edit sector"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      {deleteConfirm === s.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(s.id)}
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
                          onClick={() => setDeleteConfirm(s.id)}
                          className="p-2 rounded-lg transition-colors hover:bg-red-50"
                          title="Delete sector"
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
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>No sectors yet</p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Add the first temple sector to get started.</p>
            <button onClick={openNew} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add Sector
            </button>
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
            style={{ background: 'var(--color-surface)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              <div className="flex items-center gap-2.5">
                <MapPin size={18} />
                <h2 className="text-base font-bold">{editingId ? 'Edit Sector' : 'New Sector'}</h2>
              </div>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {error && (
                <div className="px-3 py-2 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid #FECACA' }}>
                  <AlertCircle size={15} />{error}
                </div>
              )}

              {/* Sector Name */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Sector Name
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label">English *</label>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Indrakeeladri Hill"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Telugu *</label>
                    <input
                      className="input"
                      value={form.name_te}
                      onChange={(e) => setForm(f => ({ ...f, name_te: e.target.value }))}
                      placeholder="ఇంద్రకీలాద్రి కొండ"
                      style={{ fontFamily: 'var(--font-telugu)' }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sector Description */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Sector Description
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label">English</label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description of this sector…"
                    />
                  </div>
                  <div>
                    <label className="label">Telugu</label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      value={form.description_te}
                      onChange={(e) => setForm(f => ({ ...f, description_te: e.target.value }))}
                      placeholder="వివరణ…"
                      style={{ fontFamily: 'var(--font-telugu)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={closeForm} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                  ) : (
                    <><CheckCircle2 size={14} /> {editingId ? 'Save Changes' : 'Create Sector'}</>
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
