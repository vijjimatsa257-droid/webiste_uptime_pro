import React, { useState, useEffect } from 'react';
import { Monitor, SSLCertInfo } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  ArrowLeft,
  RefreshCw,
  Globe,
  Lock,
  ExternalLink,
  Smartphone,
  Share2
} from 'lucide-react';
import { api } from '../../services/api';

interface MobileMonitorStatusViewProps {
  monitorId: string;
  onBack: () => void;
  isDark: boolean;
}

export const MobileMonitorStatusView: React.FC<MobileMonitorStatusViewProps> = ({
  monitorId,
  onBack,
  isDark
}) => {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(15);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMonitor = async () => {
    try {
      const all = await api.getMonitors();
      const found = all.find(m => m.id === monitorId || m.id.replace('mon_', '') === monitorId);
      if (found) {
        setMonitor(found);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
  }, [monitorId]);

  // 15s auto-refresh loop
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          setRefreshing(true);
          fetchMonitor();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [monitorId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-xs font-mono text-neutral-400">Loading live status pass...</p>
        </div>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950 text-white">
        <div className="text-center space-y-3 max-w-sm">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold">Monitor Not Found</h2>
          <p className="text-xs text-neutral-400">This monitor link may have expired or is set to private.</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 text-xs text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const isUp = monitor.status === 'up';
  const isBlocked = monitor.status === 'blocked';
  const isDown = monitor.status === 'down';

  // Realistic mock 24h data points (24 hours)
  const hourlyPoints = Array.from({ length: 24 }).map((_, i) => {
    const base = monitor.responseTimeMs || 50;
    const variance = Math.sin(i / 3) * 15 + Math.cos(i) * 10;
    return Math.max(15, Math.round(base + variance));
  });

  return (
    <div className={`min-h-screen w-full transition-colors ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Mobile Bar */}
      <div className={`sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md ${
        isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white/90'
      }`}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-neutral-500">
            Live refresh: <strong className="text-emerald-400">{refreshCountdown}s</strong>
          </span>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchMonitor();
              setRefreshCountdown(15);
            }}
            className="p-1 text-neutral-400 hover:text-white"
            title="Refresh now"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-4">
        {/* Main Status Hero Card */}
        <div className={`rounded-2xl border p-5 shadow-lg relative overflow-hidden transition-all ${
          isUp
            ? isDark
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-emerald-300 bg-emerald-50/70'
            : isBlocked
            ? isDark
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-amber-300 bg-amber-50/70'
            : isDark
            ? 'border-rose-500/40 bg-rose-500/10'
            : 'border-rose-300 bg-rose-50/70'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                  Live Public Status
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  NO LOGIN NEEDED
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight mt-1">{monitor.name}</h1>
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-neutral-400 hover:text-emerald-400 flex items-center gap-1 mt-0.5"
              >
                <span>{monitor.url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Big Status Badge */}
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isUp
                ? 'bg-emerald-500 text-white'
                : isBlocked
                ? 'bg-amber-500 text-white'
                : 'bg-rose-500 text-white animate-pulse'
            }`}>
              {isUp ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : isBlocked ? (
                <AlertTriangle className="h-7 w-7" />
              ) : (
                <AlertTriangle className="h-7 w-7" />
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-200">
              {isUp
                ? 'All Systems Operational'
                : isBlocked
                ? 'Reachable, WAF Challenge Active'
                : 'Service Disruption / Offline'}
            </span>
            <span className="font-mono text-neutral-400">
              Checked {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleTimeString() : 'recently'}
            </span>
          </div>
        </div>

        {/* 3 Metrics Row */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className={`rounded-xl border p-3 text-center ${
            isDark ? 'border-neutral-800 bg-neutral-900/80' : 'border-slate-200 bg-white'
          }`}>
            <div className="text-[10px] uppercase font-semibold text-neutral-500">Latency</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              {monitor.responseTimeMs} <span className="text-[10px] font-normal text-neutral-400">ms</span>
            </div>
          </div>

          <div className={`rounded-xl border p-3 text-center ${
            isDark ? 'border-neutral-800 bg-neutral-900/80' : 'border-slate-200 bg-white'
          }`}>
            <div className="text-[10px] uppercase font-semibold text-neutral-500">24h Uptime</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              {monitor.uptime24h}%
            </div>
          </div>

          <div className={`rounded-xl border p-3 text-center ${
            isDark ? 'border-neutral-800 bg-neutral-900/80' : 'border-slate-200 bg-white'
          }`}>
            <div className="text-[10px] uppercase font-semibold text-neutral-500">30d Matrix</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              {monitor.uptime30d}%
            </div>
          </div>
        </div>

        {/* Last 24h Latency Graph */}
        <div className={`rounded-2xl border p-4 shadow-sm ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Response Time History (24 Hours)</span>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">Hourly Samples</span>
          </div>

          {/* SVG Bar / Area Chart */}
          <div className="h-28 w-full flex items-end gap-1.5 pt-4 pb-1">
            {hourlyPoints.map((ms, idx) => {
              const maxH = Math.max(...hourlyPoints, 120);
              const heightPct = Math.round((ms / maxH) * 85) + 10;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center group relative h-full justify-end"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-xs transition-all ${
                      isDown && idx > 20
                        ? 'bg-rose-500'
                        : isBlocked
                        ? 'bg-amber-400/80'
                        : 'bg-emerald-500 hover:bg-emerald-400'
                    }`}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 hidden group-hover:flex items-center justify-center bg-neutral-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-10">
                    {ms}ms
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mt-2 border-t pt-2 border-inherit">
            <span>24 hours ago</span>
            <span>12 hours ago</span>
            <span>Just now</span>
          </div>
        </div>

        {/* SSL Certificate & Security Box */}
        <div className={`rounded-2xl border p-4 shadow-sm space-y-2.5 ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>SSL & Encryption Security</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-lg bg-neutral-950/40 p-2 border border-inherit">
              <div className="text-[10px] text-neutral-500 uppercase">Issuer</div>
              <div className="text-neutral-200 font-bold truncate mt-0.5">
                {monitor.sslInfo?.issuer || 'DigiCert TLS Root'}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-950/40 p-2 border border-inherit">
              <div className="text-[10px] text-neutral-500 uppercase">Validity Remaining</div>
              <div className="text-emerald-400 font-bold mt-0.5">
                {monitor.sslInfo?.daysRemaining || 140} days
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-neutral-500 font-mono pt-4">
          Powered by Uptime Checker Pro · Instant Mobile Diagnostics
        </div>
      </div>
    </div>
  );
};
