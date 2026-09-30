import React, { useState } from 'react';
import { X, QrCode, Smartphone, Copy, Check, ExternalLink, ShieldCheck, BellRing, Camera } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  statusPageSlug?: string;
  onOpenScanner?: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  isDark,
  statusPageSlug = 'global-network',
  onOpenScanner
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'status-page' | 'mobile-dashboard' | 'webhook'>('status-page');

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://uptimechecker.pro';
  
  const targetUrls = {
    'status-page': `${origin}/status/${statusPageSlug}`,
    'mobile-dashboard': `${origin}/?mobile=1`,
    'webhook': `${origin}/api/mobile-alerts/connect`
  };

  const currentUrl = targetUrls[activeTab];
  // Encode for QR code display via reliable SVG QR service
  const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}&margin=10&color=059669`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
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
              <h3 className="text-base font-bold tracking-tight">Mobile QR Diagnostic & Alerts</h3>
              <p className="text-xs text-neutral-500">Scan with your phone camera to inspect live</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="mt-4 flex rounded-lg p-1 bg-neutral-950/60 border border-inherit text-xs">
          <button
            onClick={() => setActiveTab('status-page')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'status-page'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Status Page
          </button>
          <button
            onClick={() => setActiveTab('mobile-dashboard')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'mobile-dashboard'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Mobile View
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'webhook'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Push Alerts
          </button>
        </div>

        {/* QR Code Graphic Box */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-inner">
          <img
            src={qrCodeImgSrc}
            alt="Mobile Access QR Code"
            className="h-48 w-48 object-contain rounded-md"
            loading="lazy"
          />
          <div className="mt-2 text-center text-[11px] font-mono text-neutral-700 flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
            <span>Point camera to open link on mobile</span>
          </div>
        </div>

        {/* URL Box & Copy */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-950/50 border border-inherit px-3 py-2 text-xs font-mono">
          <span className="truncate text-neutral-400 mr-2">{currentUrl}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-[11px] text-neutral-300 hover:text-white transition-colors shrink-0"
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

        {/* Info note & Scanner Launcher */}
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex items-start gap-2 text-xs text-neutral-500">
            <BellRing className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              When scanned, mobile browsers receive real-time push alerts and live status updates without needing an app store download.
            </p>
          </div>

          {onOpenScanner && (
            <button
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Use Camera to Scan QR (Add Monitor / Link Phone)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
