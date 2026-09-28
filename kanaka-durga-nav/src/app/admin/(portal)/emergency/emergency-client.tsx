'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, Plus, RefreshCw, CheckCircle2, Clock,
  User, MapPin, FileText, X, ChevronDown
} from 'lucide-react';

type IncidentStatus = 'OPEN' | 'RESPONDING' | 'RESOLVED' | 'CANCELLED';
type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type IncidentType = 'MEDICAL' | 'SECURITY' | 'FIRE' | 'CROWD_CRUSH' | 'MISSING_PERSON' | 'LOST_CHILD' | 'OTHER';

interface Incident {
  id: string;
  title: string;
  incident_type: IncidentType;
  description: string | null;
  location_text: string | null;
  status: IncidentStatus;
  priority: IncidentPriority;
  reported_by: string | null;
  assigned_to: string | null;
  response_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const PRIORITY_COLORS: Record<IncidentPriority, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH:     'bg-orange-100 text-orange-800 border-orange-300',
  MEDIUM:   'bg-amber-100 text-amber-800 border-amber-300',
  LOW:      'bg-gray-100 text-gray-600 border-gray-300',
};

const STATUS_COLORS: Record<IncidentStatus, string> = {
  OPEN:       'bg-red-100 text-red-700 border-red-200',
  RESPONDING: 'bg-blue-100 text-blue-700 border-blue-200',
  RESOLVED:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCELLED:  'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_FLOW: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN:       ['RESPONDING', 'RESOLVED', 'CANCELLED'],
  RESPONDING: ['RESOLVED', 'CANCELLED'],
  RESOLVED:   [],
  CANCELLED:  [],
};

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch('/api/admin/emergency');
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

async function createIncident(body: Partial<Incident>): Promise<Incident> {
  const res = await fetch('/api/admin/emergency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create incident');
  }
  return res.json();
}

async function updateIncident(body: Partial<Incident> & { id: string }): Promise<Incident> {
  const res = await fetch('/api/admin/emergency', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to update incident');
  }
  return res.json();
}

// ── Report Incident Form ──────────────────────────────────────────────────────

interface ReportFormProps { onClose: () => void; }

