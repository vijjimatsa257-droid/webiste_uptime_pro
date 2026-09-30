import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../../services/api';
import { BulkCheckResult, BulkGroup, Monitor } from '../../types';
import { NavTab } from '../layout/Sidebar';
import { jsPDF } from 'jspdf';
import { StarButton } from '../common/StarButton';
import {
  Zap,
  Globe,
  Upload,
  Download,
  FileText,
  Play,
  Square,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
  Plus,
  Bookmark,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  Sliders,
  FileSpreadsheet,
  Trash2,
  Check,
  Loader2
} from 'lucide-react';

interface BulkCheckViewProps {
  isDark: boolean;
  onAddMonitorFromUrl: (url: string, name: string) => void;
  onBulkAddMonitors: (monitors: Partial<Monitor>[]) => Promise<void>;
  onToggleWatch?: (id: string) => Promise<void>;
  existingMonitors?: Monitor[];
  onNavigateToTab?: (tab: NavTab) => void;
  isStarred?: (url: string) => boolean;
  onToggleStar?: (site: {
    url: string;
    name?: string;
    status?: any;
    responseTimeMs?: number;
    statusCode?: number;
    sslDaysRemaining?: number | null;
  }) => Promise<void>;
}

interface ParsedUrlItem {
  raw: string;
  cleaned: string;
  isValid: boolean;
  isDuplicate: boolean;
}

