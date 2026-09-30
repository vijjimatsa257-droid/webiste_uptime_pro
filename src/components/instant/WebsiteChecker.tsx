import React, { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Zap,
  Globe,
  Clock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Loader2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Star,
  RefreshCw,
  Eye,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Monitor, FavoriteSite } from '../../types';
import { StarButton } from '../common/StarButton';
import { FavoriteSmartTips } from '../favorites/FavoriteSmartTips';

interface WebsiteCheckerProps {
  onAddMonitorFromUrl: (url: string, name: string) => void;
  isDark: boolean;
  favorites: FavoriteSite[];
  isStarred: (url: string) => boolean;
  onToggleStar: (site: {
    url: string;
    name?: string;
    status?: 'up' | 'blocked' | 'down' | 'pending';
    responseTimeMs?: number;
    statusCode?: number;
    sslDaysRemaining?: number | null;
  }) => Promise<void>;
  monitors: Monitor[];
  onCheckAllFavorites: () => Promise<void>;
  onEnableWatch?: (monitorId: string) => void;
}

export const WebsiteChecker: React.FC<WebsiteCheckerProps> = ({
  onAddMonitorFromUrl,
  isDark,
  favorites,
  isStarred,
  onToggleStar,
  monitors,
  onCheckAllFavorites,
  onEnableWatch
}) => {
  const [url, setUrl] = useState('https://api.github.com');
  const [method, setMethod] = useState<'GET' | 'HEAD' | 'POST'>('GET');
  const [keyword, setKeyword] = useState('');
  const [acceptedStatusCodes, setAcceptedStatusCodes] = useState('');
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCheckingAllFavs, setIsCheckingAllFavs] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [result, setResult] = useState<{
    success: boolean;
    classification: 'up' | 'blocked' | 'down';
    isUp: boolean;
    isBlocked: boolean;
    statusCode: number;
    responseTimeMs: number;
    message: string;
    reason: string;
    url: string;
    headers?: Record<string, string>;
    sslInfo?: {
      valid: boolean;
      issuer: string;
      validFrom: string;
      validTo: string;
      daysRemaining: number;
      warning14Days: boolean;
      protocol?: string;
    };
    timestamp: string;
    retriedWithGet?: boolean;
    retriedAfter3s?: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Filter autocomplete suggestions based on current url input
  const autocompleteSuggestions = useMemo(() => {
    const q = url.trim().toLowerCase();
    if (!q) return favorites.slice(0, 6);

    return favorites
      .filter(f => f.name.toLowerCase().includes(q) || f.url.toLowerCase().includes(q))
      .slice(0, 6);
  }, [favorites, url]);

  const validateUrl = (testUrl: string) => {
    let clean = testUrl.trim();
    if (!clean) return 'Please enter a URL or domain';
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    try {
      new URL(clean);
      return null;
    } catch {
      return 'Please enter a valid web address (e.g. https://example.com)';
    }
  };

  const runCheckForUrl = async (targetUrl: string, customAccepted?: string, customAgent?: string) => {
    setUrl(targetUrl);
    setIsInputFocused(false);
    const validationError = validateUrl(targetUrl);
    if (validationError) {
      setErrorMsg(validationError);
      setResult(null);
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    setResult(null);

    let clean = targetUrl.trim();
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }

    try {
      const data = await api.checkUrl(
        clean,
        method,
        keyword ? keyword : undefined,
        customAccepted !== undefined ? customAccepted : (acceptedStatusCodes ? acceptedStatusCodes : undefined),
        customAgent !== undefined ? customAgent : (customUserAgent ? customUserAgent : undefined)
      );
      setResult(data);
      if (!data.success && data.message && data.classification === 'down') {
        setErrorMsg(data.reason || data.message);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setErrorMsg(err.message || 'Unable to complete check request');
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await runCheckForUrl(url);
  };

  const handlePreset = (presetUrl: string, presetCodes?: string) => {
    setUrl(presetUrl);
    if (presetCodes !== undefined) {
      setAcceptedStatusCodes(presetCodes);
    }
    runCheckForUrl(presetUrl, presetCodes);
  };

  const handleCheckAllFavoritesClick = async () => {
    setIsCheckingAllFavs(true);
    try {
      await onCheckAllFavorites();
    } finally {
      setIsCheckingAllFavs(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro banner & Input Form */}
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Instant Website & API Checker
            </h2>
            <p className="text-xs text-neutral-500">
              Classified diagnostics with browser-like headers, HEAD-to-GET fallback, and bot-protection detection.
            </p>
          </div>
        </div>

        {/* Input Form with Autocomplete */}
        <form onSubmit={handleCheck} className="mt-5 space-y-3 relative">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex rounded-lg border border-inherit overflow-hidden">
              <select
                value={method}
                onChange={e => setMethod(e.target.value as typeof method)}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider focus:outline-hidden ${
                  isDark ? 'bg-neutral-950 text-neutral-200' : 'bg-slate-100 text-slate-700'
                }`}
                title="HTTP Method (HEAD automatically falls back to GET if rejected)"
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD (with GET fallback)</option>
                <option value="POST">POST</option>
              </select>
            </div>

            <div className="relative flex-1" ref={autocompleteRef}>
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  setIsInputFocused(true);
                }}
                onFocus={() => setIsInputFocused(true)}
                placeholder="https://example.com or api.service.io/health"
                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              />

              {/* Autocomplete Dropdown while typing */}
              {isInputFocused && autocompleteSuggestions.length > 0 && (
                <div
                  className={`absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border p-1.5 shadow-xl backdrop-blur-md transition-all ${
                    isDark ? 'border-neutral-800 bg-neutral-900/95 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                  }`}
                >
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      Starred Favorites Autocomplete
                    </span>
                    <span className="font-mono text-[9px] text-neutral-500">Click to fill & check</span>
                  </div>

                  <div className="space-y-0.5 mt-0.5">
                    {autocompleteSuggestions.map(fav => (
                      <button
                        key={fav.id}
                        type="button"
                        onClick={() => runCheckForUrl(fav.url)}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="font-bold truncate">{fav.name}</span>
                          <span className="font-mono text-[11px] text-neutral-400 truncate opacity-80">
                            {fav.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {fav.lastStatus === 'up' && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {fav.lastResponseTimeMs ? `${fav.lastResponseTimeMs}ms` : 'Up'}
                            </span>
                          )}
                          {fav.lastStatus === 'blocked' && (
                            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Blocked
                            </span>
                          )}
                          {fav.lastStatus === 'down' && (
                            <span className="flex items-center gap-1 text-[11px] text-rose-400 font-mono">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              Down
                            </span>
                          )}
                          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] text-neutral-300 font-medium">
                            Check Now ⚡
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Check Now</span>
                </>
              )}
            </button>
          </div>

          {/* Advanced Options Toggle */}
          <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-500" />
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Accepted Codes & User-Agent)'}</span>
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400">
              <span>Presets:</span>
              <button
                type="button"
                onClick={() => handlePreset('https://api.github.com', '')}
                className="hover:underline hover:text-emerald-400 font-mono cursor-pointer"
              >
                GitHub (200 Up)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handlePreset('https://httpbin.org/status/403', '')}
                className="hover:underline hover:text-amber-400 font-mono cursor-pointer"
                title="Test Reachable, Blocked (HTTP 403)"
              >
                403 Blocked Test
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handlePreset('https://httpstat.us/500', '')}
                className="hover:underline hover:text-rose-400 font-mono cursor-pointer"
              >
                500 Down
              </button>
            </div>
          </div>

          {/* Collapsible Advanced Form */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 p-3 rounded-lg border border-inherit bg-neutral-950/40 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">
                  Accepted Status Codes (e.g. <code>200-299, 403</code>)
                </label>
                <input
                  type="text"
                  value={acceptedStatusCodes}
                  onChange={e => setAcceptedStatusCodes(e.target.value)}
                  placeholder="e.g. 200-299, 403 (Default: 200-399)"
                  className={`w-full rounded-md border px-2.5 py-1.5 font-mono ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  Codes matching this rule are classified as <strong>Up</strong>.
                </span>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-medium">
                  Custom User-Agent Header
                </label>
                <input
                  type="text"
                  value={customUserAgent}
                  onChange={e => setCustomUserAgent(e.target.value)}
                  placeholder="Default: Chrome 128 (Macintosh)"
                  className={`w-full rounded-md border px-2.5 py-1.5 font-mono ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  Override to bypass bot-detection rules or identify your bot.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-neutral-400 mb-1 font-medium">
                  Keyword Check (Page must contain this text)
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. System Nominal, Copyright 2026, status: OK"
                  className={`w-full rounded-md border px-2.5 py-1.5 font-mono ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
              </div>
            </div>
          )}
        </form>

        {/* Friendly Error message */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <div>
              <strong>Probe Notice: </strong>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Suggestions below the URL box: "⭐ Your Favorites" */}
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-inherit">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Your Favorites
            </h3>
            <span className="rounded-full bg-neutral-800 px-2 py-0.2 text-[10px] font-mono text-neutral-300 font-semibold">
              {favorites.length} / 20
            </span>
            <span className="text-[11px] text-neutral-500 hidden sm:inline">
              · Click any site to fill & check instantly
            </span>
          </div>

          <button
            type="button"
            onClick={handleCheckAllFavoritesClick}
            disabled={isCheckingAllFavs || favorites.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-center"
          >
            <RefreshCw className={`h-3 w-3 ${isCheckingAllFavs ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isCheckingAllFavs ? 'Checking All...' : 'Check all favorites'}</span>
          </button>
        </div>

        {/* Empty State */}
        {favorites.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            <Star className="h-6 w-6 text-neutral-600 mx-auto mb-2" />
            <p className="font-semibold text-neutral-400">Star a website to see it here.</p>
            <p className="mt-1 text-[11px]">Click the star icon (☆) on any check result or monitor card to save your favorite endpoints.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {favorites.map(fav => {
              const matchedMonitor = monitors.find(m =>
                m.url.replace(/\/+$/, '').toLowerCase() === fav.url.replace(/\/+$/, '').toLowerCase()
              );

              return (
                <div
                  key={fav.id}
                  onClick={() => runCheckForUrl(fav.url)}
                  className={`group relative rounded-xl border p-3 transition-all duration-200 cursor-pointer ${
                    isDark
                      ? 'border-neutral-800 bg-neutral-950/60 hover:border-amber-500/50 hover:bg-neutral-950'
                      : 'border-slate-200 bg-slate-50 hover:border-amber-400 hover:bg-white shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Status Dot */}
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          fav.lastStatus === 'up'
                            ? 'bg-emerald-500'
                            : fav.lastStatus === 'blocked'
                            ? 'bg-amber-400'
                            : fav.lastStatus === 'down'
                            ? 'bg-rose-500 animate-pulse'
                            : 'bg-neutral-500'
                        }`}
                        title={fav.lastStatus}
                      />
                      <span className="font-bold text-xs truncate text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-400 transition-colors">
                        {fav.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {fav.lastResponseTimeMs > 0 && (
                        <span className="font-mono text-[11px] text-neutral-400">
                          {fav.lastResponseTimeMs}ms
                        </span>
                      )}
                      <StarButton
                        isStarred={true}
                        onToggle={() => onToggleStar({ url: fav.url, name: fav.name })}
                        size="xs"
                      />
                    </div>
                  </div>

                  <div className="mt-1 truncate font-mono text-[10px] text-neutral-500">
                    {fav.url}
                  </div>

                  {/* Smart suggestion tip for this favorite */}
                  <div className="mt-2.5 pt-2 border-t border-inherit">
                    <FavoriteSmartTips
                      favorite={fav}
                      monitor={matchedMonitor}
                      onEnableWatch={onEnableWatch}
                      onTrackAsMonitor={onAddMonitorFromUrl}
                      onAccept403={() => runCheckForUrl(fav.url, `200-299, ${fav.statusCode || 403}`)}
                      compact
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Classified Result Display Card with Star Button */}
      {result && (
        <div
          className={`rounded-xl border p-5 transition-all ${
            result.classification === 'up'
              ? isDark
                ? 'border-emerald-500/30 bg-neutral-900/90'
                : 'border-emerald-200 bg-white shadow-xs'
              : result.classification === 'blocked'
              ? isDark
                ? 'border-amber-500/40 bg-neutral-900/90'
                : 'border-amber-300 bg-amber-50/50 shadow-xs'
              : isDark
              ? 'border-rose-500/30 bg-neutral-900/90'
              : 'border-rose-200 bg-white shadow-xs'
          }`}
        >
          {/* Status banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-inherit gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
                  result.classification === 'up'
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : result.classification === 'blocked'
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-rose-500/15 text-rose-500'
                }`}
              >
                {result.classification === 'up' && <CheckCircle2 className="h-7 w-7" />}
                {result.classification === 'blocked' && <AlertTriangle className="h-7 w-7" />}
                {result.classification === 'down' && <XCircle className="h-7 w-7" />}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-mono text-xl font-bold ${
                      result.classification === 'up'
                        ? 'text-emerald-500'
                        : result.classification === 'blocked'
                        ? 'text-amber-400'
                        : 'text-rose-500'
                    }`}
                  >
                    {result.classification === 'up' && 'Operational (UP)'}
                    {result.classification === 'blocked' && 'Reachable, Blocked'}
                    {result.classification === 'down' && 'Down (Service Outage)'}
                  </span>

                  <span className="rounded px-2 py-0.5 font-mono text-xs font-semibold bg-neutral-800 text-neutral-200">
                    HTTP {result.statusCode || '0'}
                  </span>

                  {result.retriedWithGet && (
                    <span className="rounded px-2 py-0.5 font-mono text-[10px] bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      HEAD failed → retried with GET
                    </span>
                  )}

                  {result.retriedAfter3s && (
                    <span className="rounded px-2 py-0.5 font-mono text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700">
                      Retried after 3s to confirm
                    </span>
                  )}
                </div>

                {/* Specific Reason */}
                <div className="text-xs font-semibold text-neutral-300 mt-1">
                  Reason: <span className="font-mono text-neutral-100">{result.reason}</span>
                </div>

                {/* Blocked message notice */}
                {result.classification === 'blocked' && (
                  <div className="mt-2.5 space-y-2">
                    <div className="text-xs text-amber-400 leading-relaxed bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <strong>Diagnostic notice: </strong>
                        {result.message}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      <span className="text-neutral-400 text-[11px]">Quick Resolution:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newAccepted = `200-299, ${result.statusCode}`;
                          setAcceptedStatusCodes(newAccepted);
                          setShowAdvanced(true);
                          runCheckForUrl(url, newAccepted, customUserAgent);
                        }}
                        className="rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
                      >
                        Accept HTTP {result.statusCode} as Up
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const botAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
                          setCustomUserAgent(botAgent);
                          setShowAdvanced(true);
                          runCheckForUrl(url, acceptedStatusCodes, botAgent);
                        }}
                        className="rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700 transition-colors cursor-pointer"
                      >
                        Apply Chrome 128 User-Agent
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Star Button + Track as Monitor */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
              <StarButton
                isStarred={isStarred(result.url)}
                onToggle={() => {
                  let host = result.url;
                  try { host = new URL(result.url).hostname; } catch {}
                  onToggleStar({
                    url: result.url,
                    name: host,
                    status: result.classification,
                    responseTimeMs: result.responseTimeMs,
                    statusCode: result.statusCode,
                    sslDaysRemaining: result.sslInfo?.daysRemaining
                  });
                }}
                size="md"
                showText
                className="border border-neutral-700 bg-neutral-950/60 px-3 py-1.5 text-xs rounded-lg"
              />

              <button
                onClick={() => {
                  let host = result.url;
                  try { host = new URL(result.url).hostname; } catch {}
                  onAddMonitorFromUrl(result.url, host);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Track as Monitor</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
              <div className="text-neutral-500">Response Latency</div>
              <div className="mt-1 font-mono text-lg font-bold text-neutral-100 flex items-center gap-1">
                <Clock className="h-4 w-4 text-emerald-500" />
                <span>{result.responseTimeMs} ms</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
              <div className="text-neutral-500">Status Classification</div>
              <div
                className={`mt-1 font-mono text-sm font-bold capitalize ${
                  result.classification === 'up'
                    ? 'text-emerald-400'
                    : result.classification === 'blocked'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {result.classification}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
              <div className="text-neutral-500">Checked At</div>
              <div className="mt-1 font-mono text-xs font-medium text-neutral-300">
                {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950/40 border border-inherit">
              <div className="text-neutral-500">SSL Certificate</div>
              <div className="mt-1 font-mono text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" />
                <span>{result.sslInfo?.valid ? `${result.sslInfo.daysRemaining}d valid` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Smart suggestion for checked URL */}
          <div className="mt-4 pt-3 border-t border-inherit">
            <FavoriteSmartTips
              favorite={{
                id: 'temp_result',
                url: result.url,
                name: result.url,
                createdAt: new Date().toISOString(),
                lastStatus: result.classification,
                lastCheckedAt: result.timestamp,
                lastResponseTimeMs: result.responseTimeMs,
                statusCode: result.statusCode,
                sslDaysRemaining: result.sslInfo?.daysRemaining,
                pinned: false,
                orderIndex: 0
              }}
              monitor={monitors.find(m => m.url.replace(/\/+$/, '').toLowerCase() === result.url.replace(/\/+$/, '').toLowerCase())}
              onEnableWatch={onEnableWatch}
              onTrackAsMonitor={onAddMonitorFromUrl}
              onAccept403={() => {
                const newAccepted = `200-299, ${result.statusCode}`;
                setAcceptedStatusCodes(newAccepted);
                setShowAdvanced(true);
                runCheckForUrl(url, newAccepted, customUserAgent);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
