import React, { useState, useMemo } from 'react';
import { CrawlScanResult, CrawlScanItem, Monitor, CrawlItemType, CrawlItemStatus } from '../../types';
import { api } from '../../services/api';
import {
  ScanLine,
  Search,
  Filter,
  Download,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ImageIcon,
  Link2,
  Calendar,
  Layers,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface CrawlerScannerViewProps {
  scans: CrawlScanResult[];
  monitors: Monitor[];
  isDark: boolean;
  onRefreshScans: () => Promise<void>;
  onDeleteScan: (id: string) => Promise<void>;
  onUpdateMonitor?: (id: string, updates: Partial<Monitor>) => Promise<void>;
}

export const CrawlerScannerView: React.FC<CrawlerScannerViewProps> = ({
  scans,
  monitors,
  isDark,
  onRefreshScans,
  onDeleteScan,
  onUpdateMonitor
}) => {
  // Launcher Form State
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedDepth, setSelectedDepth] = useState<number>(1);
  const [checkExternal, setCheckExternal] = useState<boolean>(true);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>('');
  const [schedule, setSchedule] = useState<'manual' | 'weekly' | 'monthly'>('manual');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStatusText, setScanStatusText] = useState<string>('');

  // Selected Scan Viewer (defaults to latest scan)
  const [activeScanId, setActiveScanId] = useState<string | null>(scans[0]?.id || null);

  // Table Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | CrawlItemType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | CrawlItemStatus | 'missing_alt' | 'large_image'>('all');
  const [onlyBroken, setOnlyBroken] = useState(false);

  // Pick current scan or fallback
  const activeScan = useMemo(() => {
    if (!activeScanId && scans.length > 0) return scans[0];
    return scans.find(s => s.id === activeScanId) || scans[0] || null;
  }, [scans, activeScanId]);

  // When monitor is selected in dropdown, populate targetUrl
  const handleSelectMonitor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedMonitorId(id);
    if (id) {
      const mon = monitors.find(m => m.id === id);
      if (mon) {
        setTargetUrl(mon.url);
        if (mon.crawlerConfig) {
          setSelectedDepth(mon.crawlerConfig.depth || 1);
          setCheckExternal(mon.crawlerConfig.checkExternal ?? true);
          setSchedule(mon.crawlerConfig.schedule || 'manual');
        }
      }
    }
  };

  // Launch crawl scan
  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim() || isScanning) return;

    let cleanUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    setIsScanning(true);
    setScanProgress(15);
    setScanStatusText('Connecting and fetching origin HTML...');

    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 400);

    try {
      setTimeout(() => setScanStatusText('Extracting links and image sources...'), 600);
      setTimeout(() => setScanStatusText('Batch dispatching HEAD/GET audits...'), 1200);

      const result = await api.runCrawlerScan({
        url: cleanUrl,
        depth: selectedDepth,
        checkExternal,
        monitorId: selectedMonitorId || undefined
      });

      clearInterval(progressInterval);
      setScanProgress(100);
      setScanStatusText('Scan completed successfully!');

      await onRefreshScans();
      setActiveScanId(result.id);

      // If tied to monitor, update monitor crawler config schedule
      if (selectedMonitorId && onUpdateMonitor) {
        await onUpdateMonitor(selectedMonitorId, {
          crawlerConfig: {
            enabled: true,
            depth: selectedDepth,
            checkExternal,
            schedule,
            lastScanAt: new Date().toISOString(),
            brokenCount: result.brokenLinksCount + result.brokenImagesCount
          }
        });
      }
    } catch {
      clearInterval(progressInterval);
      setScanStatusText('Scan encountered an error or timed out.');
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
        setScanStatusText('');
      }, 1000);
    }
  };

  // Filter items in active scan
  const filteredItems = useMemo(() => {
    if (!activeScan) return [];
    return activeScan.items.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (onlyBroken && item.classification !== 'broken') return false;

      if (filterStatus === 'missing_alt') {
        if (!item.isMissingAlt) return false;
      } else if (filterStatus === 'large_image') {
        if (!item.isLargeImage) return false;
      } else if (filterStatus !== 'all') {
        if (item.classification !== filterStatus) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesUrl = item.url.toLowerCase().includes(q);
        const matchesPage = item.foundOnPage.toLowerCase().includes(q);
        const matchesText = item.anchorOrAltText.toLowerCase().includes(q);
        const matchesErr = (item.error || '').toLowerCase().includes(q);
        if (!matchesUrl && !matchesPage && !matchesText && !matchesErr) return false;
      }

      return true;
    });
  }, [activeScan, filterType, filterStatus, onlyBroken, searchTerm]);

  // Export results as CSV
  const handleExportCSV = () => {
    if (!activeScan || activeScan.items.length === 0) return;

    const headers = ['Type', 'Classification', 'Status Code', 'URL', 'Anchor/Alt Text', 'Found On Page', 'Redirect URL', 'Error Reason', 'Latency (ms)'];
    const rows = filteredItems.map(i => [
      i.type,
      i.classification,
      i.statusCode,
      `"${i.url.replace(/"/g, '""')}"`,
      `"${(i.anchorOrAltText || '').replace(/"/g, '""')}"`,
      `"${i.foundOnPage.replace(/"/g, '""')}"`,
      `"${(i.redirectUrl || '').replace(/"/g, '""')}"`,
      `"${(i.error || '').replace(/"/g, '""')}"`,
      i.responseTimeMs
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crawler_scan_${new URL(activeScan.startUrl).hostname}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format bytes
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-bold tracking-tight">Broken Link & Image Scanner</h1>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
              Site Intelligence
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Deep crawler auditing internal/external hyperlinks, images, 404/5xx broken paths, redirects, and missing alt attributes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefreshScans()}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Launcher & Configuration Form */}
      <div
        className={`rounded-2xl border p-5 shadow-sm transition-all ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b pb-3 border-inherit">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Play className="h-4 w-4 text-emerald-400" />
            <span>Start a Site Scan</span>
          </div>

          {/* Quick Monitor Selector */}
          {monitors.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400 hidden sm:inline">Load from monitor:</span>
              <select
                value={selectedMonitorId}
                onChange={handleSelectMonitor}
                className={`rounded-lg border px-2.5 py-1 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-700 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                <option value="">-- Choose Monitor --</option>
                {monitors.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.url})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <form onSubmit={handleStartScan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Target URL */}
            <div className="md:col-span-6">
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Target Website URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono transition-colors focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100 placeholder-neutral-600' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Crawl Depth */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Crawl Depth
              </label>
              <select
                value={selectedDepth}
                onChange={e => setSelectedDepth(Number(e.target.value))}
                className={`w-full rounded-xl border px-3 py-2.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                }`}
              >
                <option value={1}>This page only (Fast)</option>
                <option value={50}>Crawl up to 50 pages</option>
                <option value={100}>Crawl up to 100 pages</option>
                <option value={500}>Crawl up to 500 pages (Deep)</option>
              </select>
            </div>

            {/* Schedule Scan */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Schedule Scan
              </label>
              <select
                value={schedule}
                onChange={e => setSchedule(e.target.value as any)}
                className={`w-full rounded-xl border px-3 py-2.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                }`}
              >
                <option value="manual">Manual on demand</option>
                <option value="weekly">Weekly automatic scan</option>
                <option value="monthly">Monthly automatic scan</option>
              </select>
            </div>
          </div>

          {/* Options & Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-300">
                <input
                  type="checkbox"
                  checked={checkExternal}
                  onChange={e => setCheckExternal(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Audit external outbound links</span>
              </label>
              <span className="text-[11px] text-neutral-500 hidden md:inline">
                (Respects rate limits & robots.txt rules)
              </span>
            </div>

            <button
              type="submit"
              disabled={isScanning || !targetUrl.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-neutral-950 shadow-sm hover:bg-amber-400 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-950" />
                  <span>Scanning Site...</span>
                </>
              ) : (
                <>
                  <ScanLine className="h-4 w-4" />
                  <span>Scan Now</span>
                </>
              )}
            </button>
          </div>

          {/* Animated Progress Bar */}
          {isScanning && (
            <div className="mt-3 space-y-1.5 pt-2 border-t border-inherit">
              <div className="flex justify-between text-xs font-mono text-neutral-400">
                <span>{scanStatusText}</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 ease-out"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Active Scan Results & Summary */}
      {activeScan ? (
        <div className="space-y-5">
          {/* Summary Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Checked */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Total Items</span>
                <Layers className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <div className="mt-1.5 text-xl font-bold font-mono">
                {activeScan.totalLinksChecked + activeScan.totalImagesChecked}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {activeScan.totalLinksChecked} links · {activeScan.totalImagesChecked} imgs
              </div>
            </div>

            {/* Broken Links */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                activeScan.brokenLinksCount > 0
                  ? isDark
                    ? 'border-rose-500/40 bg-rose-500/10'
                    : 'border-rose-300 bg-rose-50'
                  : isDark
                  ? 'border-neutral-800 bg-neutral-900/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className={activeScan.brokenLinksCount > 0 ? 'text-rose-400 font-semibold' : ''}>Broken Links</span>
                <XCircle className={`h-3.5 w-3.5 ${activeScan.brokenLinksCount > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
              </div>
              <div className={`mt-1.5 text-xl font-bold font-mono ${activeScan.brokenLinksCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeScan.brokenLinksCount}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {activeScan.brokenLinksCount > 0 ? 'Action required' : 'All links healthy'}
              </div>
            </div>

            {/* Broken Images */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                activeScan.brokenImagesCount > 0
                  ? isDark
                    ? 'border-rose-500/40 bg-rose-500/10'
                    : 'border-rose-300 bg-rose-50'
                  : isDark
                  ? 'border-neutral-800 bg-neutral-900/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className={activeScan.brokenImagesCount > 0 ? 'text-rose-400 font-semibold' : ''}>Broken Images</span>
                <ImageIcon className={`h-3.5 w-3.5 ${activeScan.brokenImagesCount > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
              </div>
              <div className={`mt-1.5 text-xl font-bold font-mono ${activeScan.brokenImagesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeScan.brokenImagesCount}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {activeScan.brokenImagesCount > 0 ? 'Asset load failures' : 'All assets ok'}
              </div>
            </div>

            {/* Reachable Blocked (403 / 429) */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                activeScan.blockedCount > 0
                  ? isDark
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-amber-300 bg-amber-50'
                  : isDark
                  ? 'border-neutral-800 bg-neutral-900/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className={activeScan.blockedCount > 0 ? 'text-amber-400 font-semibold' : ''}>Blocked (403/429)</span>
                <ShieldAlert className={`h-3.5 w-3.5 ${activeScan.blockedCount > 0 ? 'text-amber-400' : 'text-neutral-500'}`} />
              </div>
              <div className={`mt-1.5 text-xl font-bold font-mono ${activeScan.blockedCount > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
                {activeScan.blockedCount}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Warning, not failure
              </div>
            </div>

            {/* Redirects (3xx) */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Redirects</span>
                <ArrowRight className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div className="mt-1.5 text-xl font-bold font-mono text-purple-400">
                {activeScan.redirectsCount}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                HTTP 301 / 302
              </div>
            </div>

            {/* Missing Alt / Heavy Images */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
                isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>SEO & Size</span>
                <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
              </div>
              <div className="mt-1.5 text-xl font-bold font-mono text-orange-400">
                {activeScan.items.filter(i => i.isMissingAlt || i.isLargeImage).length}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Alt text / &gt;1MB
              </div>
            </div>
          </div>

          {/* Active Scan Info Bar */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
              isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-300">Scan Origin:</span>
              <a
                href={activeScan.startUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-emerald-400 hover:underline flex items-center gap-1"
              >
                {activeScan.startUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-400 font-mono">
                {new Date(activeScan.startedAt).toLocaleString()}
              </span>
            </div>

            {/* Other Scans Selector */}
            {scans.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Scan History:</span>
                <select
                  value={activeScan.id}
                  onChange={e => setActiveScanId(e.target.value)}
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    isDark ? 'border-neutral-700 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {scans.map(s => (
                    <option key={s.id} value={s.id}>
                      {new URL(s.startUrl).hostname} · {new Date(s.startedAt).toLocaleTimeString()} ({s.brokenLinksCount} broken)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onDeleteScan(activeScan.id)}
                  className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
                  title="Delete this scan history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Table Controls (Search, Filters, Export) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search URLs, text, page..."
                  className={`w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-white text-slate-900'
                  }`}
                />
              </div>

              {/* Type filter */}
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-white text-slate-800'
                }`}
              >
                <option value="all">All Types</option>
                <option value="link">Links only (a href)</option>
                <option value="image">Images only (img src)</option>
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-200 bg-white text-slate-800'
                }`}
              >
                <option value="all">All Classifications</option>
                <option value="broken">Broken (404/5xx)</option>
                <option value="blocked">Blocked (403/429)</option>
                <option value="redirect">Redirect (3xx)</option>
                <option value="ok">OK (2xx)</option>
                <option value="missing_alt">Missing Alt Text</option>
                <option value="large_image">Large Image (&gt;1 MB)</option>
              </select>

              {/* Broken Only Quick Toggle */}
              <button
                type="button"
                onClick={() => setOnlyBroken(!onlyBroken)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  onlyBroken
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-400'
                    : isDark
                    ? 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                Broken Only
              </button>
            </div>

            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isDark ? 'border-neutral-800 bg-neutral-900 text-emerald-400 hover:bg-neutral-800' : 'border-slate-200 bg-white text-emerald-700 hover:bg-slate-50'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Results Table */}
          <div
            className={`rounded-xl border overflow-hidden shadow-xs transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'border-neutral-800 bg-neutral-950/60 text-neutral-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">URL & Found On</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Anchor / Alt Text</th>
                    <th className="py-3 px-4">Latency & Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-500">
                        No crawled links or images matched your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isBroken = item.classification === 'broken';
                      const isBlocked = item.classification === 'blocked';
                      const isRedirect = item.classification === 'redirect';
                      const isOk = item.classification === 'ok';

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isBroken
                              ? isDark
                                ? 'bg-rose-500/5 hover:bg-rose-500/10'
                                : 'bg-rose-50/50 hover:bg-rose-50'
                              : isBlocked
                              ? isDark
                                ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                : 'bg-amber-50/50 hover:bg-amber-50'
                              : isDark
                              ? 'hover:bg-neutral-800/40'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Type */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {item.type === 'link' ? (
                                <Link2 className="h-4 w-4 text-sky-400" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-purple-400" />
                              )}
                              <span className="capitalize text-[11px] text-neutral-400">{item.type}</span>
                            </div>
                          </td>

                          {/* URL & Found On */}
                          <td className="py-3 px-4 max-w-md">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-neutral-200 hover:text-emerald-400 hover:underline truncate max-w-xs sm:max-w-sm block"
                                title={item.url}
                              >
                                {item.url}
                              </a>
                              {item.isNewBroken && (
                                <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-400 border border-rose-500/30">
                                  NEW
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[10px] text-neutral-500 truncate" title={`Found on ${item.foundOnPage}`}>
                              Found on: <span className="font-mono">{item.foundOnPage}</span>
                            </div>
                            {item.redirectUrl && (
                              <div className="mt-0.5 text-[10px] text-purple-400 flex items-center gap-1 truncate font-mono">
                                <span>↳ Redirects to:</span>
                                <span>{item.redirectUrl}</span>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isOk && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{item.statusCode || 200} OK</span>
                              </span>
                            )}
                            {isRedirect && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400 border border-purple-500/20">
                                <ArrowRight className="h-3 w-3" />
                                <span>{item.statusCode} Redirect</span>
                              </span>
                            )}
                            {isBlocked && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20"
                                title="Server reachable but returned 403 or 429 bot defense. Not a failure."
                              >
                                <ShieldAlert className="h-3 w-3" />
                                <span>{item.statusCode || 403} Blocked</span>
                              </span>
                            )}
                            {isBroken && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/20"
                                title={item.error}
                              >
                                <XCircle className="h-3 w-3" />
                                <span>{item.statusCode ? `HTTP ${item.statusCode}` : 'Failed'} Broken</span>
                              </span>
                            )}
                            {item.error && isBroken && (
                              <div className="mt-0.5 text-[10px] text-rose-400/80 truncate max-w-[180px]">
                                {item.error}
                              </div>
                            )}
                          </td>

                          {/* Anchor / Alt Text */}
                          <td className="py-3 px-4 max-w-xs">
                            {item.isMissingAlt ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/30">
                                Missing Alt Text
                              </span>
                            ) : (
                              <span className="text-neutral-300 italic truncate block max-w-[200px]" title={item.anchorOrAltText}>
                                "{item.anchorOrAltText || '-'}"
                              </span>
                            )}
                          </td>

                          {/* Latency & Size */}
                          <td className="py-3 px-4 whitespace-nowrap text-neutral-400 font-mono text-[11px]">
                            <div>{item.responseTimeMs} ms</div>
                            {item.sizeBytes && (
                              <div className={`text-[10px] ${item.isLargeImage ? 'text-amber-400 font-bold' : 'text-neutral-500'}`}>
                                {formatBytes(item.sizeBytes)} {item.isLargeImage && '(>1MB)'}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          className={`rounded-2xl border p-12 text-center transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/40' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <ScanLine className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold">No Site Scans Performed Yet</h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-md mx-auto">
            Run an on-demand audit to crawl pages, test internal/external links, detect 404 dead links, discover broken images, and audit missing alt texts.
          </p>
        </div>
      )}
    </div>
  );
};
