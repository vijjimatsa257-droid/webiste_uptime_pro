import React, { useState, useMemo } from 'react';
import { ContentChangeEvent, Monitor } from '../../types';
import { api } from '../../services/api';
import {
  FileDiff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Eye,
  Sliders,
  Sparkles,
  Info,
  ShieldCheck,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface ContentChangesViewProps {
  changes: ContentChangeEvent[];
  monitors: Monitor[];
  isDark: boolean;
  onRefreshChanges: () => Promise<void>;
  onMarkExpected: (id: string, expected: boolean) => Promise<void>;
  onDeleteChange: (id: string) => Promise<void>;
  onUpdateMonitor: (id: string, updates: Partial<Monitor>) => Promise<void>;
}

export const ContentChangesView: React.FC<ContentChangesViewProps> = ({
  changes,
  monitors,
  isDark,
  onRefreshChanges,
  onMarkExpected,
  onDeleteChange,
  onUpdateMonitor
}) => {
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>('all');
  const [filterExpected, setFilterExpected] = useState<'all' | 'unexpected' | 'expected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(changes[0]?.id || null);

  // Snapshot modal viewer
  const [viewingSnapshot, setViewingSnapshot] = useState<{
    title: string;
    type: 'old' | 'new';
    content: string;
    timestamp: string;
  } | null>(null);

  // Manual check form
  const [checkUrl, setCheckUrl] = useState('');
  const [checkSelector, setCheckSelector] = useState('');
  const [checkIgnoreText, setCheckIgnoreText] = useState('');
  const [checkThreshold, setCheckThreshold] = useState<number>(0);
  const [checkKeyword, setCheckKeyword] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkNotice, setCheckNotice] = useState<string | null>(null);
  const [showTester, setShowTester] = useState(false);

  // Monitors with content change detection enabled
  const trackedMonitors = useMemo(() => {
    return monitors.filter(m => m.contentChangeConfig?.enabled);
  }, [monitors]);

  const filteredChanges = useMemo(() => {
    return changes.filter(c => {
      if (selectedMonitorId !== 'all' && c.monitorId !== selectedMonitorId) return false;
      if (filterExpected === 'unexpected' && c.isExpected) return false;
      if (filterExpected === 'expected' && !c.isExpected) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = c.monitorName.toLowerCase().includes(q);
        const matchesUrl = c.url.toLowerCase().includes(q);
        const matchesSnapshot = (c.oldSnapshot + c.newSnapshot).toLowerCase().includes(q);
        if (!matchesName && !matchesUrl && !matchesSnapshot) return false;
      }
      return true;
    });
  }, [changes, selectedMonitorId, filterExpected, searchTerm]);

  const unexpectedCount = changes.filter(c => !c.isExpected).length;

  const handleRunAdHocCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkUrl.trim()) return;

    setIsChecking(true);
    setCheckNotice(null);
    try {
      const res = await api.runContentChangeCheck({
        url: checkUrl.trim(),
        selector: checkSelector.trim() || undefined,
        ignoreText: checkIgnoreText.trim() || undefined,
        notifyThresholdPercent: checkThreshold > 0 ? checkThreshold : undefined,
        triggerKeyword: checkKeyword.trim() || undefined
      });

      if (res.hasChanged) {
        setCheckNotice(`Content change detected! Delta: ${res.changePercent}% (${res.diffSummary.linesAdded} lines added, ${res.diffSummary.linesRemoved} lines removed).`);
        await onRefreshChanges();
      } else {
        setCheckNotice('No visual content change detected. Content hash is identical.');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setCheckNotice(e.message || 'Check failed to execute');
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleMonitorTracking = async (monitor: Monitor) => {
    const isCurrentlyEnabled = Boolean(monitor.contentChangeConfig?.enabled);
    await onUpdateMonitor(monitor.id, {
      contentChangeConfig: {
        enabled: !isCurrentlyEnabled,
        intervalMinutes: monitor.contentChangeConfig?.intervalMinutes || 60,
        selector: monitor.contentChangeConfig?.selector || '',
        ignoreText: monitor.contentChangeConfig?.ignoreText || '',
        notifyThresholdPercent: monitor.contentChangeConfig?.notifyThresholdPercent || 10
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <FileDiff className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Content Change Detection
                </h1>
                {unexpectedCount > 0 && (
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-semibold text-rose-300 border border-rose-500/30">
                    {unexpectedCount} unexpected
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Automated DOM & text hashing, noise stripping, side-by-side visual diffs, and keyword trigger alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTester(!showTester)}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{showTester ? 'Hide Test Form' : 'Test URL Now'}</span>
            </button>

            <button
              type="button"
              onClick={onRefreshChanges}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Test form panel */}
        {showTester && (
          <form onSubmit={handleRunAdHocCheck} className="mt-5 pt-4 border-t border-inherit space-y-3">
            <div className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Run Ad-Hoc Content Check</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-neutral-400 mb-1">Target URL</label>
                <input
                  type="text"
                  value={checkUrl}
                  onChange={e => setCheckUrl(e.target.value)}
                  placeholder="https://example.com/pricing or api.github.com"
                  className={`w-full rounded-lg border py-1.5 px-2.5 text-xs font-mono ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-300 bg-white text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Target Selector (Optional)</label>
                <input
                  type="text"
                  value={checkSelector}
                  onChange={e => setCheckSelector(e.target.value)}
                  placeholder="e.g. .price, #main, article"
                  className={`w-full rounded-lg border py-1.5 px-2.5 text-xs font-mono ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-300 bg-white text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Trigger Keyword (Optional)</label>
                <input
                  type="text"
                  value={checkKeyword}
                  onChange={e => setCheckKeyword(e.target.value)}
                  placeholder="e.g. out of stock, copilot"
                  className={`w-full rounded-lg border py-1.5 px-2.5 text-xs font-mono ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-300 bg-white text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Ignore Text Pattern (Optional)</label>
                <input
                  type="text"
                  value={checkIgnoreText}
                  onChange={e => setCheckIgnoreText(e.target.value)}
                  placeholder="e.g. Copyright 2026"
                  className={`w-full rounded-lg border py-1.5 px-2.5 text-xs font-mono ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-300 bg-white text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Min Change % (Threshold)</label>
                <select
                  value={checkThreshold}
                  onChange={e => setCheckThreshold(Number(e.target.value))}
                  className={`w-full rounded-lg border py-1.5 px-2.5 text-xs ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-300 bg-white text-slate-900'
                  }`}
                >
                  <option value={0}>Any Change (1% or greater)</option>
                  <option value={5}>At least 5% change</option>
                  <option value={10}>At least 10% change</option>
                  <option value={25}>At least 25% change</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={isChecking || !checkUrl.trim()}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  <span>{isChecking ? 'Fetching & Analyzing...' : 'Run Content Diff Check'}</span>
                </button>
              </div>
            </div>

            {checkNotice && (
              <div className="mt-2 rounded-lg bg-purple-500/10 border border-purple-500/30 p-2.5 text-xs text-purple-300 flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <span>{checkNotice}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Monitor Quick Toggles Section */}
      <div
        className={`rounded-xl border p-4 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/70' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-inherit">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Active Monitored Targets
            </h2>
            <span className="font-mono text-xs text-neutral-500">
              ({trackedMonitors.length} active)
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">
            Turn detection on/off per monitor
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {monitors.map(m => {
            const isEnabled = Boolean(m.contentChangeConfig?.enabled);
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors ${
                  isEnabled
                    ? isDark
                      ? 'border-purple-500/40 bg-purple-500/10 text-neutral-200'
                      : 'border-purple-200 bg-purple-50 text-slate-800'
                    : isDark
                    ? 'border-neutral-800 bg-neutral-950/60 text-neutral-400'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="min-w-0 mr-2">
                  <div className="font-bold truncate">{m.name}</div>
                  <div className="text-[10px] font-mono text-neutral-500 truncate">{m.url}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleMonitorTracking(m)}
                  className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    isEnabled
                      ? 'bg-purple-600 text-white hover:bg-purple-500'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {isEnabled ? 'Watching' : 'Enable'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Monitor select */}
          <select
            value={selectedMonitorId}
            onChange={e => setSelectedMonitorId(e.target.value)}
            className={`rounded-lg border py-1.5 px-2.5 text-xs ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
            }`}
          >
            <option value="all">All Monitors & Endpoints</option>
            {monitors.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <div className="flex rounded-lg border border-inherit p-0.5 bg-neutral-950/40 text-xs">
            <button
              onClick={() => setFilterExpected('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterExpected === 'all' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All ({changes.length})
            </button>
            <button
              onClick={() => setFilterExpected('unexpected')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterExpected === 'unexpected' ? 'bg-rose-500/20 text-rose-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Unexpected ({unexpectedCount})
            </button>
            <button
              onClick={() => setFilterExpected('expected')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterExpected === 'expected' ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Marked Expected
            </button>
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search changes or diff content..."
            className={`w-full rounded-lg border py-1.5 pl-8 pr-2.5 text-xs ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Changes Timeline List */}
      {filteredChanges.length === 0 ? (
        <div
          className={`rounded-xl border p-12 text-center transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
          }`}
        >
          <FileDiff className="h-10 w-10 text-neutral-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-neutral-300">No Content Changes Found</h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            Enable content change detection on a monitor or click &quot;Test URL Now&quot; to take a content snapshot.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChanges.map((change) => {
            const isExpanded = expandedId === change.id;
            const oldLines = change.oldSnapshot.split('\n');
            const newLines = change.newSnapshot.split('\n');

            return (
              <div
                key={change.id}
                className={`rounded-xl border transition-all ${
                  isDark
                    ? change.isExpected
                      ? 'border-neutral-800 bg-neutral-900/70'
                      : 'border-purple-500/30 bg-neutral-900/90 shadow-sm'
                    : change.isExpected
                    ? 'border-slate-200 bg-white'
                    : 'border-purple-300 bg-purple-50/20 shadow-xs'
                }`}
              >
                {/* Header Row */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-inherit">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                        change.isExpected
                          ? 'bg-neutral-800 text-neutral-400'
                          : 'bg-purple-500/20 text-purple-400 font-bold'
                      }`}
                    >
                      <FileDiff className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {change.monitorName}
                        </span>

                        <span className="rounded px-2 py-0.5 text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Δ {change.changePercent}% Changed
                        </span>

                        {change.isExpected ? (
                          <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Expected Change
                          </span>
                        ) : (
                          <span className="rounded bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                            Unreviewed Alert
                          </span>
                        )}

                        {change.keywordTriggered && (
                          <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300 font-mono">
                            Keyword: &quot;{change.keywordTriggered}&quot;
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mt-1 truncate">
                        <a
                          href={change.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-purple-400 hover:underline truncate flex items-center gap-1"
                        >
                          <span>{change.url}</span>
                          <ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
                        </a>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <Clock className="h-3 w-3" />
                          {new Date(change.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onMarkExpected(change.id, !change.isExpected)}
                      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        change.isExpected
                          ? 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                      }`}
                      title={change.isExpected ? 'Mark as unexpected' : 'Mark as expected (acknowledges change)'}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{change.isExpected ? 'Mark Unexpected' : 'Mark as Expected'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : change.id)}
                      className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Diff' : 'View Side-by-Side Diff'}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteChange(change.id)}
                      className="p-1 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Diff View Body */}
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {/* Diff Metrics Banner */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 bg-neutral-950/60 p-2.5 rounded-lg border border-inherit">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-semibold font-mono">
                          +{change.diffSummary?.linesAdded || 0} lines added
                        </span>
                        <span className="text-rose-400 font-semibold font-mono">
                          -{change.diffSummary?.linesRemoved || 0} lines removed
                        </span>
                        <span>
                          Hash: <code className="text-neutral-300">{change.oldHash}</code> →{' '}
                          <code className="text-purple-300">{change.newHash}</code>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingSnapshot({
                              title: `Old Snapshot (${change.monitorName})`,
                              type: 'old',
                              content: change.oldSnapshot,
                              timestamp: change.timestamp
                            })
                          }
                          className="hover:underline text-neutral-300 text-[11px] cursor-pointer"
                        >
                          View Full Old Snapshot
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() =>
                            setViewingSnapshot({
                              title: `New Snapshot (${change.monitorName})`,
                              type: 'new',
                              content: change.newSnapshot,
                              timestamp: change.timestamp
                            })
                          }
                          className="hover:underline text-purple-400 text-[11px] cursor-pointer"
                        >
                          View Full New Snapshot
                        </button>
                      </div>
                    </div>

                    {/* Side by side diff container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      {/* Old snapshot */}
                      <div className="rounded-lg border border-inherit bg-neutral-950/80 p-3 overflow-x-auto max-h-80">
                        <div className="text-[10px] font-bold uppercase text-neutral-500 pb-2 border-b border-neutral-800 mb-2">
                          Previous Snapshot
                        </div>
                        <pre className="text-neutral-300 whitespace-pre-wrap leading-relaxed">
                          {oldLines.map((line, idx) => {
                            const isRemoved = !newLines.includes(line);
                            return (
                              <div
                                key={idx}
                                className={isRemoved ? 'bg-rose-500/20 text-rose-300 px-1 rounded-xs' : ''}
                              >
                                {isRemoved ? '- ' : '  '}
                                {line}
                              </div>
                            );
                          })}
                        </pre>
                      </div>

                      {/* New snapshot */}
                      <div className="rounded-lg border border-inherit bg-neutral-950/80 p-3 overflow-x-auto max-h-80">
                        <div className="text-[10px] font-bold uppercase text-purple-400 pb-2 border-b border-neutral-800 mb-2">
                          Current Snapshot (New)
                        </div>
                        <pre className="text-neutral-300 whitespace-pre-wrap leading-relaxed">
                          {newLines.map((line, idx) => {
                            const isAdded = !oldLines.includes(line);
                            return (
                              <div
                                key={idx}
                                className={isAdded ? 'bg-emerald-500/20 text-emerald-300 px-1 rounded-xs font-semibold' : ''}
                              >
                                {isAdded ? '+ ' : '  '}
                                {line}
                              </div>
                            );
                          })}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Snapshot Full Modal */}
      {viewingSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-3xl rounded-2xl border p-5 shadow-2xl transition-all max-h-[85vh] flex flex-col ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2">
                <FileDiff className="h-4 w-4 text-purple-400" />
                <h3 className="font-bold text-sm">{viewingSnapshot.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSnapshot(null)}
                className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 rounded-lg border border-inherit bg-neutral-950 p-4 font-mono text-xs">
              <pre className="whitespace-pre-wrap leading-relaxed text-neutral-300">
                {viewingSnapshot.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
