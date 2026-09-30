import React, { useState, useMemo } from 'react';
import { ScreenshotItem, Monitor, ScreenshotIgnoredRegion } from '../../types';
import { api } from '../../services/api';
import {
  Camera,
  Layers,
  Sliders,
  Maximize2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Monitor as MonitorIcon,
  Smartphone,
  ExternalLink,
  Plus,
  X,
  Eye,
  SplitSquareVertical,
  Flame,
  Check
} from 'lucide-react';

interface ScreenshotComparisonViewProps {
  monitors: Monitor[];
  screenshots: ScreenshotItem[];
  isDark: boolean;
  onRefreshScreenshots: () => void;
  onUpdateScreenshot: (shot: ScreenshotItem) => void;
  onDeleteScreenshot: (id: string) => void;
  onUpdateMonitor?: (monitor: Monitor) => void;
}

export const ScreenshotComparisonView: React.FC<ScreenshotComparisonViewProps> = ({
  monitors,
  screenshots,
  isDark,
  onRefreshScreenshots,
  onUpdateScreenshot,
  onDeleteScreenshot,
  onUpdateMonitor
}) => {
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>(
    screenshots[0]?.monitorId || monitors[0]?.id || ''
  );
  const [customUrl, setCustomUrl] = useState('');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay-slider' | 'diff-highlight'>('side-by-side');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0-100
  const [capturing, setCapturing] = useState(false);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [newRegionLabel, setNewRegionLabel] = useState('');
  const [showAddRegion, setShowAddRegion] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState<number>(10);

  // Filter shots for active monitor
  const monitorShots = useMemo(() => {
    return screenshots.filter(s => s.monitorId === selectedMonitorId);
  }, [screenshots, selectedMonitorId]);

  // Baseline shot for this monitor
  const baselineShot = useMemo(() => {
    return monitorShots.find(s => s.isBaseline) || monitorShots[monitorShots.length - 1] || null;
  }, [monitorShots]);

  // Active comparison shot
  const activeShot = useMemo(() => {
    if (selectedShotId) {
      const found = monitorShots.find(s => s.id === selectedShotId);
      if (found) return found;
    }
    // Default to the newest non-baseline or newest overall
    const nonBaseline = monitorShots.find(s => !s.isBaseline);
    return nonBaseline || monitorShots[0] || null;
  }, [monitorShots, selectedShotId]);

  const handleCapture = async () => {
    setCapturing(true);
    try {
      let mId = selectedMonitorId;
      let url = customUrl.trim();
      if (!url && mId) {
        const m = monitors.find(x => x.id === mId);
        if (m) url = m.url;
      }

      const newShot = await api.captureScreenshot({
        monitorId: mId || undefined,
        url: url || undefined,
        schedule: 'manual'
      });
      onUpdateScreenshot(newShot);
      setSelectedShotId(newShot.id);
      setActionSuccess(`Captured visual snapshot for ${newShot.monitorName} (${newShot.diffPercent}% delta)`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      setActionSuccess('Screenshot capture encountered an error.');
      setTimeout(() => setActionSuccess(null), 4000);
    } finally {
      setCapturing(false);
    }
  };

  const handleSetBaseline = async (shotId: string) => {
    try {
      await api.setScreenshotBaseline(shotId);
      onRefreshScreenshots();
      setActionSuccess('Design baseline screenshot updated.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      // ignore
    }
  };

  const handleAddIgnoredRegion = async () => {
    if (!newRegionLabel.trim() || !activeShot) return;
    const newReg: ScreenshotIgnoredRegion = {
      id: 'ign_' + Date.now(),
      x: 10,
      y: 10,
      width: 250,
      height: 80,
      label: newRegionLabel.trim()
    };
    const updatedRegions = [...(activeShot.ignoredRegions || []), newReg];
    try {
      await api.updateScreenshotIgnoredRegions(activeShot.id, updatedRegions);
      onRefreshScreenshots();
      setNewRegionLabel('');
      setShowAddRegion(false);
      setActionSuccess(`Added ignored region: "${newReg.label}"`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {}
  };

  const handleRemoveIgnoredRegion = async (regionId: string) => {
    if (!activeShot) return;
    const updated = (activeShot.ignoredRegions || []).filter(r => r.id !== regionId);
    try {
      await api.updateScreenshotIgnoredRegions(activeShot.id, updated);
      onRefreshScreenshots();
    } catch {}
  };

  // Image URLs based on device
  const baselineImg = baselineShot
    ? deviceView === 'desktop'
      ? baselineShot.desktopImageUrl
      : baselineShot.mobileImageUrl
    : null;

  const currentImg = activeShot
    ? deviceView === 'desktop'
      ? activeShot.desktopImageUrl
      : activeShot.mobileImageUrl
    : null;

  const highlightImg = activeShot?.highlightDiffUrl || currentImg;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/15 p-3.5 text-xs text-indigo-300 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-indigo-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                Website Screenshot Comparison
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  HEADLESS CHROMIUM
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Automated multi-device visual regression testing, pixel-diff heatmaps, and defacement cross-verification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefreshScreenshots()}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
            <span>Sync Snapshots</span>
          </button>
        </div>
      </div>

      {/* Top Configuration & Capture Bar */}
      <div
        className={`rounded-xl border p-4 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {/* Target Monitor */}
          <div>
            <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1">
              Monitored Target
            </label>
            <select
              value={selectedMonitorId}
              onChange={(e) => {
                setSelectedMonitorId(e.target.value);
                setSelectedShotId(null);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium focus:outline-none ${
                isDark
                  ? 'border-neutral-800 bg-neutral-950 text-neutral-200 focus:border-indigo-500'
                  : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-indigo-500'
              }`}
            >
              {monitors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1">
              Capture Cadence
            </label>
            <select
              defaultValue="daily"
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium focus:outline-none ${
                isDark
                  ? 'border-neutral-800 bg-neutral-950 text-neutral-200 focus:border-indigo-500'
                  : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-indigo-500'
              }`}
            >
              <option value="hourly">Hourly Headless Render</option>
              <option value="daily">Daily Visual Snapshot</option>
              <option value="weekly">Weekly Baseline Audit</option>
              <option value="manual">Manual On-Demand Only</option>
            </select>
          </div>

          {/* Alert Threshold */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                Diff Alert Threshold
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400">{alertThreshold}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Capture Button */}
          <div>
            <button
              onClick={handleCapture}
              disabled={capturing || !selectedMonitorId}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Camera className={`h-3.5 w-3.5 ${capturing ? 'animate-spin' : ''}`} />
              <span>{capturing ? 'Capturing Render...' : 'Capture Snapshot Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Visual Comparison Workbench */}
      <div
        className={`rounded-xl border overflow-hidden transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        {/* Mode Toolbar */}
        <div className="p-4 border-b border-inherit flex flex-wrap items-center justify-between gap-3 bg-neutral-950/30">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'side-by-side'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <SplitSquareVertical className="h-3.5 w-3.5" />
              <span>Side-by-Side</span>
            </button>

            <button
              onClick={() => setViewMode('overlay-slider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'overlay-slider'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Overlay Slider</span>
            </button>

            <button
              onClick={() => setViewMode('diff-highlight')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'diff-highlight'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Highlighted Diff</span>
            </button>
          </div>

          {/* Device Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 rounded-lg p-1">
              <button
                onClick={() => setDeviceView('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  deviceView === 'desktop'
                    ? 'bg-neutral-800 text-neutral-100 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Desktop (1280x800)"
              >
                <MonitorIcon className="h-3.5 w-3.5" />
                <span className="text-[11px]">Desktop</span>
              </button>

              <button
                onClick={() => setDeviceView('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  deviceView === 'mobile'
                    ? 'bg-neutral-800 text-neutral-100 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Mobile (375x667)"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="text-[11px]">Mobile</span>
              </button>
            </div>

            {/* Visual Diff badge */}
            {activeShot && (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                    activeShot.diffPercent > alertThreshold
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : activeShot.diffPercent > 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {activeShot.diffPercent > alertThreshold ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>{activeShot.diffPercent}% Visual Diff</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Canvas Display */}
        <div className="p-6 flex items-center justify-center bg-neutral-950/70 min-h-[460px]">
          {!baselineImg || !currentImg ? (
            <div className="text-center text-xs text-neutral-400 py-12">
              <Camera className="mx-auto h-12 w-12 text-neutral-600 mb-2" />
              <p>No visual snapshots recorded yet for this monitor.</p>
              <button
                onClick={handleCapture}
                className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 cursor-pointer"
              >
                Capture First Baseline Now
              </button>
            </div>
          ) : (
            <div className="w-full max-w-4xl">
              {/* 1. Side by side view */}
              {viewMode === 'side-by-side' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Trusted Baseline
                      </span>
                      <span className="font-mono text-[11px]">
                        {baselineShot ? new Date(baselineShot.timestamp).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div
                      className={`relative overflow-hidden rounded-xl border border-emerald-500/30 shadow-lg ${
                        deviceView === 'mobile' ? 'max-w-[280px] mx-auto' : ''
                      }`}
                    >
                      <img
                        src={baselineImg}
                        alt="Baseline Screenshot"
                        className="w-full h-auto object-cover rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-semibold text-indigo-400 flex items-center gap-1">
                        <Camera className="h-3.5 w-3.5" />
                        Latest Snapshot
                      </span>
                      <span className="font-mono text-[11px]">
                        {activeShot ? new Date(activeShot.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    <div
                      className={`relative overflow-hidden rounded-xl border border-indigo-500/30 shadow-lg ${
                        deviceView === 'mobile' ? 'max-w-[280px] mx-auto' : ''
                      }`}
                    >
                      <img
                        src={currentImg}
                        alt="Current Screenshot"
                        className="w-full h-auto object-cover rounded-xl"
                      />
                      {activeShot?.ignoredRegions?.map((reg) => (
                        <div
                          key={reg.id}
                          className="absolute border border-amber-400 bg-amber-400/20 rounded pointer-events-none"
                          style={{
                            left: `${reg.x}px`,
                            top: `${reg.y}px`,
                            width: `${reg.width}px`,
                            height: `${reg.height}px`
                          }}
                        >
                          <span className="absolute top-0 left-0 bg-amber-500 text-black font-mono text-[9px] px-1 font-bold">
                            Ignored: {reg.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Interactive Overlay Slider */}
              {viewMode === 'overlay-slider' && (
                <div className="space-y-4">
                  <div
                    className={`relative mx-auto select-none overflow-hidden rounded-xl border border-neutral-700 shadow-2xl ${
                      deviceView === 'mobile' ? 'max-w-[320px]' : 'max-w-3xl'
                    }`}
                    style={{ aspectRatio: deviceView === 'mobile' ? '9/16' : '16/10' }}
                  >
                    {/* Underlying Live Screenshot */}
                    <img
                      src={currentImg}
                      alt="Current"
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Clip-Path Baseline Screenshot */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${sliderPosition}%` }}
                    >
                      <img
                        src={baselineImg}
                        alt="Baseline"
                        className="absolute inset-0 w-full h-full object-cover max-w-none"
                        style={{ width: deviceView === 'mobile' ? '320px' : '768px' }}
                      />
                    </div>

                    {/* Divider Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-10 flex items-center justify-center cursor-ew-resize"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="h-8 w-8 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center -ml-4 border-2 border-white">
                        <Sliders className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Range input to slide */}
                  <div className="max-w-md mx-auto space-y-1">
                    <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                      <span>Baseline ({sliderPosition}%)</span>
                      <span>Latest Snapshot ({100 - sliderPosition}%)</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliderPosition}
                      onChange={(e) => setSliderPosition(Number(e.target.value))}
                      className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* 3. Highlighted Diff */}
              {viewMode === 'diff-highlight' && (
                <div className="space-y-2 max-w-3xl mx-auto">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                      <Flame className="h-4 w-4" />
                      Visual Pixel Diff Heatmap Overlay
                    </span>
                    <span className="font-mono text-neutral-400">
                      Delta: <strong className="text-rose-400 font-bold">{activeShot?.diffPercent}%</strong>
                    </span>
                  </div>

                  <div
                    className={`relative overflow-hidden rounded-xl border border-rose-500/40 shadow-xl ${
                      deviceView === 'mobile' ? 'max-w-[320px] mx-auto' : ''
                    }`}
                  >
                    <img
                      src={highlightImg || currentImg}
                      alt="Visual Diff Highlight"
                      className="w-full h-auto object-cover filter contrast-125"
                    />
                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] font-mono text-rose-300 border border-rose-500/40">
                      Changed Pixels Highlighted
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ignored Regions Manager Bar */}
        <div className="p-4 border-t border-inherit bg-neutral-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-neutral-400">Ignored Regions:</span>
            {activeShot?.ignoredRegions && activeShot.ignoredRegions.length > 0 ? (
              activeShot.ignoredRegions.map((reg) => (
                <span
                  key={reg.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30"
                >
                  <span>{reg.label}</span>
                  <button
                    onClick={() => handleRemoveIgnoredRegion(reg.id)}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-neutral-500 italic">None configured</span>
            )}

            {showAddRegion ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Ad Banner / Clock"
                  value={newRegionLabel}
                  onChange={(e) => setNewRegionLabel(e.target.value)}
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:outline-none"
                />
                <button
                  onClick={handleAddIgnoredRegion}
                  className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAddRegion(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddRegion(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-neutral-300 hover:text-white border border-neutral-700 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Region to Ignore</span>
              </button>
            )}
          </div>

          {activeShot && !activeShot.isBaseline && (
            <button
              onClick={() => handleSetBaseline(activeShot.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Promote This Shot to Baseline</span>
            </button>
          )}
        </div>
      </div>

      {/* Snapshot History Gallery */}
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-4 border-inherit">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold">Snapshot Gallery & Audit Timeline</h3>
            <span className="text-xs text-neutral-500 font-mono">
              ({monitorShots.length} captured renders)
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {monitorShots.map((shot) => {
            const isSelected = activeShot?.id === shot.id;

            return (
              <div
                key={shot.id}
                onClick={() => setSelectedShotId(shot.id)}
                className={`group relative rounded-xl border p-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                    : isDark
                    ? 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-inherit">
                  <img
                    src={shot.desktopImageUrl}
                    alt={shot.timestamp}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {shot.isBaseline && (
                    <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-bold shadow-xs">
                      BASELINE
                    </span>
                  )}
                  {shot.diffPercent > 0 && !shot.isBaseline && (
                    <span
                      className={`absolute top-1.5 right-1.5 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        shot.diffPercent > alertThreshold
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-black'
                      }`}
                    >
                      {shot.diffPercent}% diff
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-400 text-[11px]">
                    {new Date(shot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScreenshot(shot.id);
                      }}
                      className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
                      title="Delete snapshot"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  {new Date(shot.timestamp).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
