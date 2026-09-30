import React, { useState } from 'react';
import { Monitor } from '../../types';
import { soundService } from '../../services/sound';
import {
  Eye,
  Bell,
  Volume2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Play
} from 'lucide-react';

interface WatchManagerProps {
  monitors: Monitor[];
  onToggleWatch: (id: string) => Promise<void>;
  onSimulateRecovery: (id: string) => Promise<void>;
  onCheckNow: (id: string) => Promise<void>;
  isDark: boolean;
}

export const WatchManager: React.FC<WatchManagerProps> = ({
  monitors,
  onToggleWatch,
  onSimulateRecovery,
  onCheckNow,
  isDark
}) => {
  const [testingSound, setTestingSound] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const watchedMonitors = monitors.filter(m => m.isWatched);
  const downMonitorsNotWatched = monitors.filter(m => m.status === 'down' && !m.isWatched);
  const recoveredMonitors = monitors.filter(m => m.backOnlineAt);

  const handleTestSound = () => {
    setTestingSound(true);
    soundService.playRecoveryChime();
    setTimeout(() => setTestingSound(false), 1200);
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Uptime Checker Pro', {
          body: 'Browser push notifications are active! You will be alerted when watched servers recover.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero explanation */}
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isDark
            ? 'border-sky-500/20 bg-gradient-to-r from-sky-950/20 to-neutral-900 text-neutral-100'
            : 'border-sky-200 bg-gradient-to-r from-sky-50 to-white text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Autonomous Server Watcher</h2>
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono text-sky-400 font-semibold uppercase">
                  Zero Polling Fatigue
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-400 max-w-2xl leading-relaxed">
                When an API or server goes down, enable <strong>Watch</strong>. We continuously probe it every 30 seconds.
                The microsecond it returns to 200 OK, we trigger a browser notification and an uplifting audio chime so you can get back to work immediately.
              </p>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={handleTestSound}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title="Play pleasant recovery chime synthesized with Web Audio"
            >
              <Volume2 className={`h-4 w-4 text-sky-400 ${testingSound ? 'animate-bounce' : ''}`} />
              <span>Test Chime</span>
            </button>

            <button
              onClick={handleRequestPushPermission}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span>Enable Browser Alerts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Watches Section */}
      <div
        className={`rounded-xl border transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </div>
            <h3 className="text-sm font-semibold">
              Currently Watched Targets ({watchedMonitors.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            High-frequency checks active: every 30s
          </span>
        </div>

        <div className="divide-y divide-inherit">
          {watchedMonitors.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              <Eye className="mx-auto h-7 w-7 text-neutral-400 mb-2" />
              <div>No servers are currently in watch mode.</div>
              <p className="mt-1 text-[11px] text-neutral-400">
                Turn on Watch on any offline monitor below to begin autonomous tracking.
              </p>
            </div>
          ) : (
            watchedMonitors.map((m) => (
              <div
                key={m.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  isDark ? 'hover:bg-neutral-800/40' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{m.name}</span>
                      <span className="rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold">
                        Watching…
                      </span>
                      {m.status === 'down' ? (
                        <span className="rounded bg-rose-500/20 text-rose-400 px-1.5 py-0.2 text-[10px] font-mono">
                          Offline (Down)
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 text-[10px] font-mono">
                          Back Online
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 font-mono">
                      <span>{m.url}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Watched since:{' '}
                        {m.watchedSince
                          ? new Date(m.watchedSince).toLocaleTimeString()
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Simulate Recovery Button */}
                  <button
                    onClick={async () => {
                      setSimulatingId(m.id);
                      await onSimulateRecovery(m.id);
                      soundService.playRecoveryChime();
                      setSimulatingId(null);
                    }}
                    disabled={simulatingId === m.id}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    title="Simulate instant recovery to test chime, banner, and notifications"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Simulate Recovery</span>
                  </button>

                  <button
                    onClick={() => onCheckNow(m.id)}
                    className={`rounded-lg border p-1.5 text-xs transition-colors ${
                      isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Run check immediately"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => onToggleWatch(m.id)}
                    className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    Stop Watch
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Down Monitors ready to be watched */}
      {downMonitorsNotWatched.length > 0 && (
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 mb-3">
            <AlertTriangle className="h-4 w-4" />
            <span>Down Servers Available for Watch:</span>
          </div>

          <div className="space-y-2">
            {downMonitorsNotWatched.map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border border-inherit bg-neutral-950/40 text-xs"
              >
                <div>
                  <div className="font-semibold text-neutral-200">{m.name}</div>
                  <div className="font-mono text-neutral-500 text-[11px]">{m.url}</div>
                </div>

                <button
                  onClick={() => onToggleWatch(m.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Start Watching</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Recovered Feed */}
      {recoveredMonitors.length > 0 && (
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-3">
            <CheckCircle2 className="h-4 w-4" />
            <span>Recently Recovered Servers:</span>
          </div>

          <div className="space-y-2">
            {recoveredMonitors.map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border border-inherit bg-emerald-950/10 text-xs"
              >
                <div>
                  <div className="font-semibold text-neutral-200">{m.name}</div>
                  <div className="font-mono text-neutral-400 text-[11px]">{m.url}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-xs font-mono font-semibold">
                    Back Online at {m.backOnlineAt}
                  </span>
                  <span className="text-neutral-500 font-mono text-[11px]">
                    Latency: {m.responseTimeMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
