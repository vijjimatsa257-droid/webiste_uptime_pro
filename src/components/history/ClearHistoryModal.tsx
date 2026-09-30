import React, { useState } from 'react';
import { Monitor, ClearHistoryOptions } from '../../types';
import { X, Trash2, AlertTriangle, Filter, Clock, Server, CheckCircle2 } from 'lucide-react';

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: (options: ClearHistoryOptions) => Promise<void>;
  monitors: Monitor[];
  totalLogCount: number;
  isDark: boolean;
}

export const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({
  isOpen,
  onClose,
  onConfirmClear,
  monitors,
  totalLogCount,
  isDark
}) => {
  const [scope, setScope] = useState<'all' | 'filtered'>('all');
  const [olderThan, setOlderThan] = useState<'all' | '24h' | '7d' | '30d' | '90d'>('all');
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down' | 'blocked'>('all');
  const [dataTypes, setDataTypes] = useState({
    checks: true,
    contentChanges: true,
    crawlerScans: true,
    anomalies: true,
    defacements: true,
    screenshots: true,
    mobileLogs: true
  });
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleClear = async () => {
    setDeleting(true);
    try {
      await onConfirmClear({
        scope,
        olderThan,
        monitorId: selectedMonitorId,
        statusFilter,
        dataTypes
      });
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
          isDark
            ? 'border-neutral-800 bg-neutral-900 text-neutral-100'
            : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Clear Check History & Logs
              </h2>
              <p className="text-xs text-neutral-500">
                Permanently purge telemetry records ({totalLogCount} total available)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Options */}
        <div className="py-4 space-y-4 text-xs">
          {/* Scope Selector */}
          <div>
            <label className="block font-medium text-neutral-400 mb-2">Scope of Deletion</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'all'
                    ? 'border-rose-500/60 bg-rose-500/10 text-rose-300 font-semibold'
                    : 'border-inherit hover:bg-neutral-800/40 text-neutral-400'
                }`}
              >
                <div className="font-bold text-sm">Clear All History</div>
                <div className="text-[11px] opacity-80 mt-0.5">Wipe entire audit trail across all monitors</div>
              </button>

              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'filtered'
                    ? 'border-rose-500/60 bg-rose-500/10 text-rose-300 font-semibold'
                    : 'border-inherit hover:bg-neutral-800/40 text-neutral-400'
                }`}
              >
                <div className="font-bold text-sm">Selective Cleanup</div>
                <div className="text-[11px] opacity-80 mt-0.5">Filter by age, monitor, or status</div>
              </button>
            </div>
          </div>

          {/* Granular Filters (Enabled when scope is 'filtered') */}
          {scope === 'filtered' && (
            <div
              className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {/* Age / Retention cutoff */}
              <div>
                <label className="flex items-center gap-1.5 font-medium text-neutral-400 mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Clear only older than:</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
                  {[
                    { id: '24h', label: '24 Hours' },
                    { id: '7d', label: '7 Days' },
                    { id: '30d', label: '30 Days' },
                    { id: '90d', label: '90 Days' },
                  ].map(tab => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setOlderThan(tab.id as typeof olderThan)}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                        olderThan === tab.id
                          ? 'border-rose-500/50 bg-rose-500/15 text-rose-400 font-bold'
                          : 'border-inherit text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monitor Filter */}
              <div>
                <label className="flex items-center gap-1.5 font-medium text-neutral-400 mb-1.5">
                  <Server className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Target Monitor:</span>
                </label>
                <select
                  value={selectedMonitorId}
                  onChange={e => setSelectedMonitorId(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-rose-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  <option value="all">All Monitors</option>
                  {monitors.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.url})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Code classification filter */}
              <div>
                <label className="flex items-center gap-1.5 font-medium text-neutral-400 mb-1.5">
                  <Filter className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Target Status:</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
                  {[
                    { id: 'all', label: 'All Statuses' },
                    { id: 'up', label: 'Only UP' },
                    { id: 'down', label: 'Only DOWN' },
                    { id: 'blocked', label: 'Only BLOCKED' },
                  ].map(st => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => setStatusFilter(st.id as typeof statusFilter)}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                        statusFilter === st.id
                          ? 'border-rose-500/50 bg-rose-500/15 text-rose-400 font-bold'
                          : 'border-inherit text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Data Types Checklist */}
          <div>
            <label className="block font-medium text-neutral-400 mb-2">Data Categories to Clear</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-inherit cursor-pointer hover:bg-neutral-800/20">
                <input
                  type="checkbox"
                  checked={dataTypes.checks}
                  onChange={e => setDataTypes({ ...dataTypes, checks: e.target.checked })}
                  className="rounded border-neutral-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="truncate">Health Checks & Probes</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-inherit cursor-pointer hover:bg-neutral-800/20">
                <input
                  type="checkbox"
                  checked={dataTypes.defacements}
                  onChange={e => setDataTypes({ ...dataTypes, defacements: e.target.checked })}
                  className="rounded border-neutral-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="truncate">Defacement Risk Logs</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-inherit cursor-pointer hover:bg-neutral-800/20">
                <input
                  type="checkbox"
                  checked={dataTypes.screenshots}
                  onChange={e => setDataTypes({ ...dataTypes, screenshots: e.target.checked })}
                  className="rounded border-neutral-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="truncate">Screenshot Comparison Diffs</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-inherit cursor-pointer hover:bg-neutral-800/20">
                <input
                  type="checkbox"
                  checked={dataTypes.mobileLogs}
                  onChange={e => setDataTypes({ ...dataTypes, mobileLogs: e.target.checked })}
                  className="rounded border-neutral-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="truncate">Mobile Alert Dispatches</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-inherit cursor-pointer hover:bg-neutral-800/20">
                <input
                  type="checkbox"
                  checked={dataTypes.anomalies}
                  onChange={e => setDataTypes({ ...dataTypes, anomalies: e.target.checked })}
                  className="rounded border-neutral-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="truncate">Latency Anomalies (3σ)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-inherit cursor-pointer hover:bg-neutral-800/20">
                <input
                  type="checkbox"
                  checked={dataTypes.contentChanges}
                  onChange={e => setDataTypes({ ...dataTypes, contentChanges: e.target.checked })}
                  className="rounded border-neutral-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="truncate">Content Change Snapshots</span>
              </label>
            </div>
          </div>

          {/* Explicit Warning Callout */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3 text-rose-400">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-rose-300 font-bold text-sm">
                Warning: This action cannot be undone.
              </strong>
              <span>
                Selected historical check logs and latency samples will be permanently purged from the database.
                An immediate 10-second undo safeguard will be available in case of mistake.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-inherit">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleting ? 'Deleting Records...' : 'Delete Selected Records'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
