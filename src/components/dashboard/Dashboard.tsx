import React, { useState, useMemo } from 'react';
import { Monitor, FavoriteSite, AnomalyEvent, DefacementRecord, ScreenshotItem, Incident } from '../../types';
import { ResponseTimeChart } from './ResponseTimeChart';
import { UptimeBar90Days } from './UptimeBar90Days';
import { StarButton } from '../common/StarButton';
import { FavoriteSmartTips } from '../favorites/FavoriteSmartTips';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  Play,
  Pause,
  Eye,
  RefreshCw,
  MoreVertical,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
  Star,
  Pin,
  Camera,
  QrCode,
  Wrench,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  monitors: Monitor[];
  onCheckNow: (id: string) => Promise<void>;
  onToggleWatch: (id: string) => Promise<void>;
  onTogglePause: (id: string, currentlyPaused: boolean) => Promise<void>;
  onEditMonitor: (monitor: Monitor) => void;
  onDeleteMonitor: (id: string) => Promise<void>;
  onOpenAddModal: () => void;
  checkingIds: Set<string>;
  isDark: boolean;
  favorites?: FavoriteSite[];
  isStarred?: (url: string) => boolean;
  onToggleStar?: (site: {
    url: string;
    name?: string;
    status?: any;
    responseTimeMs?: number;
    statusCode?: number;
    sslDaysRemaining?: number | null;
  }) => Promise<void>;
  onNavigateToFavorites?: () => void;
  onCheckFavorite?: (id: string) => Promise<void>;
  onCheckAllFavorites?: () => Promise<void>;
  anomalies?: AnomalyEvent[];
  defacementRecords?: DefacementRecord[];
  screenshots?: ScreenshotItem[];
  incidents?: Incident[];
  onNavigateToTab?: (tab: string) => void;
  onOpenMonitorQr?: (monitor: Monitor) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  monitors,
  onCheckNow,
  onToggleWatch,
  onTogglePause,
  onEditMonitor,
  onDeleteMonitor,
  onOpenAddModal,
  checkingIds,
  isDark,
  favorites = [],
  isStarred,
  onToggleStar,
  onNavigateToFavorites,
  onCheckFavorite,
  onCheckAllFavorites,
  anomalies = [],
  defacementRecords = [],
  screenshots = [],
  incidents = [],
  onNavigateToTab,
  onOpenMonitorQr
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'blocked' | 'down' | 'paused' | 'watched'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedMonitorId, setExpandedMonitorId] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [isCheckingFavs, setIsCheckingFavs] = useState(false);

  // Summary Metrics calculations
  const totalCount = monitors.length;
  const upCount = monitors.filter(m => m.status === 'up').length;
  const blockedCount = monitors.filter(m => m.status === 'blocked').length;
  const downCount = monitors.filter(m => m.status === 'down').length;
  const pausedCount = monitors.filter(m => m.status === 'paused').length;

  const avgResponseTime = useMemo(() => {
    const activeWithTime = monitors.filter(m => (m.status === 'up' || m.status === 'blocked') && m.responseTimeMs > 0);
    if (activeWithTime.length === 0) return 0;
    const sum = activeWithTime.reduce((acc, m) => acc + m.responseTimeMs, 0);
    return Math.round(sum / activeWithTime.length);
  }, [monitors]);

  const overallUptime = useMemo(() => {
    if (monitors.length === 0) return 100;
    const sum = monitors.reduce((acc, m) => acc + (m.uptime30d || 100), 0);
    return Number((sum / monitors.length).toFixed(2));
  }, [monitors]);

  // Security & Visual Monitoring Metrics
  const defacementRisksCount = useMemo(() => {
    return defacementRecords.filter(r => r.riskScore === 'critical' || r.riskScore === 'high').length;
  }, [defacementRecords]);

  const visualChanges24h = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return screenshots.filter(s => {
      const isPast24h = new Date(s.timestamp).getTime() >= oneDayAgo;
      const exceeds = s.diffPercent >= 10 || s.status === 'alert';
      return isPast24h && exceeds && !s.isBaseline;
    });
  }, [screenshots]);

  const openIncidentsWithFix = useMemo(() => {
    return incidents.filter(i => i.status === 'ongoing');
  }, [incidents]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    monitors.forEach(m => m.tags.forEach(t => set.add(t)));
    return Array.from(set);
  }, [monitors]);

  // Filter monitors
  const filteredMonitors = useMemo(() => {
    return monitors.filter(m => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'up') matchesStatus = m.status === 'up';
      if (statusFilter === 'blocked') matchesStatus = m.status === 'blocked';
      if (statusFilter === 'down') matchesStatus = m.status === 'down';
      if (statusFilter === 'paused') matchesStatus = m.status === 'paused';
      if (statusFilter === 'watched') matchesStatus = m.isWatched;

      let matchesTag = true;
      if (selectedTag !== 'all') {
        matchesTag = m.tags.includes(selectedTag);
      }

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [monitors, searchTerm, statusFilter, selectedTag]);

  return (
    <div className="space-y-6">
      {/* Onboarding Tip */}
      {showTip && (
        <div
          className={`flex items-start justify-between rounded-xl border p-4 transition-colors ${
            isDark
              ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 mt-0.5 shrink-0 text-emerald-500" />
            <div className="text-xs">
              <span className="font-semibold text-emerald-400">Pro Tip: </span>
              Enable the <strong className="underline">Watch</strong> feature on any down server.
              Our background runner checks it every 30 seconds and sounds an audio chime with browser alert the second it recovers, so you can focus on your work without tab-switching.
            </div>
          </div>
          <button
            onClick={() => setShowTip(false)}
            className="text-xs text-neutral-400 hover:text-neutral-200 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Monitors */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Total</span>
            <Activity className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {totalCount}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">All monitors</div>
        </div>

        {/* Up Monitors */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Online (Up)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-emerald-500">
            {upCount}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
            {totalCount > 0 ? ((upCount / totalCount) * 100).toFixed(0) : 0}% operational
          </div>
        </div>

        {/* Blocked Monitors */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'blocked' ? 'all' : 'blocked')}
          className={`rounded-xl border p-4 transition-colors cursor-pointer ${
            blockedCount > 0
              ? isDark
                ? 'border-amber-500/30 bg-amber-950/20'
                : 'border-amber-300 bg-amber-50/50 shadow-xs'
              : isDark
              ? 'border-neutral-800 bg-neutral-900/90'
              : 'border-slate-200 bg-white shadow-xs'
          }`}
          title="Reachable but blocked by 401/403/429/bot protection"
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Blocked (Warning)</span>
            <span className="h-2 w-2 rounded-full bg-amber-400" />
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-bold tracking-tight ${
              blockedCount > 0 ? 'text-amber-400' : 'text-neutral-400'
            }`}
          >
            {blockedCount}
          </div>
          <div className="mt-1 text-[11px] text-amber-500/90 font-mono">
            {blockedCount > 0 ? 'Bot protection / 403' : 'None blocked'}
          </div>
        </div>

        {/* Down Monitors */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'down' ? 'all' : 'down')}
          className={`rounded-xl border p-4 transition-colors cursor-pointer ${
            downCount > 0
              ? isDark
                ? 'border-rose-500/30 bg-rose-950/20'
                : 'border-rose-300 bg-rose-50/50 shadow-xs'
              : isDark
              ? 'border-neutral-800 bg-neutral-900/90'
              : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Offline (Down)</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-bold tracking-tight ${
              downCount > 0 ? 'text-rose-500' : 'text-neutral-400'
            }`}
          >
            {downCount}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {downCount > 0 ? `${downCount} require attention` : 'No outages'}
          </div>
        </div>

        {/* Average Response Time */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Avg Response</span>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {avgResponseTime} <span className="text-xs font-normal text-neutral-500">ms</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">HTTP latency</div>
        </div>

        {/* Overall Uptime % */}
        <div
          className={`col-span-2 sm:col-span-1 rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Uptime SLA</span>
            <Percent className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {overallUptime}%
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">30-day aggregate</div>
        </div>
      </div>

      {/* Security & Intelligence Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Defacement risks */}
        <div
          onClick={() => onNavigateToTab?.('defacement-detection')}
          className={`rounded-xl border p-4 transition-all cursor-pointer group ${
            defacementRisksCount > 0
              ? isDark
                ? 'border-rose-500/40 bg-rose-950/20 hover:border-rose-500/70'
                : 'border-rose-300 bg-rose-50/60 hover:border-rose-400'
              : isDark
              ? 'border-neutral-800 bg-neutral-900/90 hover:border-neutral-700'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-neutral-400">
              <ShieldAlert className={`h-4 w-4 ${defacementRisksCount > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
              <span>Defacement risks</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              defacementRisksCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
            }`}>
              {defacementRisksCount > 0 ? `${defacementRisksCount} FLAGGED` : 'PRISTINE'}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className={`font-mono text-2xl font-bold tracking-tight ${defacementRisksCount > 0 ? 'text-rose-400' : 'text-neutral-200'}`}>
              {defacementRisksCount}
            </div>
            <div className="text-[11px] text-neutral-500 group-hover:text-emerald-400 flex items-center gap-1 transition-colors font-medium">
              <span>Inspect baseline</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {defacementRisksCount > 0
              ? 'High/critical risks requiring immediate review'
              : 'Integrity hashes & script baselines verified'}
          </div>
        </div>

        {/* Card 2: Visual changes (24h) */}
        <div
          onClick={() => onNavigateToTab?.('screenshot-comparison')}
          className={`rounded-xl border p-4 transition-all cursor-pointer group ${
            visualChanges24h.length > 0
              ? isDark
                ? 'border-indigo-500/40 bg-indigo-950/20 hover:border-indigo-500/70'
                : 'border-indigo-300 bg-indigo-50/60 hover:border-indigo-400'
              : isDark
              ? 'border-neutral-800 bg-neutral-900/90 hover:border-neutral-700'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-neutral-400">
              <Camera className={`h-4 w-4 ${visualChanges24h.length > 0 ? 'text-indigo-400' : 'text-neutral-400'}`} />
              <span>Visual changes (24h)</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              visualChanges24h.length > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {visualChanges24h.length > 0 ? `${visualChanges24h.length} DIFFS` : 'STABLE'}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className={`font-mono text-2xl font-bold tracking-tight ${visualChanges24h.length > 0 ? 'text-indigo-400' : 'text-neutral-200'}`}>
              {visualChanges24h.length}
            </div>
            <div className="text-[11px] text-neutral-500 group-hover:text-indigo-400 flex items-center gap-1 transition-colors font-medium">
              <span>View comparison</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {visualChanges24h.length > 0
              ? `Max visual difference: ${Math.max(...visualChanges24h.map(s => s.diffPercent))}%`
              : 'Screenshots match baselines within threshold'}
          </div>
        </div>

        {/* Card 3: Open incidents with a suggested fix */}
        <div
          onClick={() => onNavigateToTab?.('incidents')}
          className={`rounded-xl border p-4 transition-all cursor-pointer group ${
            openIncidentsWithFix.length > 0
              ? isDark
                ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500/70'
                : 'border-amber-300 bg-amber-50/60 hover:border-amber-400'
              : isDark
              ? 'border-neutral-800 bg-neutral-900/90 hover:border-neutral-700'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-neutral-400">
              <Wrench className={`h-4 w-4 ${openIncidentsWithFix.length > 0 ? 'text-amber-400 animate-pulse' : 'text-neutral-400'}`} />
              <span>Open incidents with a suggested fix</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              openIncidentsWithFix.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
            }`}>
              {openIncidentsWithFix.length > 0 ? `${openIncidentsWithFix.length} ACTIONABLE` : 'ALL CLEAR'}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className={`font-mono text-2xl font-bold tracking-tight ${openIncidentsWithFix.length > 0 ? 'text-amber-400' : 'text-neutral-200'}`}>
              {openIncidentsWithFix.length}
            </div>
            <div className="text-[11px] text-neutral-500 group-hover:text-amber-400 flex items-center gap-1 transition-colors font-medium">
              <span>Auto-troubleshoot</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {openIncidentsWithFix.length > 0
              ? 'Root cause identified with diagnostic command guide'
              : 'No active downtime incidents requiring fix'}
          </div>
        </div>
      </div>

      {/* Response Time Chart (Last 24h / 7d / 30d) with Anomaly Outlier Markers */}
      <ResponseTimeChart isDark={isDark} anomalies={anomalies} />

      {/* Favorite Sites Section */}
      <div
        className={`rounded-xl border p-4 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-inherit gap-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Favorite Sites
            </h2>
            <span className="rounded-full bg-neutral-800 px-2 py-0.2 text-[10px] font-mono text-neutral-300 font-semibold">
              {favorites.length} / 20
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {onCheckAllFavorites && (
              <button
                type="button"
                onClick={async () => {
                  setIsCheckingFavs(true);
                  try {
                    await onCheckAllFavorites();
                  } finally {
                    setIsCheckingFavs(false);
                  }
                }}
                disabled={isCheckingFavs || favorites.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isCheckingFavs ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isCheckingFavs ? 'Checking...' : 'Check All Favorites'}</span>
              </button>
            )}

            {onNavigateToFavorites && (
              <button
                type="button"
                onClick={onNavigateToFavorites}
                className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Favorites</span>
                <ChevronDown className="h-3 w-3 -rotate-90" />
              </button>
            )}
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500">
            <Star className="h-5 w-5 text-neutral-600 mx-auto mb-1.5" />
            <p className="font-semibold text-neutral-400">Star a website to see it here.</p>
            <p className="mt-0.5 text-[11px]">Click the star icon (☆) on any monitor or URL check result to pin your favorite sites here.</p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favorites.map(fav => {
              const matchedMonitor = monitors.find(m =>
                m.url.replace(/\/+$/, '').toLowerCase() === fav.url.replace(/\/+$/, '').toLowerCase()
              );

              return (
                <div
                  key={fav.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    fav.pinned
                      ? isDark
                        ? 'border-amber-500/30 bg-neutral-950/60 ring-1 ring-amber-500/10'
                        : 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-400/10'
                      : isDark
                      ? 'border-neutral-800/80 bg-neutral-950/40'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          fav.lastStatus === 'up'
                            ? 'bg-emerald-500'
                            : fav.lastStatus === 'blocked'
                            ? 'bg-amber-400'
                            : fav.lastStatus === 'down'
                            ? 'bg-rose-500 animate-pulse'
                            : 'bg-neutral-500'
                        }`}
                        title={fav.lastStatus}
                      />
                      <span className="font-bold text-xs truncate text-neutral-900 dark:text-neutral-100">
                        {fav.name}
                      </span>
                      {fav.pinned && (
                        <span title="Pinned">
                          <Pin className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {fav.lastResponseTimeMs > 0 && (
                        <span className="font-mono text-[11px] text-neutral-400">
                          {fav.lastResponseTimeMs}ms
                        </span>
                      )}
                      {onToggleStar && (
                        <StarButton
                          isStarred={true}
                          onToggle={() => onToggleStar({ url: fav.url, name: fav.name })}
                          size="xs"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-neutral-500 truncate">
                    <span className="truncate">{fav.url}</span>
                    {onCheckFavorite && (
                      <button
                        type="button"
                        onClick={() => onCheckFavorite(fav.id)}
                        className="ml-2 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                        title="Check now"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-inherit">
                    <FavoriteSmartTips
                      favorite={fav}
                      monitor={matchedMonitor}
                      onEnableWatch={onToggleWatch}
                      compact
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Monitor Table Section */}
      <div
        className={`rounded-xl border transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        {/* Table Filter Toolbar */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-inherit">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'all', label: `All (${totalCount})` },
              { id: 'up', label: `Up (${upCount})` },
              { id: 'blocked', label: `Blocked (${blockedCount})` },
              { id: 'down', label: `Down (${downCount})` },
              { id: 'watched', label: `Watched (${monitors.filter(m => m.isWatched).length})` },
              { id: 'paused', label: `Paused (${pausedCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? isDark
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'bg-emerald-50 text-emerald-800 font-semibold'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Tag Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search monitors or URL..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-44 sm:w-56 rounded-lg border py-1.5 pl-8 pr-2.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-500'
                    : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400'
                }`}
              />
            </div>

            {allTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-300' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <option value="all">All Tags</option>
                {allTags.map(t => (
                  <option key={t} value={t}>
                    Tag: {t}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Monitors List / Rows */}
        <div className="divide-y divide-inherit">
          {filteredMonitors.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="mx-auto h-8 w-8 text-neutral-400" />
              <div className="mt-2 text-sm font-medium">No monitors found</div>
              <p className="mt-1 text-xs text-neutral-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Start tracking your endpoints by adding your first monitor.'}
              </p>
              <button
                onClick={onOpenAddModal}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
              >
                Add Your First Monitor
              </button>
            </div>
          ) : (
            filteredMonitors.map((m) => {
              const isChecking = checkingIds.has(m.id);
              const isExpanded = expandedMonitorId === m.id;

              return (
                <div
                  key={m.id}
                  className={`p-4 transition-colors ${
                    m.status === 'down'
                      ? isDark
                        ? 'bg-rose-950/10'
                        : 'bg-rose-50/40'
                      : isDark
                      ? 'hover:bg-neutral-800/40'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {/* Left: Status badge, Name, URL, Tags */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Status indicator badge */}
                      <div className="mt-0.5">
                        {m.status === 'up' && (
                          <span
                            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            title="Operational"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Up
                          </span>
                        )}
                        {m.status === 'blocked' && (
                          <span
                            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            title={m.lastStatusReason || "Server is online but blocked automated checks (401/403/429/Bot Protection)"}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Blocked
                          </span>
                        )}
                        {m.status === 'down' && (
                          <span
                            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse"
                            title={m.lastStatusReason || "Server Down / Incident"}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Down
                          </span>
                        )}
                        {m.status === 'paused' && (
                          <span
                            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold bg-neutral-500/15 text-neutral-400 border border-neutral-500/30"
                            title="Checks Paused"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                            Paused
                          </span>
                        )}
                        {m.status === 'pending' && (
                          <span className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold bg-neutral-500/15 text-neutral-400 border border-neutral-500/30">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {onToggleStar && (
                            <StarButton
                              isStarred={isStarred ? isStarred(m.url) : false}
                              onToggle={() =>
                                onToggleStar({
                                  url: m.url,
                                  name: m.name,
                                  status: m.status === 'paused' ? 'pending' : m.status,
                                  responseTimeMs: m.responseTimeMs,
                                  statusCode: m.status === 'up' ? 200 : m.status === 'blocked' ? 403 : 0
                                })
                              }
                              size="xs"
                              className="shrink-0"
                            />
                          )}
                          <h3 className="font-semibold text-sm truncate text-neutral-900 dark:text-neutral-100">
                            {m.name}
                          </h3>
                          {m.isWatched && (
                            <span className="flex items-center gap-1 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 px-1.5 py-0.2 text-[10px] font-semibold">
                              <Eye className="h-3 w-3" />
                              Watching
                            </span>
                          )}
                          {m.backOnlineAt && (
                            <span className="rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-mono">
                              Back Online at {m.backOnlineAt}
                            </span>
                          )}
                          {m.maintenanceMode && (
                            <span className="rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 text-[10px]">
                              Maintenance
                            </span>
                          )}
                        </div>

                        {/* Status reason message if blocked or down */}
                        {m.status === 'blocked' && (
                          <div className="mt-1 space-y-0.5">
                            <div className="text-[11px] font-semibold text-amber-400 font-mono">
                              Reason: {m.lastStatusReason || 'HTTP 403 Forbidden, likely bot protection'}
                            </div>
                            <div className="text-[10px] text-amber-500/90 font-sans">
                              Server is online but blocked automated checks. Try a custom User-Agent or accepted status codes.
                            </div>
                          </div>
                        )}
                        {m.status === 'down' && m.lastStatusReason && (
                          <div className="mt-0.5 text-[11px] text-rose-400 font-mono">
                            Reason: {m.lastStatusReason}
                          </div>
                        )}

                        {/* Unboxed metadata line with typographic separators */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          <a
                            href={m.url.startsWith('http') ? m.url : `http://${m.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-emerald-500 font-mono text-[11px] truncate max-w-xs transition-colors"
                          >
                            <span>{m.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{m.type}</span>
                          {m.port && <span>(port {m.port})</span>}
                          <span aria-hidden="true">·</span>
                          <span>Interval: {m.intervalMinutes}m</span>
                          {m.tags.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{m.tags.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Latency & Last Checked */}
                    <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                      <div className="text-right">
                        <div className="text-neutral-400 text-[11px]">Response Time</div>
                        <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                          {m.status === 'down' ? (
                            <span className="text-rose-500">Timeout</span>
                          ) : (
                            `${m.responseTimeMs} ms`
                          )}
                        </div>
                      </div>

                      <div className="text-right hidden sm:block">
                        <div className="text-neutral-400 text-[11px]">Last Checked</div>
                        <div className="text-neutral-700 dark:text-neutral-300">
                          {m.lastCheckedAt
                            ? new Date(m.lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : 'Just now'}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                      {/* Check Now Button */}
                      <button
                        onClick={() => onCheckNow(m.id)}
                        disabled={isChecking}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          isDark
                            ? 'border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300'
                            : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                        } ${isChecking ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title="Check endpoint right now"
                      >
                        <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin text-emerald-500' : ''}`} />
                        <span>Check</span>
                      </button>

                      {/* Watch Button (Prominently featured when Down, or anytime) */}
                      <button
                        onClick={() => onToggleWatch(m.id)}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          m.isWatched
                            ? 'border-sky-500/50 bg-sky-500/10 text-sky-400 font-semibold'
                            : m.status === 'down'
                            ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-semibold'
                            : isDark
                            ? 'border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300'
                            : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                        }`}
                        title={
                          m.isWatched
                            ? 'Watch is active: high-frequency 30s checks'
                            : 'Watch this server: notify immediately when it comes back online'
                        }
                      >
                        <Eye className="h-3 w-3" />
                        <span>{m.isWatched ? 'Watching' : 'Watch'}</span>
                      </button>

                      {/* Pause / Resume */}
                      <button
                        onClick={() => onTogglePause(m.id, m.status === 'paused')}
                        className={`rounded-lg border p-1.5 text-xs transition-colors ${
                          isDark
                            ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400'
                            : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                        title={m.status === 'paused' ? 'Resume monitoring' : 'Pause monitoring'}
                      >
                        {m.status === 'paused' ? <Play className="h-3.5 w-3.5 text-emerald-500" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>

                      {/* Mobile QR Pass Button */}
                      {onOpenMonitorQr && (
                        <button
                          onClick={() => onOpenMonitorQr(m)}
                          className={`rounded-lg border p-1.5 text-xs transition-colors ${
                            isDark
                              ? 'border-neutral-800 hover:bg-neutral-800 text-emerald-400 hover:text-emerald-300'
                              : 'border-slate-200 hover:bg-slate-100 text-emerald-600'
                          }`}
                          title="Generate QR Code & Mobile Status Pass"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => onEditMonitor(m)}
                        className={`rounded-lg border p-1.5 text-xs transition-colors ${
                          isDark
                            ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400'
                            : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                        title="Edit Monitor"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteMonitor(m.id)}
                        className={`rounded-lg border p-1.5 text-xs text-rose-400 transition-colors ${
                          isDark
                            ? 'border-neutral-800 hover:bg-rose-950/30'
                            : 'border-slate-200 hover:bg-rose-50'
                        }`}
                        title="Delete Monitor"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Expand 90d uptime details */}
                      <button
                        onClick={() => setExpandedMonitorId(isExpanded ? null : m.id)}
                        className={`rounded-lg border p-1.5 text-xs transition-colors ${
                          isDark
                            ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400'
                            : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                        title={isExpanded ? 'Hide 90-day history' : 'Show 90-day history'}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* 90-day Uptime Bar Strip (Collapsed or Expanded) */}
                  <div className="mt-3 pt-3 border-t border-inherit">
                    <UptimeBar90Days
                      monitorId={m.id}
                      status={m.status}
                      uptime90d={m.uptime90d}
                      isDark={isDark}
                    />

                    {/* Additional Expanded Details */}
                    {isExpanded && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-inherit text-xs font-mono">
                        <div className="p-2 rounded bg-neutral-950/40 border border-inherit">
                          <span className="text-neutral-500">24h Uptime:</span>{' '}
                          <strong className="text-emerald-500">{m.uptime24h}%</strong>
                        </div>
                        <div className="p-2 rounded bg-neutral-950/40 border border-inherit">
                          <span className="text-neutral-500">7d Uptime:</span>{' '}
                          <strong className="text-emerald-500">{m.uptime7d}%</strong>
                        </div>
                        <div className="p-2 rounded bg-neutral-950/40 border border-inherit">
                          <span className="text-neutral-500">30d Uptime:</span>{' '}
                          <strong className="text-emerald-500">{m.uptime30d}%</strong>
                        </div>
                        <div className="p-2 rounded bg-neutral-950/40 border border-inherit">
                          <span className="text-neutral-500">SSL Status:</span>{' '}
                          <strong className={m.sslInfo?.warning14Days ? 'text-amber-500' : 'text-emerald-500'}>
                            {m.sslInfo?.valid ? `${m.sslInfo.daysRemaining}d valid` : 'N/A'}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