export const BulkCheckView: React.FC<BulkCheckViewProps> = ({
  isDark,
  onAddMonitorFromUrl,
  onBulkAddMonitors,
  onToggleWatch,
  existingMonitors = [],
  isStarred,
  onToggleStar
}) => {
  // Input state
  const [inputText, setInputText] = useState<string>(
    'https://api.github.com\nhttps://news.ycombinator.com\nhttps://cloudflare.com\nhttps://httpstat.us/200\nhttps://httpstat.us/403\nhttps://httpstat.us/500'
  );

  // Settings state
  const [method, setMethod] = useState<'GET' | 'HEAD'>('GET');
  const [timeoutSec, setTimeoutSec] = useState<number>(10);
  const [concurrency, setConcurrency] = useState<number>(10);
  const [checkSsl, setCheckSsl] = useState<boolean>(true);
  const [saveToLogs, setSaveToLogs] = useState<boolean>(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [acceptedStatusCodes, setAcceptedStatusCodes] = useState<string>('');
  const [customUserAgent, setCustomUserAgent] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  // Execution state
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ checked: number; total: number }>({ checked: 0, total: 0 });
  const [results, setResults] = useState<BulkCheckResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filter & Search state
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'blocked' | 'down'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'index' | 'url' | 'classification' | 'statusCode' | 'responseTimeMs' | 'sslDaysRemaining' | 'checkedAt'>('index');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Selection for bulk monitor addition
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddingMonitors, setIsAddingMonitors] = useState<boolean>(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Saved Groups state
  const [savedGroups, setSavedGroups] = useState<BulkGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isSaveGroupModalOpen, setIsSaveGroupModalOpen] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [isSavingGroup, setIsSavingGroup] = useState<boolean>(false);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved groups on mount
  useEffect(() => {
    api.getBulkGroups().then(groups => setSavedGroups(groups)).catch(() => {});
  }, []);

  // Parse and auto-clean input URLs
  const { validUrls, invalidCount, duplicateCount, isOverLimit, allParsed } = useMemo(() => {
    if (!inputText.trim()) {
      return { validUrls: [], invalidCount: 0, duplicateCount: 0, isOverLimit: false, allParsed: [] };
    }

    // Split by newlines, commas, or whitespace
    const tokens = inputText
      .split(/[\r\n,]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const seenClean = new Set<string>();
    const parsedList: ParsedUrlItem[] = [];
    const validList: string[] = [];
    let dups = 0;
    let invalids = 0;

    tokens.forEach(tok => {
      // Space separated split inside token if any
      const subTokens = tok.split(/\s+/).filter(Boolean);
      subTokens.forEach(sub => {
        let clean = sub.trim();
        if (!clean) return;

        // Auto-add https:// if missing
        if (!/^https?:\/\//i.test(clean)) {
          clean = 'https://' + clean;
        }

        // Validate basic URL
        let isValid = false;
        try {
          const urlObj = new URL(clean);
          isValid = Boolean(urlObj.hostname && urlObj.hostname.includes('.'));
        } catch {
          isValid = false;
        }

        if (!isValid) {
          invalids++;
          parsedList.push({ raw: sub, cleaned: clean, isValid: false, isDuplicate: false });
          return;
        }

        if (seenClean.has(clean.toLowerCase())) {
          dups++;
          parsedList.push({ raw: sub, cleaned: clean, isValid: true, isDuplicate: true });
        } else {
          seenClean.add(clean.toLowerCase());
          parsedList.push({ raw: sub, cleaned: clean, isValid: true, isDuplicate: false });
          validList.push(clean);
        }
      });
    });

    const isOver = validList.length > 100;
    const cappedValid = isOver ? validList.slice(0, 100) : validList;

    return {
      validUrls: cappedValid,
      invalidCount: invalids,
      duplicateCount: dups,
      isOverLimit: isOver,
      allParsed: parsedList
    };
  }, [inputText]);

  // Summary Metrics
  const summary = useMemo(() => {
    if (results.length === 0) {
      return { total: 0, up: 0, blocked: 0, down: 0, avgLatency: 0, fastestId: null, slowestId: null };
    }

    const up = results.filter(r => r.classification === 'up').length;
    const blocked = results.filter(r => r.classification === 'blocked').length;
    const down = results.filter(r => r.classification === 'down').length;

    const latencies = results.filter(r => r.classification === 'up' && r.responseTimeMs > 0);
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((acc, r) => acc + r.responseTimeMs, 0) / latencies.length)
      : 0;

    // Identify fastest & slowest up/reachable sites
    let fastestId: string | null = null;
    let slowestId: string | null = null;
    let minLat = Infinity;
    let maxLat = -1;

    results.forEach(r => {
      if (r.classification === 'up' || r.classification === 'blocked') {
        if (r.responseTimeMs > 0 && r.responseTimeMs < minLat) {
          minLat = r.responseTimeMs;
          fastestId = r.id;
        }
        if (r.responseTimeMs > maxLat) {
          maxLat = r.responseTimeMs;
          slowestId = r.id;
        }
      }
    });

    return { total: results.length, up, blocked, down, avgLatency, fastestId, slowestId };
  }, [results]);

  // Filtered & Sorted Results
  const displayResults = useMemo(() => {
    let filtered = results.filter(r => {
      if (statusFilter !== 'all' && r.classification !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUrl = r.url.toLowerCase().includes(q) || r.cleanUrl.toLowerCase().includes(q);
        const matchesReason = r.reason.toLowerCase().includes(q);
        const matchesCode = String(r.statusCode).includes(q);
        if (!matchesUrl && !matchesReason && !matchesCode) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'index') {
        comparison = results.indexOf(a) - results.indexOf(b);
      } else if (sortField === 'url') {
        comparison = a.cleanUrl.localeCompare(b.cleanUrl);
      } else if (sortField === 'classification') {
        comparison = a.classification.localeCompare(b.classification);
      } else if (sortField === 'statusCode') {
        comparison = a.statusCode - b.statusCode;
      } else if (sortField === 'responseTimeMs') {
        comparison = a.responseTimeMs - b.responseTimeMs;
      } else if (sortField === 'sslDaysRemaining') {
        const sslA = a.sslDaysRemaining ?? 9999;
        const sslB = b.sslDaysRemaining ?? 9999;
        comparison = sslA - sslB;
      } else if (sortField === 'checkedAt') {
        comparison = new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime();
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [results, statusFilter, searchQuery, sortField, sortDirection]);

  // Execute Bulk Check
  const handleStartCheck = async (urlsToCheck: string[] = validUrls) => {
    if (urlsToCheck.length === 0) return;

    setIsChecking(true);
    setProgress({ checked: 0, total: urlsToCheck.length });

    // Initial placeholder items in results table
    const initialPlaceholders: BulkCheckResult[] = urlsToCheck.map((u, i) => ({
      id: `bulk_pending_${i}`,
      url: u,
      cleanUrl: u,
      classification: 'pending',
      statusCode: 0,
      responseTimeMs: 0,
      reason: 'Queued for probe...',
      checkedAt: new Date().toISOString()
    }));
    setResults(initialPlaceholders);
    setSelectedIds(new Set());

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await api.bulkCheckStream(
        {
          urls: urlsToCheck,
          method,
          timeoutMs: timeoutSec * 1000,
          concurrency,
          acceptedStatusCodes: acceptedStatusCodes.trim() || undefined,
          customUserAgent: customUserAgent.trim() || undefined,
          keyword: keyword.trim() || undefined,
          checkSsl,
          saveToLogs
        },
        ({ index, result, progress: prog }) => {
          setProgress(prog);
          setResults(prev => {
            const next = [...prev];
            if (index < next.length) {
              next[index] = result;
            } else {
              next.push(result);
            }
            return next;
          });
        },
        ({ totalChecked, total }) => {
          setProgress({ checked: totalChecked, total });
          setIsChecking(false);
          abortControllerRef.current = null;
        },
        (err) => {
          console.error('Bulk check error:', err);
          setIsChecking(false);
          abortControllerRef.current = null;
        },
        controller.signal
      );
    } catch {
      setIsChecking(false);
      abortControllerRef.current = null;
    }
  };

  // Stop check
  const handleStopCheck = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsChecking(false);
  };

  // Retry Failed
  const handleRetryFailed = () => {
    const failedUrls = results
      .filter(r => r.classification === 'down' || r.classification === 'blocked')
      .map(r => r.cleanUrl);
    if (failedUrls.length > 0) {
      handleStartCheck(failedUrls);
    }
  };

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Strip out header if CSV
        let cleanText = content;
        if (/^url,/i.test(cleanText.trim()) || /^url\b/i.test(cleanText.trim())) {
          const lines = cleanText.split('\n');
          cleanText = lines.slice(1).join('\n');
        }
        setInputText(cleanText);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const sample = `URL,Description,Category
https://api.github.com,GitHub Core API,Developer Tools
https://news.ycombinator.com,Hacker News,Community
https://cloudflare.com,Cloudflare CDN,Infrastructure
https://httpstat.us/200,Healthy HTTP 200 Probe,Test Suite
https://httpstat.us/403,Forbidden / Bot Protection,Test Suite
https://httpstat.us/500,Server Error 500 Simulation,Test Suite
https://httpstat.us/504,Gateway Timeout Simulation,Test Suite`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample-bulk-urls.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (displayResults.length === 0) return;

    const headers = ['Index', 'URL', 'Status', 'HTTP Code', 'Response Time (ms)', 'SSL Days Left', 'Reason / Error', 'Checked At'];
    const rows = displayResults.map((r, i) => [
      i + 1,
      `"${r.cleanUrl.replace(/"/g, '""')}"`,
      `"${r.classification.toUpperCase()}"`,
      r.statusCode,
      r.responseTimeMs,
      r.sslDaysRemaining !== null && r.sslDaysRemaining !== undefined ? r.sslDaysRemaining : 'N/A',
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${new Date(r.checkedAt).toISOString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bulk-check-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const handleExportPdf = () => {
    if (displayResults.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header styling
    doc.setFillColor(15, 23, 42); // dark slate
    doc.rect(0, 0, pageWidth, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Uptime Checker Pro — Bulk Website Health Audit', 40, 36);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString()} | Method: ${method} | Timeout: ${timeoutSec}s`, pageWidth - 260, 36);

    // Summary box
    doc.setFillColor(248, 250, 252);
    doc.rect(40, 75, pageWidth - 80, 50, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, 75, pageWidth - 80, 50, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Checked: ${summary.total}`, 60, 95);
    doc.setTextColor(16, 185, 129); // green
    doc.text(`UP: ${summary.up}`, 180, 95);
    doc.setTextColor(217, 119, 6); // amber
    doc.text(`Reachable / Blocked: ${summary.blocked}`, 260, 95);
    doc.setTextColor(239, 68, 68); // red
    doc.text(`DOWN: ${summary.down}`, 430, 95);
    doc.setTextColor(51, 65, 85);
    doc.text(`Avg Latency: ${summary.avgLatency} ms`, 530, 95);

    // Table Header
    let yPos = 145;
    doc.setFillColor(241, 245, 249);
    doc.rect(40, yPos, pageWidth - 80, 20, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    doc.text('#', 45, yPos + 14);
    doc.text('URL', 70, yPos + 14);
    doc.text('Status', 280, yPos + 14);
    doc.text('HTTP', 360, yPos + 14);
    doc.text('Latency', 410, yPos + 14);
    doc.text('SSL Days', 470, yPos + 14);
    doc.text('Diagnosis / Reason', 540, yPos + 14);

    yPos += 26;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    displayResults.slice(0, 45).forEach((r, idx) => {
      if (yPos > 540) {
        doc.addPage();
        yPos = 40;
      }

      // Alternate row backgrounds
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, yPos - 10, pageWidth - 80, 18, 'F');
      }

      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), 45, yPos + 3);

      doc.setTextColor(15, 23, 42);
      const truncatedUrl = r.cleanUrl.length > 36 ? r.cleanUrl.substring(0, 36) + '...' : r.cleanUrl;
      doc.text(truncatedUrl, 70, yPos + 3);

      if (r.classification === 'up') {
        doc.setTextColor(16, 185, 129);
        doc.text('UP (Operational)', 280, yPos + 3);
      } else if (r.classification === 'blocked') {
        doc.setTextColor(217, 119, 6);
        doc.text('Reachable, Blocked', 280, yPos + 3);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.text('DOWN', 280, yPos + 3);
      }

      doc.setTextColor(71, 85, 105);
      doc.text(r.statusCode > 0 ? String(r.statusCode) : '—', 360, yPos + 3);
      doc.text(`${r.responseTimeMs} ms`, 410, yPos + 3);
      doc.text(r.sslDaysRemaining !== null && r.sslDaysRemaining !== undefined ? `${r.sslDaysRemaining}d` : '—', 470, yPos + 3);

      const truncatedReason = (r.reason || '').length > 42 ? (r.reason || '').substring(0, 42) + '...' : (r.reason || '');
      doc.text(truncatedReason, 540, yPos + 3);

      yPos += 18;
    });

    doc.save(`bulk-check-audit-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Add all selected as monitors
  const handleAddSelectedMonitors = async () => {
    const selectedResults = displayResults.filter(r => selectedIds.has(r.id));
    if (selectedResults.length === 0) return;

    setIsAddingMonitors(true);
    try {
      const toAdd: Partial<Monitor>[] = selectedResults.map(r => {
        let name = r.cleanUrl.replace(/^https?:\/\//i, '').split('/')[0];
        return {
          name,
          url: r.cleanUrl,
          type: 'http',
          intervalMinutes: 5,
          status: r.classification === 'up' ? 'up' : r.classification === 'blocked' ? 'blocked' : 'down',
          lastCheckedAt: new Date().toISOString(),
          responseTimeMs: r.responseTimeMs,
          uptime24h: r.classification === 'down' ? 95 : 100,
          uptime7d: r.classification === 'down' ? 98 : 100,
          uptime30d: 100,
          uptime90d: 100,
          tags: ['Bulk Added'],
          maintenanceMode: false,
          isWatched: false,
          notificationChannels: { email: true, browser: true, sound: true }
        };
      });

      await onBulkAddMonitors(toAdd);
      setAddedToast(`Successfully added ${toAdd.length} monitors to your dashboard!`);
      setSelectedIds(new Set());
      setTimeout(() => setAddedToast(null), 4000);
    } finally {
      setIsAddingMonitors(false);
    }
  };

  // Save current URL list as named group
  const handleSaveGroup = async () => {
    if (!newGroupName.trim() || validUrls.length === 0) return;
    setIsSavingGroup(true);
    try {
      const saved = await api.saveBulkGroup(newGroupName.trim(), validUrls);
      setSavedGroups(prev => [saved, ...prev.filter(g => g.id !== saved.id)]);
      setIsSaveGroupModalOpen(false);
      setNewGroupName('');
      setAddedToast(`Group "${saved.name}" saved with ${saved.urls.length} URLs!`);
      setTimeout(() => setAddedToast(null), 4000);
    } finally {
      setIsSavingGroup(false);
    }
  };

  // Load a saved group
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const grp = savedGroups.find(g => g.id === groupId);
    if (grp) {
      setInputText(grp.urls.join('\n'));
    }
  };

  // Delete saved group
  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteBulkGroup(groupId);
    setSavedGroups(prev => prev.filter(g => g.id !== groupId));
    if (selectedGroupId === groupId) {
      setSelectedGroupId('');
    }
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === displayResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayResults.map(r => r.id)));
    }
  };

  // Toggle single selection
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Sort helper
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-neutral-900/95 p-3.5 text-xs text-emerald-300 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* Hero Header */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0 mt-0.5">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Bulk Website Check & Parallel Audit
                </h1>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  High-Concurrency
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Batch test up to 100 domains simultaneously with streaming edge probes, SSL inspection, and false-alarm prevention.
              </p>
            </div>
          </div>

          {/* Quick Preset Groups */}
          {savedGroups.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Bookmark className="h-3 w-3 text-emerald-400" />
                <span>Presets:</span>
              </span>
              {savedGroups.map(grp => (
                <button
                  key={grp.id}
                  onClick={() => handleSelectGroup(grp.id)}
                  className={`group relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    selectedGroupId === grp.id
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold'
                      : isDark
                      ? 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{grp.name}</span>
                  <span className="text-[10px] opacity-60">({grp.urls.length})</span>
                  <button
                    onClick={(e) => handleDeleteGroup(grp.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 ml-1 transition-opacity"
                    title="Delete group"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1. Input Options Zone */}
        <div className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
              <span>Target URLs (paste one per line, comma or space-separated):</span>
            </label>

            <div className="flex items-center gap-2">
              {/* File Upload Hidden Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload CSV / TXT</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              rows={5}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="https://example.com&#10;https://api.github.com&#10;https://cloudflare.com"
              className={`w-full rounded-xl border p-3.5 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 leading-relaxed ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
              }`}
            />
          </div>

          {/* Live Validation & Cleanup Counter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${
                  validUrls.length > 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <strong>{validUrls.length} valid URLs</strong>
              </span>

              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-400 border border-rose-500/20 font-medium">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>{invalidCount} invalid</span>
                </span>
              )}

              {duplicateCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-400 border border-amber-500/20 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{duplicateCount} duplicate removed</span>
                </span>
              )}

              {isOverLimit && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-300 border border-rose-500/30 font-bold">
                  Max 100 URLs per run. Capped to first 100.
                </span>
              )}
            </div>

            {/* Save Group CTA */}
            {validUrls.length > 0 && (
              <button
                type="button"
                onClick={() => setIsSaveGroupModalOpen(true)}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Save this list as named group</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Check Settings Bar */}
        <div className="mt-4 pt-4 border-t border-inherit grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Method selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-400 font-medium">HTTP Method:</span>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              {(['GET', 'HEAD'] as const).map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-1.5 rounded-lg border text-center font-bold transition-colors ${
                    method === m
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : isDark
                      ? 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Timeout */}
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-400 font-medium">Timeout:</span>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
              {[5, 10, 30].map(sec => (
                <button
                  type="button"
                  key={sec}
                  onClick={() => setTimeoutSec(sec)}
                  className={`py-1.5 rounded-lg border text-center font-bold transition-colors ${
                    timeoutSec === sec
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : isDark
                      ? 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Concurrency */}
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-400 font-medium">Parallel Concurrency:</span>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
              {[5, 10, 20].map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setConcurrency(c)}
                  className={`py-1.5 rounded-lg border text-center font-bold transition-colors ${
                    concurrency === c
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : isDark
                      ? 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c}x
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checkSsl}
                onChange={e => setCheckSsl(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-neutral-300">Include SSL Expiry Check</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToLogs}
                onChange={e => setSaveToLogs(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-neutral-300">Save every run to History & Logs</span>
            </label>
          </div>
        </div>

        {/* Collapsible Advanced Settings */}
        <div className="mt-3 pt-3 border-t border-inherit">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-emerald-400" />
            <span>{showAdvancedSettings ? 'Hide Advanced Settings' : 'Custom Headers, Accepted Codes & Keyword Filter'}</span>
            {showAdvancedSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showAdvancedSettings && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in">
              <div>
                <label className="block text-neutral-400 mb-1">Accepted Status Codes</label>
                <input
                  type="text"
                  value={acceptedStatusCodes}
                  onChange={e => setAcceptedStatusCodes(e.target.value)}
                  placeholder="e.g. 200-299, 401, 403"
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Custom User-Agent</label>
                <input
                  type="text"
                  value={customUserAgent}
                  onChange={e => setCustomUserAgent(e.target.value)}
                  placeholder="Defaults to Chrome 128 / macOS"
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Keyword Match in Body</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. operational or healthy"
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Primary Action Buttons & Progress Bar */}
        <div className="mt-5 pt-4 border-t border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {!isChecking ? (
              <button
                type="button"
                onClick={() => handleStartCheck()}
                disabled={validUrls.length === 0}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Check All ({validUrls.length} URLs)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopCheck}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-rose-500 transition-all cursor-pointer"
              >
                <Square className="h-4 w-4 fill-white" />
                <span>Stop Check</span>
              </button>
            )}

            {summary.down + summary.blocked > 0 && !isChecking && (
              <button
                type="button"
                onClick={handleRetryFailed}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Retry Failed ({summary.down + summary.blocked})</span>
              </button>
            )}
          </div>

          {/* Progress Indicator */}
          {isChecking && (
            <div className="flex-1 max-w-md space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">
                  Checking: <strong className="text-emerald-400">{progress.checked}</strong> / {progress.total}
                </span>
                <span className="text-emerald-400 font-bold">
                  {progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.checked / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {/* Total Checked */}
          <div className={`rounded-xl border p-4 transition-colors ${isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'}`}>
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Total Checked</div>
            <div className="mt-1 font-mono text-2xl font-bold text-neutral-100">{summary.total}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">{validUrls.length} configured</div>
          </div>

          {/* Up */}
          <div className={`rounded-xl border p-4 transition-colors ${isDark ? 'border-emerald-500/20 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Operational (UP)</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">{summary.up}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">
              {summary.total > 0 ? `${Math.round((summary.up / summary.total) * 100)}% reliability` : '0%'}
            </div>
          </div>

          {/* Blocked */}
          <div className={`rounded-xl border p-4 transition-colors ${isDark ? 'border-amber-500/20 bg-amber-950/20' : 'border-amber-200 bg-amber-50/50'}`}>
            <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Reachable, Blocked</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-400">{summary.blocked}</div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">401/403/429/WAF</div>
          </div>

          {/* Down */}
          <div className={`rounded-xl border p-4 transition-colors ${isDark ? 'border-rose-500/20 bg-rose-950/20' : 'border-rose-200 bg-rose-50/50'}`}>
            <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" />
              <span>Outages (DOWN)</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-rose-400">{summary.down}</div>
            <div className="text-[10px] text-rose-400/80 mt-0.5">5xx, timeout, DNS, SSL</div>
          </div>

          {/* Average Latency */}
          <div className={`rounded-xl border p-4 transition-colors ${isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'}`}>
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Avg Latency</div>
            <div className="mt-1 font-mono text-2xl font-bold text-neutral-100">
              {summary.avgLatency} <span className="text-xs font-normal text-neutral-400">ms</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">across healthy hosts</div>
          </div>
        </div>
      )}

      {/* 4. Results Table & Actions Toolbar */}
      {results.length > 0 && (
        <div
          className={`rounded-2xl border transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          {/* Action Toolbar */}
          <div className="p-4 sm:p-5 border-b border-inherit flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-neutral-700/60 p-0.5 bg-neutral-950 text-xs">
                {(['all', 'up', 'blocked', 'down'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`rounded-md px-3 py-1 font-medium transition-colors ${
                      statusFilter === tab
                        ? 'bg-neutral-800 text-neutral-100 font-bold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by URL or HTTP code..."
                  className={`w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-slate-50 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Export & Bulk Monitor Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Add selected monitors */}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleAddSelectedMonitors}
                  disabled={isAddingMonitors}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  {isAddingMonitors ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>Add {selectedIds.size} Selected as Monitors</span>
                </button>
              )}

              {/* Export to CSV */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors"
                title="Download CSV report"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              {/* Export to PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors"
                title="Download formatted PDF report"
              >
                <Download className="h-3.5 w-3.5 text-sky-400" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-semibold tracking-wider text-neutral-400 uppercase ${
                  isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={displayResults.length > 0 && selectedIds.size === displayResults.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-12 cursor-pointer select-none" onClick={() => handleSort('index')}>
                    <div className="flex items-center gap-1">
                      <span>#</span>
                      <ArrowUpDown className="h-3 w-3 text-neutral-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => handleSort('url')}>
                    <div className="flex items-center gap-1">
                      <span>Website / URL</span>
                      <ArrowUpDown className="h-3 w-3 text-neutral-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => handleSort('classification')}>
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="h-3 w-3 text-neutral-500" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('statusCode')}>
                    <div className="flex items-center gap-1">
                      <span>HTTP</span>
                      <ArrowUpDown className="h-3 w-3 text-neutral-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => handleSort('responseTimeMs')}>
                    <div className="flex items-center gap-1">
                      <span>Response</span>
                      <ArrowUpDown className="h-3 w-3 text-neutral-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => handleSort('sslDaysRemaining')}>
                    <div className="flex items-center gap-1">
                      <span>SSL Expiry</span>
                      <ArrowUpDown className="h-3 w-3 text-neutral-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Reason / Diagnosis</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {displayResults.map((r, idx) => {
                  const isFastest = r.id === summary.fastestId;
                  const isSlowest = r.id === summary.slowestId && summary.slowestId !== summary.fastestId;
                  const isSelected = selectedIds.has(r.id);

                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isSelected
                          ? isDark
                            ? 'bg-emerald-950/20'
                            : 'bg-emerald-50/50'
                          : isDark
                          ? 'hover:bg-neutral-800/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(r.id)}
                          className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Index */}
                      <td className="py-3 px-3 font-mono text-neutral-500">
                        {idx + 1}
                      </td>

                      {/* URL with clean hostname, Star button, and link */}
                      <td className="py-3 px-4 max-w-xs truncate">
                        <div className="flex items-center gap-1.5">
                          {onToggleStar && (
                            <StarButton
                              isStarred={isStarred ? isStarred(r.cleanUrl) : false}
                              onToggle={() =>
                                onToggleStar({
                                  url: r.cleanUrl,
                                  name: r.cleanUrl.replace(/^https?:\/\//i, '').split('/')[0],
                                  status: r.classification === 'pending' ? 'pending' : r.classification,
                                  responseTimeMs: r.responseTimeMs,
                                  statusCode: r.statusCode,
                                  sslDaysRemaining: r.sslDaysRemaining
                                })
                              }
                              size="xs"
                              className="shrink-0"
                            />
                          )}
                          <a
                            href={r.cleanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-neutral-200 hover:text-emerald-400 truncate flex items-center gap-1"
                          >
                            <span>{r.cleanUrl}</span>
                            <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
                          </a>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {r.classification === 'pending' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-[11px] text-neutral-400 animate-pulse">
                            <Clock className="h-3 w-3" />
                            <span>Checking...</span>
                          </span>
                        ) : r.classification === 'up' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>UP</span>
                          </span>
                        ) : r.classification === 'blocked' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Reachable, Blocked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-400 border border-rose-500/30">
                            <XCircle className="h-3 w-3" />
                            <span>DOWN</span>
                          </span>
                        )}
                      </td>

                      {/* HTTP Code */}
                      <td className="py-3 px-3 font-mono font-bold">
                        {r.statusCode > 0 ? (
                          <span
                            className={
                              r.statusCode < 400
                                ? 'text-emerald-400'
                                : [401, 403, 429].includes(r.statusCode)
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }
                          >
                            {r.statusCode}
                          </span>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>

                      {/* Latency + Fastest/Slowest Tag */}
                      <td className="py-3 px-4">
                        {r.classification === 'pending' ? (
                          <span className="text-neutral-500 font-mono">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className={r.responseTimeMs > 800 ? 'text-amber-400' : 'text-neutral-200'}>
                              {r.responseTimeMs} ms
                            </span>
                            {isFastest && (
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                                Fastest
                              </span>
                            )}
                            {isSlowest && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                                Slowest
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* SSL Expiry */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {r.sslDaysRemaining !== null && r.sslDaysRemaining !== undefined ? (
                          <div className="flex items-center gap-1">
                            {r.sslDaysRemaining < 14 ? (
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span className={r.sslDaysRemaining < 14 ? 'text-amber-400 font-bold' : 'text-neutral-300'}>
                              {r.sslDaysRemaining}d remaining
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500">N/A</span>
                        )}
                      </td>

                      {/* Reason / Diagnosis */}
                      <td className="py-3 px-4 max-w-xs truncate text-[11px]">
                        <span className={r.classification === 'blocked' ? 'text-amber-300' : r.classification === 'down' ? 'text-rose-300' : 'text-neutral-400'}>
                          {r.reason || 'Completed'}
                        </span>
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Track as Monitor */}
                          <button
                            type="button"
                            onClick={() => {
                              const name = r.cleanUrl.replace(/^https?:\/\//i, '').split('/')[0];
                              onAddMonitorFromUrl(r.cleanUrl, name);
                            }}
                            className="rounded-lg border border-neutral-700/60 bg-neutral-950 px-2 py-1 text-[11px] font-medium text-neutral-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
                            title="Add as permanent Monitor"
                          >
                            + Monitor
                          </button>

                          {/* Watch button if Down */}
                          {r.classification === 'down' && onToggleWatch && (
                            <button
                              type="button"
                              onClick={() => {
                                const matched = existingMonitors.find(m => m.url === r.cleanUrl || m.url === r.url);
                                if (matched) {
                                  onToggleWatch(matched.id);
                                } else {
                                  // First add as monitor with watched enabled
                                  const name = r.cleanUrl.replace(/^https?:\/\//i, '').split('/')[0];
                                  onAddMonitorFromUrl(r.cleanUrl, name);
                                }
                              }}
                              className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[11px] font-bold text-sky-400 hover:bg-sky-500/20 transition-colors flex items-center gap-1"
                              title="Watch for recovery alerts"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Watch</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save Group Modal */}
      {isSaveGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 pb-3 border-b border-inherit">
              <Bookmark className="h-5 w-5 text-emerald-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Save URL List as Group
              </h2>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-neutral-400">
                Save these {validUrls.length} URLs so you can run the entire check again anytime with a single click.
              </p>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. My Clients, College Sites, SaaS Core APIs"
                  className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
              <button
                type="button"
                onClick={() => setIsSaveGroupModalOpen(false)}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold ${
                  isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGroup}
                disabled={!newGroupName.trim() || isSavingGroup}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isSavingGroup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save Group</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
