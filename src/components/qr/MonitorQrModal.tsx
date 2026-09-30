import React, { useState, useRef } from 'react';
import {
  X,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  Globe,
  Clock,
  Smartphone,
  Share2
} from 'lucide-react';
import { Monitor } from '../../types';

interface MonitorQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitor: Monitor | null;
  isDark: boolean;
  statusPageSlug?: string;
  onOpenMobilePreview?: (url: string) => void;
}

export const MonitorQrModal: React.FC<MonitorQrModalProps> = ({
  isOpen,
  onClose,
  monitor,
  isDark,
  statusPageSlug = 'global-network',
  onOpenMobilePreview
}) => {
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [expiryOption, setExpiryOption] = useState<'never' | '24h' | '7d' | '30d'>('never');
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !monitor) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://uptimechecker.pro';
  
  // Clean unique short link for this monitor
  const shortId = monitor.id.replace('mon_', '');
  const shortLink = `${origin}/m/${shortId}${expiryOption !== 'never' ? `?exp=${expiryOption}` : ''}`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(shortLink)}&margin=12&color=059669`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shortLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPng = async () => {
    try {
      const response = await fetch(qrImageSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${monitor.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(qrImageSrc, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
          isDark
            ? 'border-neutral-800 bg-neutral-900 text-neutral-100'
            : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Monitor QR & Mobile Pass</h3>
              <p className="text-xs text-neutral-500 truncate max-w-xs">{monitor.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div
          ref={printAreaRef}
          className="mt-4 rounded-xl bg-white p-5 text-neutral-900 shadow-inner flex flex-col items-center justify-center text-center"
        >
          <img
            src={qrImageSrc}
            alt={`QR Code for ${monitor.name}`}
            className="h-48 w-48 object-contain rounded-md"
            loading="lazy"
          />

          <div className="mt-3">
            <div className="text-sm font-bold tracking-tight text-neutral-900">{monitor.name}</div>
            <div className="text-[11px] font-mono text-neutral-500 mt-0.5">{monitor.url}</div>
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-xs font-mono">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              monitor.status === 'up'
                ? 'bg-emerald-100 text-emerald-800'
                : monitor.status === 'blocked'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {monitor.status.toUpperCase()} ({monitor.responseTimeMs}ms)
            </span>
            <span className="text-neutral-400">·</span>
            <span className="text-neutral-600 text-[11px] font-bold">{monitor.uptime30d}% 30d Uptime</span>
          </div>

          <div className="mt-2 text-[10px] font-mono text-neutral-400 flex items-center gap-1">
            <Smartphone className="h-3 w-3 text-emerald-600" />
            <span>Scan with any camera to inspect live without login</span>
          </div>
        </div>

        {/* Access & Expiry Controls */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          {/* Public vs Private */}
          <div className="rounded-lg border border-inherit bg-neutral-950/40 p-2.5">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Access Permission
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-900 text-emerald-500"
              />
              <span className="text-neutral-200">Public (No login required)</span>
            </label>
          </div>

          {/* Expiry Option */}
          <div className="rounded-lg border border-inherit bg-neutral-950/40 p-2.5">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Link Expiration
            </div>
            <select
              value={expiryOption}
              onChange={(e) => setExpiryOption(e.target.value as any)}
              className="w-full bg-transparent text-neutral-200 text-xs focus:outline-none cursor-pointer mt-0.5"
            >
              <option value="never" className="bg-neutral-900 text-white">Permanent (Never expires)</option>
              <option value="24h" className="bg-neutral-900 text-white">Expires in 24 hours</option>
              <option value="7d" className="bg-neutral-900 text-white">Expires in 7 days</option>
              <option value="30d" className="bg-neutral-900 text-white">Expires in 30 days</option>
            </select>
          </div>
        </div>

        {/* Short Link Bar */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-950/50 border border-inherit px-3 py-2 text-xs font-mono">
          <span className="truncate text-neutral-400 mr-2">{shortLink}</span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-[11px] text-neutral-300 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons: Download PNG, Print QR */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleDownloadPng}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-inherit bg-neutral-800/80 hover:bg-neutral-700 py-2 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-neutral-400" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-inherit bg-neutral-800/80 hover:bg-neutral-700 py-2 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-neutral-400" />
            <span>Print QR Card</span>
          </button>

          <a
            href={shortLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Live View</span>
          </a>
        </div>
      </div>
    </div>
  );
};
