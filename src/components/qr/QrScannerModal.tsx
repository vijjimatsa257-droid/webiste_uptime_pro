import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  QrCode,
  Smartphone,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Zap,
  Send
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScannedUrl: (url: string) => void;
  onLinkedPhone?: (phoneOrToken: string) => void;
  isDark: boolean;
  initialMode?: 'add-monitor' | 'link-phone';
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScannedUrl,
  onLinkedPhone,
  isDark,
  initialMode = 'add-monitor'
}) => {
  const [mode, setMode] = useState<'add-monitor' | 'link-phone'>(initialMode);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedResult(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setScanning(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser. Please use image upload or paste a URL below.');
      setScanning(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Check if BarcodeDetector API is supported in modern Chrome
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const interval = setInterval(async () => {
          if (!videoRef.current || !cameraActive) {
            clearInterval(interval);
            return;
          }
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              handleSuccessScan(rawValue);
              clearInterval(interval);
            }
          } catch {}
        }, 600);
      }
    } catch (err: any) {
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions or upload an image.');
      } else {
        setCameraError('Could not start camera feed. Please use image upload or type the URL.');
      }
    } finally {
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSuccessScan = (result: string) => {
    setScannedResult(result);
    stopCamera();

    setTimeout(() => {
      if (mode === 'add-monitor') {
        onScannedUrl(result);
      } else if (onLinkedPhone) {
        onLinkedPhone(result);
      }
      onClose();
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleSuccessScan(manualInput.trim());
    }
  };

  // Mock demo scanner button for immediate testing
  const handleSimulateScan = (url: string) => {
    handleSuccessScan(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
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
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {mode === 'add-monitor' ? 'Scan QR to Add Monitor' : 'Scan QR to Link Phone'}
              </h3>
              <p className="text-xs text-neutral-500">
                {mode === 'add-monitor'
                  ? 'Point your camera at any URL QR code'
                  : 'Scan Telegram or Push registration code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode switcher tabs */}
        <div className="mt-4 flex rounded-lg p-1 bg-neutral-950/60 border border-inherit text-xs">
          <button
            onClick={() => setMode('add-monitor')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'add-monitor'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Add New Monitor
          </button>
          <button
            onClick={() => setMode('link-phone')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'link-phone'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Link Phone Alerts
          </button>
        </div>

        {/* Camera Viewfinder Box */}
        <div className="mt-4 relative h-64 w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-neutral-800">
          {cameraActive ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <Camera className="h-10 w-10 text-neutral-600 mx-auto" />
              <div className="text-xs text-neutral-400">
                {cameraError || 'Camera feed paused'}
              </div>
              <button
                onClick={startCamera}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-200 hover:bg-neutral-700 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}

          {/* Scanning Box Graphic & Laser */}
          {cameraActive && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="h-44 w-44 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                {/* Corner accents */}
                <span className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-emerald-400" />
                <span className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-emerald-400" />
                <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-emerald-400" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-emerald-400" />
                {/* Laser animation */}
                <div className="h-0.5 w-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-bounce mt-20" />
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-4 text-center animate-in fade-in">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-2 animate-bounce" />
              <div className="text-sm font-bold text-white">QR Code Detected!</div>
              <div className="text-xs font-mono text-emerald-300 mt-1 truncate max-w-xs">{scannedResult}</div>
              <div className="text-[11px] text-emerald-400/80 mt-2">
                {mode === 'add-monitor' ? 'Opening Add Monitor form...' : 'Linking phone channel...'}
              </div>
            </div>
          )}
        </div>

        {/* Demo Fast Scan Simulators */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Quick test samples:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSimulateScan('https://api.github.com')}
              className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
            >
              GitHub API
            </button>
            <button
              onClick={() => handleSimulateScan('https://stripe.com')}
              className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
            >
              Stripe
            </button>
            <button
              onClick={() => handleSimulateScan('tg://resolve?domain=UptimeProBot&start=chat_9812')}
              className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
            >
              Telegram
            </button>
          </div>
        </div>

        {/* Manual URL Input Fallback */}
        <form onSubmit={handleManualSubmit} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            placeholder={
              mode === 'add-monitor'
                ? 'Or paste site URL: https://example.com'
                : 'Or paste Telegram chat ID / phone token'
            }
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className={`flex-1 rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none ${
              isDark
                ? 'border-neutral-800 bg-neutral-950 text-neutral-200 focus:border-emerald-500'
                : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-emerald-500'
            }`}
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <span>Apply</span>
          </button>
        </form>
      </div>
    </div>
  );
};
