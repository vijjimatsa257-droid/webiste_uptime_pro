import React, { useState, useRef } from 'react';
import { StatusPageConfig, Monitor, Incident } from '../../types';
import {
  Globe,
  Share2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Eye,
  Settings2,
  Copy,
  Check,
  QrCode,
  Printer,
  Download,
  X,
  Smartphone
} from 'lucide-react';
import { UptimeBar90Days } from '../dashboard/UptimeBar90Days';

interface PublicStatusPageViewProps {
  statusPage: StatusPageConfig;
  onUpdateStatusPage: (updates: Partial<StatusPageConfig>) => Promise<void>;
  monitors: Monitor[];
  incidents: Incident[];
  isDark: boolean;
}

export const PublicStatusPageView: React.FC<PublicStatusPageViewProps> = ({
  statusPage,
  onUpdateStatusPage,
  monitors,
  incidents,
  isDark
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [title, setTitle] = useState(statusPage.title);
  const [description, setDescription] = useState(statusPage.description);
  const [customMessage, setCustomMessage] = useState(statusPage.customMessage || '');
  const [isPublic, setIsPublic] = useState(statusPage.isPublic);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const publishedMonitors = monitors.filter(m =>
    statusPage.publishedMonitorIds.length === 0 || statusPage.publishedMonitorIds.includes(m.id)
  );

  const ongoingIncidents = incidents.filter(i => i.status === 'ongoing');
  const allSystemsOperational = ongoingIncidents.length === 0 && publishedMonitors.every(m => m.status === 'up' || m.status === 'blocked');

  const shareableUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/status/${statusPage.slug}`
    : `https://uptimechecker.pro/status/${statusPage.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await onUpdateStatusPage({
        title,
        description,
        customMessage,
        isPublic
      });
      setViewMode('preview');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* View Switcher & Share Bar */}
      <div
        className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold text-neutral-300">Public Status Page URL:</span>
          <span className="font-mono text-xs text-neutral-500 truncate max-w-xs">{shareableUrl}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isDark ? 'border-neutral-700 bg-neutral-950 text-neutral-200 hover:bg-neutral-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isDark ? 'border-neutral-700 bg-neutral-950 text-emerald-400 hover:bg-neutral-800' : 'border-slate-200 bg-white text-emerald-600 hover:bg-slate-50'
            }`}
            title="Download or Print QR Code"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Show QR</span>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'preview' ? 'edit' : 'preview')}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            {viewMode === 'preview' ? <Settings2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{viewMode === 'preview' ? 'Edit Page Info' : 'Live Preview'}</span>
          </button>
        </div>
      </div>

      {viewMode === 'edit' ? (
        /* Status Page Settings Form */
        <div
          className={`rounded-xl border p-5 transition-colors space-y-4 ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <h3 className="text-sm font-bold">Customize Public Status Page</h3>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Company / Page Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Description / Subtitle</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Notice / Announcement Banner</label>
            <input
              type="text"
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder="e.g. Scheduled maintenance on Sunday 02:00 UTC."
              className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-inherit">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Allow public view without login</span>
            </label>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      ) : (
        /* Live Status Page Preview Container */
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 text-neutral-100 shadow-2xl space-y-6">
          {/* Top Brand bar */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-md">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{statusPage.title}</h1>
                <p className="text-xs text-neutral-400 mt-0.5">{statusPage.description}</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">Live Status Feed</span>
          </div>

          {/* Operational Banner */}
          <div
            className={`flex items-center justify-between rounded-xl p-4 border ${
              allSystemsOperational
                ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {allSystemsOperational ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-rose-500" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {allSystemsOperational ? 'All Systems Fully Operational' : 'Partial Service Disruption'}
                </div>
                <div className="text-xs opacity-80 mt-0.5 font-mono">
                  {statusPage.customMessage || 'No active incidents or scheduled downtime in progress.'}
                </div>
              </div>
            </div>
            <span className="text-xs font-mono opacity-60">99.98% SLA</span>
          </div>

          {/* Services Grid */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 divide-y divide-neutral-800">
            <div className="p-3.5 bg-neutral-900/90 font-semibold text-xs text-neutral-400">
              Published Services ({publishedMonitors.length})
            </div>

            {publishedMonitors.map((m) => (
              <div key={m.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-neutral-200">{m.name}</span>
                    <span className="text-xs text-neutral-500 font-mono ml-2">
                      ({m.uptime90d}% uptime)
                    </span>
                  </div>

                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-mono font-semibold ${
                      m.status === 'up'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : m.status === 'blocked'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {m.status === 'up' && 'OPERATIONAL'}
                    {m.status === 'blocked' && 'REACHABLE (BLOCKED)'}
                    {m.status === 'down' && 'DOWN'}
                    {m.status === 'paused' && 'PAUSED'}
                  </span>
                </div>

                <UptimeBar90Days
                  monitorId={m.id}
                  status={m.status}
                  uptime90d={m.uptime90d}
                  isDark={true}
                />
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="text-center text-xs text-neutral-600 pt-4 border-t border-neutral-900 font-mono">
            Powered by Uptime Checker Pro · Auto-updates every 30 seconds
          </div>
        </div>
      )}

      {/* Status Page QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Status Page QR Pass</h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-white flex flex-col items-center justify-center text-neutral-900">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareableUrl)}&margin=10&color=059669`}
                alt="Status Page QR"
                className="h-44 w-44 object-contain rounded"
              />
              <div className="mt-2 text-xs font-bold text-neutral-900">{title}</div>
              <div className="text-[10px] font-mono text-neutral-500 truncate max-w-xs">{shareableUrl}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 py-2 font-medium text-neutral-200 hover:bg-neutral-700"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print QR</span>
              </button>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareableUrl)}&margin=15&color=059669`}
                target="_blank"
                rel="noreferrer"
                download={`qr-${statusPage.slug}.png`}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PNG</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
