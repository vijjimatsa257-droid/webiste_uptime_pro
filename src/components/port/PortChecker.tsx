import React, { useState } from 'react';
import { api } from '../../services/api';
import { Radio, CheckCircle2, XCircle, Clock, Plus, Loader2, Server, HelpCircle } from 'lucide-react';

interface PortCheckerProps {
  onAddPortMonitor: (host: string, port: number) => void;
  isDark: boolean;
}

const PORT_PRESETS = [
  { port: 80, name: 'HTTP', desc: 'Standard Web Server' },
  { port: 443, name: 'HTTPS', desc: 'Secure Web Server' },
  { port: 22, name: 'SSH', desc: 'Secure Shell Login' },
  { port: 21, name: 'FTP', desc: 'File Transfer Protocol' },
  { port: 3306, name: 'MySQL', desc: 'Relational Database' },
  { port: 5432, name: 'Postgres', desc: 'PostgreSQL Database' },
  { port: 3000, name: 'Node.js', desc: 'Frontend / Dev Server' },
  { port: 8080, name: 'Web Alt', desc: 'Proxy / Alternate HTTP' }
];

export const PortChecker: React.FC<PortCheckerProps> = ({
  onAddPortMonitor,
  isDark
}) => {
  const [host, setHost] = useState('github.com');
  const [port, setPort] = useState<number>(443);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    host: string;
    port: number;
    open: boolean;
    latencyMs: number;
    error?: string;
    timestamp: string;
  } | null>(null);

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!host.trim() || !port) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await api.checkPort(host.trim(), port);
      setResult(data);
    } catch {
      setResult({
        host,
        port,
        open: false,
        latencyMs: 0,
        error: 'Network probe failed',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Box */}
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              TCP Port & Socket Reachability Scanner
            </h2>
            <p className="text-xs text-neutral-500">
              Verify if remote ports (databases, SSH, web proxies) are accepting socket connections or blocked by firewalls.
            </p>
          </div>
        </div>

        {/* Port Presets Strip */}
        <div className="mt-4 pt-3 border-t border-inherit">
          <div className="text-xs font-semibold text-neutral-400 mb-2">Popular Presets:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PORT_PRESETS.map((p) => {
              const isSelected = port === p.port;
              return (
                <button
                  key={p.port}
                  type="button"
                  onClick={() => setPort(p.port)}
                  className={`flex items-center justify-between rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? isDark
                        ? 'border-sky-500/60 bg-sky-500/10 text-sky-400'
                        : 'border-sky-500 bg-sky-50 text-sky-800'
                      : isDark
                      ? 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 text-neutral-300'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-mono text-xs font-bold">{p.port}</div>
                    <div className="text-[10px] text-neutral-500 truncate">{p.name}</div>
                  </div>
                  <span className="text-[10px] text-neutral-400">{p.desc.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleCheck} className="mt-5 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Server className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              required
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="Host / Domain / IP (e.g. db.example.com or 1.1.1.1)"
              className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-sky-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-slate-50 text-slate-900'
              }`}
            />
          </div>

          <div className="w-32">
            <input
              type="number"
              required
              min="1"
              max="65535"
              value={port}
              onChange={e => setPort(Number(e.target.value))}
              placeholder="Port"
              className={`w-full rounded-lg border py-2 px-3 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-sky-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-slate-50 text-slate-900'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Radio className="h-4 w-4" />
                <span>Test Port</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result Card */}
      {result && (
        <div
          className={`rounded-xl border p-5 transition-all ${
            result.open
              ? isDark
                ? 'border-emerald-500/30 bg-neutral-900/90'
                : 'border-emerald-200 bg-white shadow-xs'
              : isDark
              ? 'border-rose-500/30 bg-neutral-900/90'
              : 'border-rose-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-inherit gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  result.open ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                }`}
              >
                {result.open ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xl font-bold ${
                      result.open ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {result.open ? 'PORT OPEN (Reachable)' : 'PORT CLOSED (Unreachable)'}
                  </span>
                  <span className="rounded px-2 py-0.5 font-mono text-xs font-semibold bg-neutral-800 text-neutral-200">
                    Port {result.port}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 mt-0.5 font-mono">
                  {result.host}:{result.port}
                  {result.error && ` — ${result.error}`}
                </div>
              </div>
            </div>

            <button
              onClick={() => onAddPortMonitor(result.host, result.port)}
              className="flex items-center gap-1.5 self-start sm:self-center rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Track Port in Monitors</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
              <div className="text-neutral-500">Connection Latency</div>
              <div className="mt-1 font-mono text-lg font-bold text-neutral-100 flex items-center gap-1">
                <Clock className="h-4 w-4 text-sky-500" />
                <span>{result.latencyMs} ms</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
              <div className="text-neutral-500">Socket Protocol</div>
              <div className="mt-1 font-mono text-sm font-bold text-neutral-200">
                TCP Full Handshake
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit col-span-2 sm:col-span-1">
              <div className="text-neutral-500">Tested At</div>
              <div className="mt-1 font-mono text-xs font-medium text-neutral-300">
                {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