function ReportIncidentForm({ onClose }: ReportFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    incident_type: 'OTHER' as IncidentType,
    priority: 'MEDIUM' as IncidentPriority,
    location_text: '',
    description: '',
    reported_by: '',
    assigned_to: '',
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_emergency_incidents'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!form.title.trim()) { setError('Title is required'); return; }
    mutation.mutate(form);
  }

  const field = 'block text-xs font-semibold text-gray-600 mb-1';
  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <h2 className="font-bold text-base text-red-900">Report Emergency Incident</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className={field}>Title *</label>
            <input
              className={input}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Brief incident description"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={field}>Incident Type *</label>
              <select className={input} value={form.incident_type}
                onChange={e => setForm(f => ({ ...f, incident_type: e.target.value as IncidentType }))}>
                {(['MEDICAL','SECURITY','FIRE','CROWD_CRUSH','MISSING_PERSON','LOST_CHILD','OTHER'] as IncidentType[]).map(t => (
                  <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={field}>Priority</label>
              <select className={input} value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as IncidentPriority }))}>
                {(['LOW','MEDIUM','HIGH','CRITICAL'] as IncidentPriority[]).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={field}><MapPin size={11} className="inline mr-1" />Location</label>
            <input
              className={input}
              value={form.location_text}
              onChange={e => setForm(f => ({ ...f, location_text: e.target.value }))}
              placeholder="e.g. Sector A, near west gate"
            />
          </div>

          <div>
            <label className={field}><FileText size={11} className="inline mr-1" />Description</label>
            <textarea
              className={cn(input, 'resize-none h-20')}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Additional details"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={field}><User size={11} className="inline mr-1" />Reported By</label>
              <input
                className={input}
                value={form.reported_by}
                onChange={e => setForm(f => ({ ...f, reported_by: e.target.value }))}
                placeholder="Name / radio ID"
              />
            </div>
            <div>
              <label className={field}>Assigned To</label>
              <input
                className={input}
                value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                placeholder="Team / officer"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn btn-outline text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 btn btn-danger text-sm font-bold flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <><RefreshCw size={14} className="animate-spin" />Reporting…</> : 'Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Incident Row / Status update ──────────────────────────────────────────────

function IncidentRow({ incident }: { incident: Incident }) {
  const queryClient = useQueryClient();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(incident.response_notes ?? '');

  const updateMutation = useMutation({
    mutationFn: updateIncident,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_emergency_incidents'] }),
  });

  const nextStatuses = STATUS_FLOW[incident.status];
  const isTerminal = nextStatuses.length === 0;

  function advanceTo(status: IncidentStatus) {
    updateMutation.mutate({ id: incident.id, status, response_notes: notes || undefined });
  }

  function saveNotes() {
    updateMutation.mutate({ id: incident.id, response_notes: notes });
    setShowNotes(false);
  }

  return (
    <div className={cn(
      'border rounded-xl p-4 transition-all',
      incident.status === 'OPEN' ? 'border-red-200 bg-red-50/30' :
      incident.status === 'RESPONDING' ? 'border-blue-200 bg-blue-50/20' :
      'border-gray-200 bg-gray-50/20'
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('badge border text-xs font-bold', PRIORITY_COLORS[incident.priority])}>
              {incident.priority}
            </span>
            <span className={cn('badge border text-xs', STATUS_COLORS[incident.status])}>
              {incident.status}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 font-medium">
              {incident.incident_type.replace(/_/g, ' ')}
            </span>
          </div>

          <h3 className="font-bold text-sm text-gray-900">{incident.title}</h3>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
            {incident.location_text && (
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {incident.location_text}
              </span>
            )}
            {incident.reported_by && (
              <span className="flex items-center gap-1">
                <User size={10} /> {incident.reported_by}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} /> {new Date(incident.created_at).toLocaleString('en-IN', { hour12: true, dateStyle: 'short', timeStyle: 'short' })}
            </span>
            {incident.assigned_to && (
              <span className="font-medium text-blue-600">→ {incident.assigned_to}</span>
            )}
          </div>

          {incident.response_notes && !showNotes && (
            <p className="text-xs text-gray-600 mt-1.5 italic bg-white/70 rounded p-1.5 border border-gray-200">
              {incident.response_notes}
            </p>
          )}

          {showNotes && (
            <div className="mt-2 space-y-1">
              <textarea
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Response notes..."
              />
              <div className="flex gap-2">
                <button onClick={saveNotes} className="text-xs btn btn-sm btn-primary py-0.5">Save</button>
                <button onClick={() => setShowNotes(false)} className="text-xs text-gray-500 underline">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {!isTerminal && (
          <div className="shrink-0 flex flex-col gap-1">
            {nextStatuses.map(s => (
              <button
                key={s}
                onClick={() => advanceTo(s)}
                disabled={updateMutation.isPending}
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all',
                  s === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                  s === 'RESPONDING' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                  'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                )}
              >
                {s === 'RESOLVED' ? <><CheckCircle2 size={11} className="inline mr-0.5" />Resolve</> :
                 s === 'RESPONDING' ? 'Responding' : 'Cancel'}
              </button>
            ))}
            <button
              onClick={() => setShowNotes(v => !v)}
              className="text-xs text-gray-500 underline mt-0.5 flex items-center gap-0.5"
            >
              <FileText size={10} /> Notes <ChevronDown size={10} className={showNotes ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────────

export function EmergencyClient() {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { data: incidents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin_emergency_incidents'],
    queryFn: fetchIncidents,
    refetchInterval: 15_000, // auto-refresh every 15 seconds for emergency data
  });

  const filtered = statusFilter === 'active'
    ? incidents.filter(i => i.status === 'OPEN' || i.status === 'RESPONDING')
    : statusFilter === 'all'
    ? incidents
    : incidents.filter(i => i.status === statusFilter.toUpperCase());

  const openCount = incidents.filter(i => i.status === 'OPEN').length;
  const respondingCount = incidents.filter(i => i.status === 'RESPONDING').length;

  return (
    <div>
      {showForm && <ReportIncidentForm onClose={() => setShowForm(false)} />}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Emergency Incidents</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage emergency incidents on the ground</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-outline btn-sm flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-danger btn-sm flex items-center gap-1.5 text-xs font-bold"
          >
            <Plus size={14} />
            Report Incident
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {([
          { label: 'OPEN', count: openCount, color: 'bg-red-50 border-red-200 text-red-800' },
          { label: 'RESPONDING', count: respondingCount, color: 'bg-blue-50 border-blue-200 text-blue-800' },
          { label: 'Total Today', count: incidents.length, color: 'bg-gray-50 border-gray-200 text-gray-700' },
          { label: 'Resolved', count: incidents.filter(i => i.status === 'RESOLVED').length, color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
        ] as const).map(stat => (
          <div key={stat.label} className={cn('border rounded-xl p-3 text-center', stat.color)}>
            <div className="text-2xl font-black">{stat.count}</div>
            <div className="text-xs font-semibold mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { value: 'active', label: 'Active' },
          { value: 'OPEN', label: 'Open' },
          { value: 'RESPONDING', label: 'Responding' },
          { value: 'RESOLVED', label: 'Resolved' },
          { value: 'all', label: 'All' },
        ] as const).map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'text-xs font-semibold px-3 py-1 rounded-full border transition-all',
              statusFilter === tab.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="py-16 text-center text-gray-500 text-sm">Loading incidents…</div>
      )}

      {error && (
        <div className="py-8 text-center text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl">
          Failed to load incidents. Please refresh.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-16 text-center text-gray-500">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No {statusFilter !== 'all' ? statusFilter.toLowerCase() : ''} incidents</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(incident => (
          <IncidentRow key={incident.id} incident={incident} />
        ))}
      </div>
    </div>
  );
}
