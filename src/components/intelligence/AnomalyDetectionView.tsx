import React, { useState, useMemo } from 'react';
import { AnomalyEvent, Monitor, AnomalySeverity, AnomalyType } from '../../types';
import { api } from '../../services/api';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sliders,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  Sparkles,
  Info,
  Activity,
  Flame,
  FileText,
  Lock,
  ArrowUpRight
} from 'lucide-react';

interface AnomalyDetectionViewProps {
  anomalies: AnomalyEvent[];
  monitors: Monitor[];
  isDark: boolean;
  onRefreshAnomalies: () => Promise<void>;
  onActOnAnomaly: (id: string, action: 'ignore' | 'investigate') => Promise<void>;
  onDeleteAnomaly: (id: string) => Promise<void>;
  onUpdateMonitor: (id: string, updates: Partial<Monitor>) => Promise<void>;
}

export const AnomalyDetectionView: React.FC<AnomalyDetectionViewProps> = ({
  anomalies,
  monitors,
  isDark,
  onRefreshAnomalies,
  onActOnAnomaly,
  onDeleteAnomaly,
  onUpdateMonitor
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | AnomalySeverity>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'investigated' | 'ignored'>('all');
  const [filterType, setFilterType] = useState<'all' | AnomalyType>('all');
  const [selectedMonitorFilter, setSelectedMonitorFilter] = useState<string>('all');
  const [isRunningDetection, setIsRunningDetection] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Monitor sensitivity settings drawer/modal or inline card
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Filtered anomalies
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (selectedMonitorFilter !== 'all' && a.monitorId !== selectedMonitorFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = a.monitorName.toLowerCase().includes(q);
        const matchesReason = a.reason.toLowerCase().includes(q);
        const matchesType = a.type.toLowerCase().includes(q);
        if (!matchesName && !matchesReason && !matchesType) return false;
      }
      return true;
    });
  }, [anomalies, filterSeverity, filterStatus, filterType, selectedMonitorFilter, searchTerm]);

  // Statistics
  const activeCount = anomalies.filter(a => a.status === 'active').length;
  const highSeverityCount = anomalies.filter(a => a.status === 'active' && a.severity === 'high').length;
  const investigatedCount = anomalies.filter(a => a.status === 'investigated').length;
  const ignoredCount = anomalies.filter(a => a.status === 'ignored').length;

  // Run full anomaly detection cycle
  const handleTriggerDetection = async () => {
    setIsRunningDetection(true);
    try {
      await api.runAnomalyDetection();
      await onRefreshAnomalies();
    } finally {
      setIsRunningDetection(false);
    }
  };

  const handleAction = async (id: string, action: 'ignore' | 'investigate') => {
    setActioningId(id);
    try {
      await onActOnAnomaly(id, action);
    } finally {
      setActioningId(null);
    }
  };

  // Sensitivity label helper
  const getSeverityBadge = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
            <Flame className="h-3 w-3" />
            <span>High Severity</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3" />
            <span>Medium Severity</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-400 border border-sky-500/30">
            <Activity className="h-3 w-3" />
            <span>Low Severity</span>
          </span>
        );
    }
  };

  const getTypeIcon = (type: AnomalyType) => {
    switch (type) {
      case 'latency':
      case 'consecutive_slow':
        return <Activity className="h-4 w-4 text-orange-400" />;
      case 'status_code':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'ssl_cert':
        return <Lock className="h-4 w-4 text-sky-400" />;
      case 'page_size':
        return <FileText className="h-4 w-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold tracking-tight">Anomaly & Outlier Detection</h1>
            <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400 border border-orange-500/20">
              Site Intelligence
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Machine learning & statistical models learning baseline latency over 7 days (rolling mean & 3σ deviation) to isolate genuine performance regressions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              showConfigPanel
                ? isDark
                  ? 'border-orange-500/50 bg-orange-500/15 text-orange-400'
                  : 'border-orange-300 bg-orange-50 text-orange-700'
                : isDark
                ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Sensitivity Config</span>
          </button>

          <button
            onClick={handleTriggerDetection}
            disabled={isRunningDetection}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-neutral-950 shadow-sm hover:bg-orange-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isRunningDetection ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Run Detection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active Anomalies */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            activeCount > 0
              ? isDark
                ? 'border-orange-500/40 bg-orange-500/10'
                : 'border-orange-300 bg-orange-50'
              : isDark
              ? 'border-neutral-800 bg-neutral-900/60'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className={activeCount > 0 ? 'text-orange-400 font-semibold' : ''}>Active Anomalies</span>
            <AlertTriangle className={`h-4 w-4 ${activeCount > 0 ? 'text-orange-400' : 'text-neutral-500'}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${activeCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
            {activeCount}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {highSeverityCount > 0 ? `${highSeverityCount} high-severity outliers` : 'All signals within tolerance'}
          </div>
        </div>

        {/* Investigating */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Investigating</span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-sky-400">
            {investigatedCount}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Marked for diagnostic review
          </div>
        </div>

        {/* Ignored / False Alarms */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Muted / Ignored</span>
            <CheckCircle2 className="h-4 w-4 text-neutral-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-400">
            {ignoredCount}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Expected spikes or maintenance
          </div>
        </div>

        {/* Learning Grace Period */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Learning Status</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-base font-bold text-emerald-400 flex items-center gap-1.5">
            <span>24h Baseline Active</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            No false alerts during initial warmup
          </div>
        </div>
      </div>

      {/* Sensitivity Config Panel (Collapsible) */}
      {showConfigPanel && (
        <div
          className={`rounded-2xl border p-5 transition-all ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-inherit mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-orange-400" />
              <h3 className="font-semibold text-sm">Monitor Sensitivity Configurations</h3>
            </div>
            <span className="text-xs text-neutral-400">
              High = tight 2σ band · Medium = 3σ standard · Low = 4.5σ loose (only catastrophic spikes)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {monitors.map(mon => {
              const currentSensitivity = mon.anomalyConfig?.sensitivity || 'medium';
              const isEnabled = mon.anomalyConfig?.enabled ?? true;

              return (
                <div
                  key={mon.id}
                  className={`rounded-xl border p-3 flex flex-col justify-between gap-3 ${
                    isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-xs truncate max-w-[180px]">{mon.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono truncate max-w-[180px]">{mon.url}</div>
                    </div>
                    <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={e => {
                          onUpdateMonitor(mon.id, {
                            anomalyConfig: {
                              enabled: e.target.checked,
                              sensitivity: currentSensitivity
                            }
                          });
                        }}
                        className="rounded border-neutral-700 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-neutral-400">Enable</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-inherit text-xs">
                    <span className="text-neutral-400 text-[11px]">Sensitivity:</span>
                    <div className="flex items-center gap-1">
                      {(['low', 'medium', 'high'] as const).map(sens => (
                        <button
                          key={sens}
                          type="button"
                          onClick={() => {
                            onUpdateMonitor(mon.id, {
                              anomalyConfig: {
                                enabled: isEnabled,
                                sensitivity: sens
                              }
                            });
                          }}
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold capitalize transition-colors cursor-pointer ${
                            currentSensitivity === sens
                              ? isDark
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : 'bg-orange-100 text-orange-800 border border-orange-200'
                              : isDark
                              ? 'text-neutral-500 hover:text-neutral-300'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {sens}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search monitor, cause, metrics..."
              className={`w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-orange-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-white text-slate-900'
              }`}
            />
          </div>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value as any)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <option value="all">All Severities</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="low">Low Severity</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="investigated">Investigated</option>
            <option value="ignored">Ignored</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <option value="all">All Types</option>
            <option value="latency">Latency Outlier (&gt;3σ)</option>
            <option value="consecutive_slow">Consecutive Slow Checks</option>
            <option value="status_code">Sudden Status Shift</option>
            <option value="page_size">Payload Size Anomaly</option>
            <option value="ssl_cert">SSL Cert Drift</option>
          </select>
        </div>

        <div className="text-xs text-neutral-400 font-mono">
          Showing {filteredAnomalies.length} of {anomalies.length} events
        </div>
      </div>

      {/* Anomalies List */}
      {filteredAnomalies.length > 0 ? (
        <div className="space-y-3">
          {filteredAnomalies.map(anomaly => {
            const isInvestigated = anomaly.status === 'investigated';
            const isIgnored = anomaly.status === 'ignored';
            const isActive = anomaly.status === 'active';

            return (
              <div
                key={anomaly.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                  isActive && anomaly.severity === 'high'
                    ? isDark
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-rose-200 bg-rose-50/40'
                    : isDark
                    ? 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-700'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Info & Metrics */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getSeverityBadge(anomaly.severity)}

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono ${
                          isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {getTypeIcon(anomaly.type)}
                        <span className="capitalize">{anomaly.type.replace('_', ' ')}</span>
                      </span>

                      {isInvestigated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Investigating</span>
                        </span>
                      )}

                      {isIgnored && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/10 px-2 py-0.5 text-[10px] font-semibold text-neutral-400 border border-neutral-500/20">
                          <span>Muted</span>
                        </span>
                      )}

                      <span className="text-neutral-500 text-xs">·</span>
                      <span className="text-neutral-400 text-xs font-mono">
                        {new Date(anomaly.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <span>{anomaly.monitorName}</span>
                        {anomaly.url && (
                          <span className="text-xs font-mono font-normal text-neutral-500">
                            ({anomaly.url})
                          </span>
                        )}
                      </h4>
                      <p className="mt-1 text-xs text-neutral-300 leading-relaxed font-sans">
                        {anomaly.reason}
                      </p>
                    </div>

                    {/* Comparison Pill */}
                    <div
                      className={`inline-flex items-center gap-3 rounded-lg border px-3 py-1.5 text-xs font-mono ${
                        isDark ? 'border-neutral-800 bg-neutral-950/80' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="text-neutral-500">Observed: </span>
                        <strong className="text-orange-400">{String(anomaly.currentValue)}</strong>
                      </div>
                      <span className="text-neutral-600">vs</span>
                      <div>
                        <span className="text-neutral-500">Normal Baseline: </span>
                        <strong className="text-emerald-400">{String(anomaly.expectedValue)}</strong>
                      </div>
                      {typeof anomaly.currentValue === 'number' && typeof anomaly.expectedValue === 'number' && anomaly.expectedValue > 0 && (
                        <span className="rounded bg-orange-500/15 px-1.5 py-0.2 text-[10px] font-bold text-orange-400">
                          +{Math.round(((anomaly.currentValue - anomaly.expectedValue) / anomaly.expectedValue) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    {/* Investigate Button */}
                    <button
                      type="button"
                      disabled={actioningId === anomaly.id}
                      onClick={() => handleAction(anomaly.id, 'investigate')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        isInvestigated
                          ? isDark
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-sky-100 text-sky-800 border border-sky-200'
                          : isDark
                          ? 'border-neutral-800 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{isInvestigated ? 'Under Review' : 'Investigate'}</span>
                    </button>

                    {/* Ignore Button */}
                    <button
                      type="button"
                      disabled={actioningId === anomaly.id}
                      onClick={() => handleAction(anomaly.id, 'ignore')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isIgnored
                          ? 'text-neutral-500 font-semibold'
                          : isDark
                          ? 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{isIgnored ? 'Ignored' : 'Ignore'}</span>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onDeleteAnomaly(anomaly.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors"
                      title="Delete anomaly log"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div
          className={`rounded-2xl border p-12 text-center transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/40' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h3 className="mt-4 text-base font-bold">No Statistical Anomalies Detected</h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-md mx-auto">
            All monitors are responding well within their 7-day rolling baseline standard deviation bands. No unusual status codes, payload mutations, or latency outliers detected.
          </p>
        </div>
      )}
    </div>
  );
};
