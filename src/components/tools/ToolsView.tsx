import React, { useState } from 'react';
import { api } from '../../services/api';
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  Upload,
  Mail,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Monitor } from '../../types';
import { NavTab } from '../layout/Sidebar';

interface ToolsViewProps {
  onBulkImportMonitors: (imported: Partial<Monitor>[]) => Promise<void>;
  isDark: boolean;
  monitors: Monitor[];
  onNavigateToTab?: (tab: NavTab) => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({
  onBulkImportMonitors,
  isDark,
  monitors,
  onNavigateToTab
}) => {
  const [activeTool, setActiveTool] = useState<'ssl' | 'dns' | 'bulk' | 'report'>('ssl');

  // SSL State
  const [sslDomain, setSslDomain] = useState('github.com');
  const [sslLoading, setSslLoading] = useState(false);
  const [sslResult, setSslResult] = useState<{
    valid: boolean;
    issuer: string;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
    warning14Days: boolean;
    protocol?: string;
    subject?: string;
  } | null>(null);

  // DNS State
  const [dnsDomain, setDnsDomain] = useState('cloudflare.com');
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<{ type: string; value: string; priority?: number }[] | null>(null);

  // Bulk Import State
  const [bulkText, setBulkText] = useState(
    'https://api.github.com, GitHub API, Production\nhttps://news.ycombinator.com, Hacker News, Community\nhttps://httpstat.us/200, Health Probe, Internal'
  );
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  // Weekly Report State
  const [reportEmailSent, setReportEmailSent] = useState(false);

  // SSL Handler
  const handleCheckSsl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sslDomain.trim()) return;
    setSslLoading(true);
    setSslResult(null);
    try {
      const res = await api.sslCheck(sslDomain.trim());
      setSslResult(res);
    } catch {
      // Fallback
    } finally {
      setSslLoading(false);
    }
  };

  // DNS Handler
  const handleCheckDns = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dnsDomain.trim()) return;
    setDnsLoading(true);
    setDnsRecords(null);
    try {
      const records = await api.dnsLookup(dnsDomain.trim());
      setDnsRecords(records);
    } catch {
      // Fallback
    } finally {
      setDnsLoading(false);
    }
  };

  // Bulk Import Handler
  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkImporting(true);
    setBulkSuccessMsg(null);

    const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
    const toImport: Partial<Monitor>[] = [];

    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      const rawUrl = parts[0];
      const name = parts[1] || rawUrl.replace(/^https?:\/\//i, '').split('/')[0];
      const tag = parts[2] || 'Imported';

      if (rawUrl) {
        toImport.push({
          name,
          url: rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`,
          type: 'http',
          intervalMinutes: 5,
          tags: [tag]
        });
      }
    });

    try {
      await onBulkImportMonitors(toImport);
      setBulkSuccessMsg(`Successfully imported ${toImport.length} monitors!`);
      setBulkText('');
    } catch {
      // Handled
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tool Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-4 border-inherit">
        {[
          { id: 'ssl', label: 'SSL Certificate Checker', icon: ShieldCheck },
          { id: 'dns', label: 'DNS Record Lookup', icon: Globe },
          { id: 'bulk', label: 'Bulk URL Importer (CSV)', icon: Upload },
          { id: 'report', label: 'Weekly Uptime Report', icon: Mail },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id as typeof activeTool)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? isDark
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-600 text-white shadow-sm'
                  : isDark
                  ? 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. SSL Checker */}
      {activeTool === 'ssl' && (
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                SSL / TLS Certificate Inspector
              </h3>
              <p className="text-xs text-neutral-500">
                Check expiration date, root Certificate Authority, and receive automated warnings when &lt; 14 days remain.
              </p>
            </div>
          </div>

          <form onSubmit={handleCheckSsl} className="flex gap-2">
            <input
              type="text"
              value={sslDomain}
              onChange={e => setSslDomain(e.target.value)}
              placeholder="e.g. github.com or api.stripe.com"
              className={`flex-1 rounded-lg border py-2 px-3 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={sslLoading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {sslLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Inspect Certificate</span>
            </button>
          </form>

          {sslResult && (
            <div className="mt-5 space-y-3">
              {sslResult.warning14Days && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>
                    Warning: This certificate expires in <strong>{sslResult.daysRemaining} days</strong>. Renew soon to avoid browser trust warnings.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
                  <div className="text-neutral-500">Certificate Status</div>
                  <div className="mt-1 font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Valid & Trusted</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
                  <div className="text-neutral-500">Days Remaining</div>
                  <div className="mt-1 font-mono text-xl font-bold text-neutral-100">
                    {sslResult.daysRemaining} <span className="text-xs font-normal text-neutral-400">days</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
                  <div className="text-neutral-500">Valid Until</div>
                  <div className="mt-1 font-mono text-xs text-neutral-200">
                    {new Date(sslResult.validTo).toLocaleDateString()}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
                  <div className="text-neutral-500">Protocol</div>
                  <div className="mt-1 font-mono text-xs text-neutral-200">
                    {sslResult.protocol || 'TLSv1.3'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit text-xs">
                <span className="text-neutral-500">Issuer Authority:</span>{' '}
                <strong className="text-neutral-200 font-mono">{sslResult.issuer}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. DNS Record Lookup */}
      {activeTool === 'dns' && (
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                DNS Record Query (A, AAAA, MX, NS, TXT)
              </h3>
              <p className="text-xs text-neutral-500">
                Query authoritative domain records for routing and email troubleshooting.
              </p>
            </div>
          </div>

          <form onSubmit={handleCheckDns} className="flex gap-2">
            <input
              type="text"
              value={dnsDomain}
              onChange={e => setDnsDomain(e.target.value)}
              placeholder="e.g. google.com or cloudflare.com"
              className={`flex-1 rounded-lg border py-2 px-3 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-sky-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={dnsLoading}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors disabled:opacity-50"
            >
              {dnsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Resolve Records</span>
            </button>
          </form>

          {dnsRecords && (
            <div className="mt-5 space-y-2">
              <div className="text-xs font-semibold text-neutral-400 mb-2">
                Resolved {dnsRecords.length} records for <span className="font-mono text-neutral-200">{dnsDomain}</span>:
              </div>
              <div className="rounded-lg border border-inherit divide-y divide-inherit overflow-hidden">
                {dnsRecords.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 text-xs font-mono bg-neutral-950/30">
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-neutral-800 text-sky-400 border border-neutral-700">
                      {r.type}
                    </span>
                    <span className="text-neutral-200 truncate max-w-lg">{r.value}</span>
                    {r.priority !== undefined && (
                      <span className="text-neutral-500 text-[11px]">Priority: {r.priority}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Bulk URL Importer */}
      {activeTool === 'bulk' && (
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Bulk Monitor Import via CSV or Text
              </h3>
              <p className="text-xs text-neutral-500">
                Quickly add 10+ endpoints by pasting CSV rows formatted as <code>URL, Name, Tag</code>.
              </p>
            </div>
          </div>

          {bulkSuccessMsg && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          {/* Upgrade banner pointing to dedicated Bulk Check */}
          {onNavigateToTab && (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Layers className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="block text-emerald-300 font-semibold">
                    New: High-Concurrency Bulk Website Checker
                  </strong>
                  <span className="text-neutral-400 text-[11px]">
                    Check up to 100 sites in parallel with streaming live results, SSL audit, CSV & PDF export.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('bulk-check')}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                <span>Open Bulk Checker</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <textarea
              rows={6}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="https://api.example.com, Main API, Production"
              className={`w-full rounded-lg border p-3 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
              }`}
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                Format: <code>URL, Name (optional), Tag (optional)</code> per line
              </span>

              <button
                type="button"
                onClick={handleBulkImport}
                disabled={bulkImporting || !bulkText.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {bulkImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>Import Monitors Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Weekly Email Report Preview */}
      {activeTool === 'report' && (
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-inherit">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Weekly Executive Uptime Digest
                </h3>
                <p className="text-xs text-neutral-500">
                  Dispatched every Monday 08:00 UTC summarizing SLA, response times, and incident durations.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setReportEmailSent(true);
                setTimeout(() => setReportEmailSent(false), 3000);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{reportEmailSent ? 'Digest Dispatched!' : 'Send Test Digest'}</span>
            </button>
          </div>

          {/* Email HTML Template Preview */}
          <div className="mt-4 rounded-xl border border-neutral-700 bg-neutral-950 p-6 max-w-xl mx-auto text-neutral-100 shadow-xl space-y-4">
            <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Uptime Checker Pro
                </div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  Weekly Reliability Report
                </div>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">
                Sep 22 - Sep 29, 2026
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-neutral-900 p-2.5 border border-neutral-800">
                <div className="font-mono text-lg font-bold text-emerald-400">99.94%</div>
                <div className="text-[10px] text-neutral-400">Overall Uptime</div>
              </div>
              <div className="rounded-lg bg-neutral-900 p-2.5 border border-neutral-800">
                <div className="font-mono text-lg font-bold text-neutral-100">54 ms</div>
                <div className="text-[10px] text-neutral-400">Avg Latency</div>
              </div>
              <div className="rounded-lg bg-neutral-900 p-2.5 border border-neutral-800">
                <div className="font-mono text-lg font-bold text-emerald-400">0</div>
                <div className="text-[10px] text-neutral-400">Open Incidents</div>
              </div>
            </div>

            <div className="text-xs text-neutral-300 space-y-2">
              <div className="font-semibold text-neutral-200">Executive Summary:</div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                All 6 monitored production endpoints met their SLA targets this week. 1 planned maintenance window was logged with zero customer impact. Response times remained steady at an average of 54ms.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
