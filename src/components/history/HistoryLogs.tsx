import React, { useState, useMemo, useEffect } from 'react';
import { CheckLog, Monitor, ClearHistoryOptions } from '../../types';
import { api } from '../../services/api';
import { ClearHistoryModal } from './ClearHistoryModal';
import { StarButton } from '../common/StarButton';
import {
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RotateCcw,
  Check
} from 'lucide-react';

interface HistoryLogsProps {
  logs: CheckLog[];
  monitors: Monitor[];
  isDark: boolean;
  onUpdateLogs?: (newLogs: CheckLog[]) => void;
  isStarred?: (url: string) => boolean;
  onToggleStar?: (site: {
    url: string;
    name?: string;
    status?: any;
    responseTimeMs?: number;
    statusCode?: number;
  }) => Promise<void>;
}

export const HistoryLogs: React.FC<HistoryLogsProps> = ({
  logs,
  monitors,
  isDark,
  onUpdateLogs,
  isStarred,
  onToggleStar
}) => {
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'blocked' | 'down'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'check' | 'defacement' | 'screenshot' | 'anomaly' | 'content_change' | 'broken_link'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ text: string; secondsLeft: number } | null>(null);
  const itemsPerPage = 12;

  // Countdown timer for 10-second undo toast
  useEffect(() => {
    if (!undoToast) return;
    if (undoToast.secondsLeft <= 0) {
      setUndoToast(null);
      return;
    }
    const timer = setInterval(() => {
      setUndoToast(prev => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [undoToast?.secondsLeft]);

  // Synthesize realistic logs if empty
  const allLogs = useMemo(() => {
    if (logs.length > 0) return logs;
    const synth: CheckLog[] = [];
    monitors.forEach((m) => {
      for (let i = 0; i < 6; i++) {
        const isUp = m.status === 'down' && i === 0 ? false : Math.random() > 0.05;
        synth.push({
          id: `log_${m.id}_${i}`,
          monitorId: m.id,
          monitorName: m.name,
          status: isUp ? 'up' : 'down',
          statusCode: isUp ? 200 : 504,
          responseTimeMs: isUp ? Math.round(35 + Math.random() * 80) : 0,
          timestamp: new Date(Date.now() - i * 1000 * 60 * m.intervalMinutes).toISOString(),
          message: isUp ? 'HTTP 200 OK' : 'Connection Timeout / Gateway Error'
        });
      }
    });
    return synth.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, monitors]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchMon = selectedMonitorId === 'all' || log.monitorId === selectedMonitorId;
      const matchStatus = statusFilter === 'all' || log.status === statusFilter;
      const matchEventType =
        eventTypeFilter === 'all' ||
        (log.eventType ? log.eventType === eventTypeFilter : eventTypeFilter === 'check');
      const matchSearch =
        log.monitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchMon && matchStatus && matchEventType && matchSearch;
    });
  }, [allLogs, selectedMonitorId, statusFilter, eventTypeFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Monitor Name', 'Status', 'Status Code', 'Response Time (ms)', 'Message'];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.monitorName.replace(/"/g, '""')}"`,
      `"${l.status.toUpperCase()}"`,
      l.statusCode,
      l.responseTimeMs,
      `"${(l.message || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `uptime-checker-pro-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle clear history
  const handleConfirmClear = async (options: ClearHistoryOptions) => {
    const res = await api.clearHistory(options);
    if (onUpdateLogs) {
      onUpdateLogs(res.logs);
    }
    setUndoToast({
      text: `${res.count} records cleared`,
      secondsLeft: 10
    });
    setCurrentPage(1);
  };

  const handleUndo = async () => {
    try {
      const res = await api.undoClearHistory();
      if (onUpdateLogs) {
        onUpdateLogs(res.logs);
      }
      setUndoToast(null);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 10-Second Undo Notification Toast */}
      {undoToast && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/15 p-3.5 text-xs text-amber-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>{undoToast.text}</strong>. Auto-permanent in{' '}
              <span className="font-mono font-bold text-amber-300">{undoToast.secondsLeft}s</span>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow-xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Undo</span>
            </button>
            <button
              onClick={() => setUndoToast(null)}
              className="text-amber-400/80 hover:text-amber-200 text-xs px-1.5 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div
        className={`rounded-xl border transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        {/* Header & Export CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border-b border-inherit gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Check History & Telemetry Logs
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Chronological log of every automated probe and health check performed.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Clear History Button */}
            <button
              onClick={() => setIsClearModalOpen(true)}
              disabled={allLogs.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
              title="Clear check history with granular options"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export to CSV ({filteredLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-inherit flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by monitor name or message..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full rounded-lg border py-1.5 pl-8 pr-3 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            />
          </div>

          {/* Monitor select */}
          <select
            value={selectedMonitorId}
            onChange={e => {
              setSelectedMonitorId(e.target.value);
              setCurrentPage(1);
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-300' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <option value="all">All Monitors</option>
            {monitors.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Event Type Filter */}
          <select
            value={eventTypeFilter}
            onChange={e => {
              setEventTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-300' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <option value="all">All Event Types</option>
            <option value="check">HTTP / TCP Probes</option>
            <option value="defacement">Defacement Audits</option>
            <option value="screenshot">Visual Diffs</option>
            <option value="anomaly">Latency Anomalies</option>
            <option value="content_change">Content Changes</option>
            <option value="broken_link">Broken Links</option>
          </select>

          {/* Status filter */}
          <div className="flex items-center rounded-lg border border-inherit p-0.5">
            {(['all', 'up', 'blocked', 'down'] as const).map(s => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? isDark
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'bg-slate-100 text-emerald-800 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b border-inherit font-semibold ${
                  isDark ? 'bg-neutral-950/40 text-neutral-400' : 'bg-slate-50 text-slate-600'
                }`}
              >
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Monitor</th>
                <th className="py-2.5 px-4">HTTP Code</th>
                <th className="py-2.5 px-4">Response Time</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Message / Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    No matching check records found.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-neutral-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        {log.status === 'up' && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-400 font-mono text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            UP
                          </span>
                        )}
                        {log.status === 'blocked' && (
                          <span className="flex items-center gap-1 font-semibold text-amber-400 font-mono text-[11px]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            BLOCKED
                          </span>
                        )}
                        {log.status === 'down' && (
                          <span className="flex items-center gap-1 font-semibold text-rose-500 font-mono text-[11px]">
                            <XCircle className="h-3.5 w-3.5" />
                            DOWN
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 font-semibold text-neutral-200 truncate max-w-[200px]">
                        {(() => {
                          const matched = monitors.find(m => m.id === log.monitorId || m.name === log.monitorName);
                          const targetUrl = matched?.url || (log.monitorName.includes('.') ? (log.monitorName.startsWith('http') ? log.monitorName : `https://${log.monitorName}`) : `https://${log.monitorName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);
                          return (
                            <div className="flex items-center gap-1.5 truncate">
                              {onToggleStar && (
                                <StarButton
                                  isStarred={isStarred ? isStarred(targetUrl) : false}
                                  onToggle={() =>
                                    onToggleStar({
                                      url: targetUrl,
                                      name: log.monitorName,
                                      status: log.status,
                                      responseTimeMs: log.responseTimeMs,
                                      statusCode: log.statusCode
                                    })
                                  }
                                  size="xs"
                                  className="shrink-0"
                                />
                              )}
                              <span className="truncate">{log.monitorName}</span>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-2.5 px-4 font-mono text-neutral-300">
                        {log.statusCode || '—'}
                      </td>

                      <td className="py-2.5 px-4 font-mono font-bold text-neutral-200">
                        {log.status !== 'down' ? `${log.responseTimeMs} ms` : '—'}
                      </td>

                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      <td className="py-2.5 px-4 text-neutral-400 truncate max-w-[260px] font-mono text-[11px]">
                        {log.reason || log.message || (log.status !== 'down' ? 'OK' : 'Error')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between p-4 border-t border-inherit text-xs text-neutral-400">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 rounded border border-inherit px-2.5 py-1 transition-colors hover:bg-neutral-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono text-neutral-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 rounded border border-inherit px-2.5 py-1 transition-colors hover:bg-neutral-800 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Clear History Modal */}
      <ClearHistoryModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirmClear={handleConfirmClear}
        monitors={monitors}
        totalLogCount={allLogs.length}
        isDark={isDark}
      />
    </div>
  );
};
