import React, { useState, useMemo } from 'react';
import { DefacementRecord, Monitor, DefacementRiskScore } from '../../types';
import { api } from '../../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Code2,
  Clock,
  Layers,
  ArrowRight,
  FileCheck,
  Trash2,
  Lock,
  Eye,
  X,
  FileCode,
  Flame
} from 'lucide-react';

interface DefacementDetectionViewProps {
  monitors: Monitor[];
  records: DefacementRecord[];
  isDark: boolean;
  onRefreshRecords: () => void;
  onUpdateRecord: (record: DefacementRecord) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateMonitor?: (monitor: Monitor) => void;
}

export const DefacementDetectionView: React.FC<DefacementDetectionViewProps> = ({
  monitors,
  records,
  isDark,
  onRefreshRecords,
  onUpdateRecord,
  onDeleteRecord,
  onUpdateMonitor
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [targetMonitorId, setTargetMonitorId] = useState<string>(monitors[0]?.id || '');
  const [customUrl, setCustomUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [evidenceModalRecord, setEvidenceModalRecord] = useState<DefacementRecord | null>(null);

  const monitoredWithDefacement = useMemo(() => {
    return monitors.filter(m => m.defacementConfig?.enabled ?? true);
  }, [monitors]);

  const criticalHighCount = useMemo(() => {
    return records.filter(r => (r.riskScore === 'critical' || r.riskScore === 'high') && r.status === 'active').length;
  }, [records]);

  const cleanRecordsCount = useMemo(() => {
    return records.filter(r => r.riskScore === 'low' || r.status === 'resolved').length;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedRisk !== 'all' && r.riskScore !== selectedRisk) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.monitorName.toLowerCase().includes(q);
        const matchesUrl = r.url.toLowerCase().includes(q);
        const matchesReason = r.reasons.some(reason => reason.toLowerCase().includes(q));
        if (!matchesName && !matchesUrl && !matchesReason) return false;
      }
      return true;
    });
  }, [records, selectedRisk, searchQuery]);

  const handleRunScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setChecking(true);
    try {
      let targetUrl = customUrl.trim();
      let mId = targetMonitorId;
      if (!targetUrl && mId) {
        const m = monitors.find(x => x.id === mId);
        if (m) targetUrl = m.url;
      }
      if (!targetUrl && !mId) return;

      const newRec = await api.runDefacementCheck({
        monitorId: mId || undefined,
        url: targetUrl || undefined
      });
      onUpdateRecord(newRec);
      setActionSuccess(`Defacement analysis completed for ${newRec.monitorName}. Risk: ${newRec.riskScore.toUpperCase()}`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch {
      setActionSuccess('Defacement check probe encountered an error.');
      setTimeout(() => setActionSuccess(null), 4000);
    } finally {
      setChecking(false);
    }
  };

  const handleSetBaseline = async (record: DefacementRecord) => {
    if (!record.monitorId) return;
    try {
      await api.setDefacementBaseline(record.monitorId);
      onRefreshRecords();
      setActionSuccess(`Current page content and scripts saved as trusted baseline for ${record.monitorName}`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      // ignore
    }
  };

  const handleMarkExpected = async (recordId: string) => {
    try {
      const updatedList = await api.markDefacementExpected(recordId);
      const updated = updatedList.find(r => r.id === recordId);
      if (updated) onUpdateRecord(updated);
      setActionSuccess('Content alteration marked as expected authorized update.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      // ignore
    }
  };

  const getRiskBadge = (score: DefacementRiskScore) => {
    switch (score) {
      case 'critical':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
            <Flame className="h-3.5 w-3.5" />
            CRITICAL RISK
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
            <AlertTriangle className="h-3.5 w-3.5" />
            HIGH RISK
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="h-3.5 w-3.5" />
            MEDIUM WARNING
          </span>
        );
      case 'low':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <ShieldCheck className="h-3.5 w-3.5" />
            INTEGRITY VERIFIED
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast banner */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3.5 text-xs text-emerald-300 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                Website Defacement Detection
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  REAL-TIME SHIELD
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Compares live DOM hashes, titles, external scripts, and content against verified baselines to detect unauthorized alterations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefreshRecords()}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
            <span>Refresh Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Protected Endpoints</span>
            <Lock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {monitoredWithDefacement.length}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">
            {monitors.length} total monitors configured
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Critical / High Incidents</span>
            <ShieldAlert className={`h-4 w-4 ${criticalHighCount > 0 ? 'text-rose-500' : 'text-neutral-400'}`} />
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-bold tracking-tight ${
              criticalHighCount > 0 ? 'text-rose-500' : 'text-emerald-500'
            }`}
          >
            {criticalHighCount}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">
            {criticalHighCount > 0 ? 'Urgent incidents triggered' : 'Zero defacement detected'}
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Verified Clean Checks</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {cleanRecordsCount}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">Baselines & verified revisions</div>
        </div>
      </div>

      {/* Manual Check Form */}
      <div
        className={`rounded-xl border p-4 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
          <FileCode className="h-3.5 w-3.5" />
          <span>Run On-Demand Defacement Scan</span>
        </div>

        <form onSubmit={handleRunScan} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <select
              value={targetMonitorId}
              onChange={(e) => {
                setTargetMonitorId(e.target.value);
                setCustomUrl('');
              }}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium focus:outline-none ${
                isDark
                  ? 'border-neutral-800 bg-neutral-950 text-neutral-200 focus:border-rose-500'
                  : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-rose-500'
              }`}
            >
              {monitors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.url})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <input
              type="text"
              placeholder="Or enter custom URL to scan..."
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                setTargetMonitorId('');
              }}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none ${
                isDark
                  ? 'border-neutral-800 bg-neutral-950 text-neutral-200 focus:border-rose-500'
                  : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-rose-500'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={checking || (!targetMonitorId && !customUrl.trim())}
            className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Analyzing DOM...' : 'Scan For Defacement'}</span>
          </button>
        </form>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search defacement logs, reasons, hosts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-lg border pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 text-neutral-200 focus:border-rose-500'
                : 'border-slate-300 bg-white text-slate-800 focus:border-rose-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => setSelectedRisk(risk)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                selectedRisk === risk
                  ? 'bg-rose-500 text-white font-semibold shadow-xs'
                  : isDark
                  ? 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div
            className={`rounded-xl border p-12 text-center transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
            }`}
          >
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500/70 mb-3" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              No Defacement Incidents Detected
            </h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
              All monitored pages match their verified baselines. When malicious defacement keywords, script injections, or massive content substitutions occur, they will appear here.
            </p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const isHighOrCritical = record.riskScore === 'critical' || record.riskScore === 'high';

            return (
              <div
                key={record.id}
                className={`rounded-xl border p-5 transition-all ${
                  isHighOrCritical
                    ? isDark
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : 'border-rose-300 bg-rose-50/50'
                    : isDark
                    ? 'border-neutral-800 bg-neutral-900/90'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {record.monitorName}
                      </span>
                      {getRiskBadge(record.riskScore)}
                      {record.status === 'resolved' && (
                        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                          Marked Expected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={record.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-neutral-500 hover:text-rose-400 flex items-center gap-1"
                      >
                        <span>{record.url}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-neutral-600 dark:text-neutral-400">·</span>
                      <span className="text-xs font-mono text-neutral-500">
                        {new Date(record.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Top Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setEvidenceModalRecord(record)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-neutral-400" />
                      <span>View Evidence</span>
                    </button>

                    <button
                      onClick={() => handleSetBaseline(record)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      title="Update baseline to current page structure and authorize updates"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>Set As Baseline</span>
                    </button>

                    {record.status !== 'resolved' && (
                      <button
                        onClick={() => handleMarkExpected(record.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/60 text-xs font-medium text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Mark Expected</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteRecord(record.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reasons List */}
                <div className="mt-4 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    Flagged Anomalies & Evidence:
                  </div>
                  <ul className="space-y-1 text-xs">
                    {record.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-neutral-300">
                        <span className="text-rose-500 mt-0.5">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Key metadata grid */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="rounded-lg bg-neutral-950/40 p-2.5 border border-inherit">
                    <div className="text-neutral-500 text-[10px] uppercase">Title Delta</div>
                    <div className="text-neutral-200 truncate mt-0.5" title={record.currentTitle}>
                      {record.currentTitle !== record.baselineTitle ? (
                        <span className="text-rose-400">Replaced Title</span>
                      ) : (
                        <span className="text-emerald-400">Title Matched</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-neutral-950/40 p-2.5 border border-inherit">
                    <div className="text-neutral-500 text-[10px] uppercase">Injected Scripts</div>
                    <div className="text-neutral-200 mt-0.5">
                      {record.injectedScripts.length > 0 ? (
                        <span className="text-rose-400 font-bold">{record.injectedScripts.length} new external</span>
                      ) : (
                        <span className="text-emerald-400">0 unverified</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-neutral-950/40 p-2.5 border border-inherit">
                    <div className="text-neutral-500 text-[10px] uppercase">Content Delta</div>
                    <div className="text-neutral-200 mt-0.5">
                      <span className={record.contentChangePercent > 20 ? 'text-rose-400 font-bold' : 'text-neutral-300'}>
                        {record.contentChangePercent}% modified
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-neutral-950/40 p-2.5 border border-inherit">
                    <div className="text-neutral-500 text-[10px] uppercase">Payload Size</div>
                    <div className="text-neutral-200 mt-0.5">
                      <span className={record.sizeChangePercent < -30 ? 'text-amber-400 font-bold' : 'text-neutral-300'}>
                        {record.sizeChangePercent > 0 ? `+${record.sizeChangePercent}%` : `${record.sizeChangePercent}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Evidence Diff Modal */}
      {evidenceModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-5 ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-4 border-inherit">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                <h3 className="text-base font-bold">Defacement Forensic Evidence & Diff</h3>
              </div>
              <button
                onClick={() => setEvidenceModalRecord(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Information */}
            <div className="text-xs space-y-1">
              <div>
                <strong>Monitor:</strong> {evidenceModalRecord.monitorName} ({evidenceModalRecord.url})
              </div>
              <div>
                <strong>Risk Score:</strong> {evidenceModalRecord.riskScore.toUpperCase()}
              </div>
              <div>
                <strong>Audit Timestamp:</strong> {new Date(evidenceModalRecord.timestamp).toLocaleString()}
              </div>
            </div>

            {/* Title Diff */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                HTML Document Title Comparison
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 space-y-1">
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Live Current Title</span>
                  <div className="text-rose-200">{evidenceModalRecord.currentTitle}</div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Trusted Baseline Title</span>
                  <div className="text-emerald-200">{evidenceModalRecord.baselineTitle}</div>
                </div>
              </div>
            </div>

            {/* Injected Scripts */}
            {evidenceModalRecord.injectedScripts.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                  New Unverified External Scripts
                </div>
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 space-y-1.5 text-xs font-mono">
                  {evidenceModalRecord.injectedScripts.map((script, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-rose-300">
                      <Code2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span className="break-all">{script}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suspicious Keywords */}
            {evidenceModalRecord.evidenceDiff?.suspiciousKeywords && evidenceModalRecord.evidenceDiff.suspiciousKeywords.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                  Defacement Keywords Flagged
                </div>
                <div className="flex flex-wrap gap-2">
                  {evidenceModalRecord.evidenceDiff.suspiciousKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-600 text-white"
                    >
                      &quot;{kw}&quot;
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Text Snippet Side-by-Side */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Text Content Snippet Delta
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="rounded-lg border border-inherit bg-neutral-950/60 p-3">
                  <div className="text-[10px] text-neutral-500 mb-1">CURRENT TEXT SNIPPET:</div>
                  <div className="text-neutral-300 leading-relaxed break-words">
                    {evidenceModalRecord.currentTextSnippet}
                  </div>
                </div>
                <div className="rounded-lg border border-inherit bg-neutral-950/60 p-3">
                  <div className="text-[10px] text-neutral-500 mb-1">BASELINE TEXT SNIPPET:</div>
                  <div className="text-neutral-400 leading-relaxed break-words">
                    {evidenceModalRecord.baselineTextSnippet}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions inside modal */}
            <div className="border-t pt-4 border-inherit flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                Inspect before approving changes or updating baseline.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSetBaseline(evidenceModalRecord);
                    setEvidenceModalRecord(null);
                  }}
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
                >
                  Set as Trusted Baseline
                </button>
                <button
                  onClick={() => setEvidenceModalRecord(null)}
                  className="rounded-lg border border-neutral-700 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
