import React, { useState, useEffect } from 'react';
import { Monitor, MonitorType } from '../../types';
import { X, Globe, Radio, Search, Activity, ShieldAlert, Check, Loader2, Camera, Sparkles, Wrench } from 'lucide-react';
import { api } from '../../services/api';

interface MonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (monitorData: Partial<Monitor>) => Promise<void>;
  editingMonitor?: Monitor | null;
  isDark: boolean;
}

export const MonitorModal: React.FC<MonitorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMonitor,
  isDark
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<MonitorType>('http');
  const [port, setPort] = useState<number>(443);
  const [keyword, setKeyword] = useState('');
  const [acceptedStatusCodes, setAcceptedStatusCodes] = useState('');
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [tagsStr, setTagsStr] = useState('Production');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifySound, setNotifySound] = useState(true);

  // Site Intelligence Features
  const [contentChangeEnabled, setContentChangeEnabled] = useState(false);
  const [contentChangeInterval, setContentChangeInterval] = useState(60);
  const [contentChangeSelector, setContentChangeSelector] = useState('');
  const [contentChangeIgnoreText, setContentChangeIgnoreText] = useState('');
  const [contentChangeThreshold, setContentChangeThreshold] = useState(10);
  const [contentChangeKeyword, setContentChangeKeyword] = useState('');

  const [crawlerEnabled, setCrawlerEnabled] = useState(false);
  const [crawlerDepth, setCrawlerDepth] = useState(1);
  const [crawlerExternal, setCrawlerExternal] = useState(true);
  const [crawlerSchedule, setCrawlerSchedule] = useState<'manual' | 'weekly' | 'monthly'>('manual');

  const [anomalyEnabled, setAnomalyEnabled] = useState(true);
  const [anomalySensitivity, setAnomalySensitivity] = useState<'low' | 'medium' | 'high'>('medium');

  // Security & Assistant states
  const [defacementEnabled, setDefacementEnabled] = useState(true);
  const [screenshotEnabled, setScreenshotEnabled] = useState(true);
  const [screenshotSchedule, setScreenshotSchedule] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [screenshotThreshold, setScreenshotThreshold] = useState(10);
  const [rootCauseEnabled, setRootCauseEnabled] = useState(true);
  const [autoTroubleshootEnabled, setAutoTroubleshootEnabled] = useState(true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency: number; message: string; classification?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingMonitor) {
      setName(editingMonitor.name);
      setUrl(editingMonitor.url);
      setType(editingMonitor.type);
      setPort(editingMonitor.port || 443);
      setKeyword(editingMonitor.keyword || '');
      setAcceptedStatusCodes(editingMonitor.acceptedStatusCodes || '');
      setCustomUserAgent(editingMonitor.customUserAgent || '');
      setIntervalMinutes(editingMonitor.intervalMinutes);
      setTagsStr(editingMonitor.tags.join(', '));
      setMaintenanceMode(editingMonitor.maintenanceMode);
      setNotifyEmail(editingMonitor.notificationChannels.email);
      setNotifyBrowser(editingMonitor.notificationChannels.browser);
      setNotifySound(editingMonitor.notificationChannels.sound);

      // Site Intelligence configs
      if (editingMonitor.contentChangeConfig) {
        setContentChangeEnabled(editingMonitor.contentChangeConfig.enabled);
        setContentChangeInterval(editingMonitor.contentChangeConfig.intervalMinutes || 60);
        setContentChangeSelector(editingMonitor.contentChangeConfig.selector || '');
        setContentChangeIgnoreText(editingMonitor.contentChangeConfig.ignoreText || '');
        setContentChangeThreshold(editingMonitor.contentChangeConfig.notifyThresholdPercent || 10);
        setContentChangeKeyword(editingMonitor.contentChangeConfig.triggerKeyword || '');
      } else {
        setContentChangeEnabled(false);
        setContentChangeInterval(60);
        setContentChangeSelector('');
        setContentChangeIgnoreText('');
        setContentChangeThreshold(10);
        setContentChangeKeyword('');
      }

      if (editingMonitor.crawlerConfig) {
        setCrawlerEnabled(editingMonitor.crawlerConfig.enabled);
        setCrawlerDepth(editingMonitor.crawlerConfig.depth || 1);
        setCrawlerExternal(editingMonitor.crawlerConfig.checkExternal ?? true);
        setCrawlerSchedule(editingMonitor.crawlerConfig.schedule || 'manual');
      } else {
        setCrawlerEnabled(false);
        setCrawlerDepth(1);
        setCrawlerExternal(true);
        setCrawlerSchedule('manual');
      }

      if (editingMonitor.anomalyConfig) {
        setAnomalyEnabled(editingMonitor.anomalyConfig.enabled ?? true);
        setAnomalySensitivity(editingMonitor.anomalyConfig.sensitivity || 'medium');
      } else {
        setAnomalyEnabled(true);
        setAnomalySensitivity('medium');
      }

      if (editingMonitor.defacementConfig) {
        setDefacementEnabled(editingMonitor.defacementConfig.enabled ?? true);
      } else {
        setDefacementEnabled(true);
      }

      if (editingMonitor.screenshotConfig) {
        setScreenshotEnabled(editingMonitor.screenshotConfig.enabled ?? true);
        setScreenshotSchedule(editingMonitor.screenshotConfig.schedule || 'daily');
        setScreenshotThreshold(editingMonitor.screenshotConfig.thresholdPercent || 10);
      } else {
        setScreenshotEnabled(true);
        setScreenshotSchedule('daily');
        setScreenshotThreshold(10);
      }

      if (editingMonitor.rootCauseConfig) {
        setRootCauseEnabled(editingMonitor.rootCauseConfig.enabled ?? true);
        setAutoTroubleshootEnabled(editingMonitor.rootCauseConfig.autoTroubleshoot ?? true);
      } else {
        setRootCauseEnabled(true);
        setAutoTroubleshootEnabled(true);
      }
    } else {
      setName('');
      setUrl('https://');
      setType('http');
      setPort(443);
      setKeyword('');
      setAcceptedStatusCodes('');
      setCustomUserAgent('');
      setIntervalMinutes(5);
      setTagsStr('Production');
      setMaintenanceMode(false);
      setNotifyEmail(true);
      setNotifyBrowser(true);
      setNotifySound(true);

      // Defaults for new monitor
      setContentChangeEnabled(false);
      setContentChangeInterval(60);
      setContentChangeSelector('');
      setContentChangeIgnoreText('');
      setContentChangeThreshold(10);
      setContentChangeKeyword('');

      setCrawlerEnabled(false);
      setCrawlerDepth(1);
      setCrawlerExternal(true);
      setCrawlerSchedule('manual');

      setAnomalyEnabled(true);
      setAnomalySensitivity('medium');

      setDefacementEnabled(true);
      setScreenshotEnabled(true);
      setScreenshotSchedule('daily');
      setScreenshotThreshold(10);
      setRootCauseEnabled(true);
      setAutoTroubleshootEnabled(true);
    }
    setTestResult(null);
    setError(null);
  }, [editingMonitor, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setError('Please provide a URL or host to test');
      return;
    }
    setError(null);
    setTesting(true);
    setTestResult(null);

    try {
      if (type === 'port') {
        const res = await api.checkPort(url, port);
        setTestResult({
          success: res.open,
          latency: res.latencyMs,
          message: res.open ? `Port ${port} is reachable (${res.latencyMs}ms)` : (res.error || 'Port is closed'),
          classification: res.open ? 'up' : 'down'
        });
      } else {
        const res = await api.checkUrl(
          url,
          'GET',
          type === 'keyword' ? keyword : undefined,
          acceptedStatusCodes ? acceptedStatusCodes : undefined,
          customUserAgent ? customUserAgent : undefined
        );
        setTestResult({
          success: res.isUp || res.isBlocked,
          latency: res.responseTimeMs,
          message: res.isBlocked
            ? `Reachable, Blocked: ${res.reason}`
            : res.reason || res.message,
          classification: res.classification
        });
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setTestResult({
        success: false,
        latency: 0,
        message: err.message || 'Connection test failed',
        classification: 'down'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this monitor');
      return;
    }
    if (!url.trim()) {
      setError('Please provide a URL or hostname');
      return;
    }

    const tags = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        url: url.trim(),
        type,
        port: type === 'port' ? Number(port) : undefined,
        keyword: type === 'keyword' ? keyword.trim() : undefined,
        acceptedStatusCodes: acceptedStatusCodes.trim() || undefined,
        customUserAgent: customUserAgent.trim() || undefined,
        intervalMinutes,
        tags: tags.length > 0 ? tags : ['General'],
        maintenanceMode,
        notificationChannels: {
          email: notifyEmail,
          browser: notifyBrowser,
          sound: notifySound
        },
        contentChangeConfig: {
          enabled: contentChangeEnabled,
          intervalMinutes: contentChangeInterval,
          selector: contentChangeSelector.trim() || undefined,
          ignoreText: contentChangeIgnoreText.trim() || undefined,
          notifyThresholdPercent: contentChangeThreshold,
          triggerKeyword: contentChangeKeyword.trim() || undefined,
          lastContentHash: editingMonitor?.contentChangeConfig?.lastContentHash,
          lastContentSnapshot: editingMonitor?.contentChangeConfig?.lastContentSnapshot
        },
        crawlerConfig: {
          enabled: crawlerEnabled,
          depth: crawlerDepth,
          checkExternal: crawlerExternal,
          schedule: crawlerSchedule,
          lastScanAt: editingMonitor?.crawlerConfig?.lastScanAt,
          brokenCount: editingMonitor?.crawlerConfig?.brokenCount
        },
        anomalyConfig: {
          enabled: anomalyEnabled,
          sensitivity: anomalySensitivity,
          baselineLatency: editingMonitor?.anomalyConfig?.baselineLatency,
          stdDevLatency: editingMonitor?.anomalyConfig?.stdDevLatency
        },
        defacementConfig: {
          enabled: defacementEnabled,
          baselineSet: editingMonitor?.defacementConfig?.baselineSet ?? false,
          riskScore: editingMonitor?.defacementConfig?.riskScore || 'low',
          baseline: editingMonitor?.defacementConfig?.baseline
        },
        screenshotConfig: {
          enabled: screenshotEnabled,
          schedule: screenshotSchedule,
          thresholdPercent: screenshotThreshold,
          lastCapturedAt: editingMonitor?.screenshotConfig?.lastCapturedAt,
          lastDiffPercent: editingMonitor?.screenshotConfig?.lastDiffPercent
        },
        rootCauseConfig: {
          enabled: rootCauseEnabled,
          autoTroubleshoot: autoTroubleshootEnabled
        }
      });
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || 'Failed to save monitor');
    } finally {
      setSaving(false);
    }
  };

  const monitorTypes: { id: MonitorType; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'http', label: 'HTTP / HTTPS', desc: 'Standard status code check (200 OK)', icon: Globe },
    { id: 'port', label: 'Port (TCP)', desc: 'Test custom socket port on host', icon: Radio },
    { id: 'keyword', label: 'Keyword Check', desc: 'Ensure response body contains text', icon: Search },
    { id: 'ping', label: 'Ping / Latency', desc: 'Measure server turnaround latency', icon: Activity }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-xl rounded-xl border p-5 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
          isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3.5 border-inherit">
          <div>
            <h2 className="text-base font-bold">
              {editingMonitor ? 'Edit Monitor' : 'Create New Monitor'}
            </h2>
            <p className="text-xs text-neutral-500">
              Configure health checks, intervals, and notification triggers
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Monitor Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Monitor Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {monitorTypes.map(m => {
                const Icon = m.icon;
                const isSelected = type === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setType(m.id);
                      if (m.id === 'port' && url.startsWith('http')) {
                        setUrl(url.replace(/^https?:\/\//i, '').split('/')[0]);
                      }
                    }}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                      isSelected
                        ? isDark
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : isDark
                        ? 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 text-neutral-300'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                    <div>
                      <div className="text-xs font-semibold">{m.label}</div>
                      <div className="text-[11px] text-neutral-500">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & URL */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Friendly Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Production API, Auth Service, Landing Page"
                className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                {type === 'port' ? 'Host / IP Address' : 'Target URL'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder={type === 'port' ? 'db.example.com or 192.168.1.1' : 'https://example.com'}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    isDark
                      ? 'border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300'
                      : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 text-emerald-500" />}
                  <span>Test</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`mt-2 flex flex-col gap-1 rounded-lg border p-2.5 text-xs font-mono ${
                    testResult.classification === 'up'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : testResult.classification === 'blocked'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {testResult.classification === 'up' && '✓ Up (Operational)'}
                      {testResult.classification === 'blocked' && '⚠ Reachable, Blocked'}
                      {testResult.classification === 'down' && '✕ Down (Unreachable)'}
                    </span>
                    {testResult.latency > 0 && <span>{testResult.latency}ms</span>}
                  </div>
                  <div className="text-[11px] opacity-90">
                    {testResult.message}
                  </div>
                  {testResult.classification === 'blocked' && (
                    <div className="mt-1 text-[10px] text-amber-300 bg-amber-500/20 p-1.5 rounded">
                      Server is online but blocked automated checks. Try a custom User-Agent or accepted status codes.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Port Specific Field */}
            {type === 'port' && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Port Number
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={port}
                    onChange={e => setPort(Number(e.target.value))}
                    className={`w-32 rounded-lg border px-3 py-2 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                      isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-neutral-500">
                    <span>Presets:</span>
                    {[80, 443, 22, 5432, 3306, 3000].map(p => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPort(p)}
                        className={`rounded px-1.5 py-0.5 border text-xs font-mono ${
                          port === p
                            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                            : 'border-inherit hover:text-neutral-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Keyword Specific Field */}
            {type === 'keyword' && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Expected Keyword / String in Body
                </label>
                <input
                  type="text"
                  required
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. Database connected, Status: OK, Copyright 2026"
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                  }`}
                />
              </div>
            )}

            {/* Accepted Status Codes & Custom User-Agent */}
            {type !== 'port' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Accepted Status Codes (optional)
                  </label>
                  <input
                    type="text"
                    value={acceptedStatusCodes}
                    onChange={e => setAcceptedStatusCodes(e.target.value)}
                    placeholder="e.g. 200-299, 403 (Default: 200-399)"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                      isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Decide what counts as Up (e.g. 200-299, 403).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Custom User-Agent (optional)
                  </label>
                  <input
                    type="text"
                    value={customUserAgent}
                    onChange={e => setCustomUserAgent(e.target.value)}
                    placeholder="e.g. MyUptimeBot/1.0 or Chrome 128"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                      isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Overrides browser header to bypass WAF bot rules.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Check Interval & Tags */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Check Interval
              </label>
              <select
                value={intervalMinutes}
                onChange={e => setIntervalMinutes(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <option value={1}>Every 1 minute (Fastest)</option>
                <option value={5}>Every 5 minutes (Standard)</option>
                <option value={10}>Every 10 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 60 minutes (Hourly)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Tags / Group (Comma separated)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={e => setTagsStr(e.target.value)}
                placeholder="Production, Client A, Backend"
                className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Alert Channels & Maintenance Mode */}
          <div
            className={`rounded-lg border p-3 space-y-2.5 ${
              isDark ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="text-xs font-semibold">Alert Notification Channels</div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={e => setNotifyEmail(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Email Alerts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyBrowser}
                  onChange={e => setNotifyBrowser(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Browser Push</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySound}
                  onChange={e => setNotifySound(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Sound Chime</span>
              </label>
            </div>

            <div className="pt-1 border-t border-inherit flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">Maintenance Mode</div>
                <div className="text-[11px] text-neutral-500">
                  Silence outage alerts during planned updates
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  maintenanceMode ? 'bg-amber-500' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    maintenanceMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Site Intelligence Features */}
          <div
            className={`rounded-lg border p-3 space-y-3 ${
              isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <span>Site Intelligence Modules</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400">
                  Advanced
                </span>
              </span>
            </div>

            {/* Feature 1: Content Change Detection */}
            <div className="space-y-2 border-t border-inherit pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">1. Content Change Detection</div>
                  <div className="text-[10px] text-neutral-500">
                    Snapshots page content, strips noisy ads & dates, and computes diffs
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContentChangeEnabled(!contentChangeEnabled)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    contentChangeEnabled ? 'bg-purple-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      contentChangeEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {contentChangeEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-0.5">Check Interval</label>
                    <select
                      value={contentChangeInterval}
                      onChange={e => setContentChangeInterval(Number(e.target.value))}
                      className={`w-full rounded-md border px-2 py-1 text-xs ${
                        isDark ? 'border-neutral-700 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <option value={15}>Every 15 minutes</option>
                      <option value={60}>Every 1 hour (Default)</option>
                      <option value={360}>Every 6 hours</option>
                      <option value={1440}>Daily (Every 24 hours)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-0.5">Alert Threshold %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={contentChangeThreshold}
                      onChange={e => setContentChangeThreshold(Number(e.target.value))}
                      placeholder="e.g. 10%"
                      className={`w-full rounded-md border px-2 py-1 text-xs ${
                        isDark ? 'border-neutral-700 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-0.5">CSS Selector (optional)</label>
                    <input
                      type="text"
                      value={contentChangeSelector}
                      onChange={e => setContentChangeSelector(e.target.value)}
                      placeholder="#price, .headline"
                      className={`w-full rounded-md border px-2 py-1 text-xs font-mono ${
                        isDark ? 'border-neutral-700 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-0.5">Trigger Keyword (optional)</label>
                    <input
                      type="text"
                      value={contentChangeKeyword}
                      onChange={e => setContentChangeKeyword(e.target.value)}
                      placeholder="e.g. Sold Out, Error"
                      className={`w-full rounded-md border px-2 py-1 text-xs ${
                        isDark ? 'border-neutral-700 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Feature 2: Broken Link & Image Scanner */}
            <div className="space-y-2 border-t border-inherit pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">2. Broken Link & Image Scanner</div>
                  <div className="text-[10px] text-neutral-500">
                    Crawls page links & images with HEAD requests to flag 404s, redirects, and missing alt text
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCrawlerEnabled(!crawlerEnabled)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    crawlerEnabled ? 'bg-amber-500' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      crawlerEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {crawlerEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-0.5">Crawl Depth</label>
                    <select
                      value={crawlerDepth}
                      onChange={e => setCrawlerDepth(Number(e.target.value))}
                      className={`w-full rounded-md border px-2 py-1 text-xs ${
                        isDark ? 'border-neutral-700 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <option value={1}>This page only</option>
                      <option value={50}>Up to 50 pages</option>
                      <option value={100}>Up to 100 pages</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-0.5">Scan Schedule</label>
                    <select
                      value={crawlerSchedule}
                      onChange={e => setCrawlerSchedule(e.target.value as any)}
                      className={`w-full rounded-md border px-2 py-1 text-xs ${
                        isDark ? 'border-neutral-700 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <option value="manual">Manual on-demand</option>
                      <option value="weekly">Weekly auto-scan</option>
                      <option value="monthly">Monthly auto-scan</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Feature 3: Anomaly Detection */}
            <div className="space-y-2 border-t border-inherit pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">3. Anomaly & Outlier Detection</div>
                  <div className="text-[10px] text-neutral-500">
                    Learns rolling 7-day latency distribution and alerts on &gt;3σ outliers
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAnomalyEnabled(!anomalyEnabled)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    anomalyEnabled ? 'bg-orange-500' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      anomalyEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {anomalyEnabled && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-neutral-400">Detection Sensitivity:</span>
                  <div className="flex items-center gap-1">
                    {(['low', 'medium', 'high'] as const).map(sens => (
                      <button
                        key={sens}
                        type="button"
                        onClick={() => setAnomalySensitivity(sens)}
                        className={`rounded px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                          anomalySensitivity === sens
                            ? isDark
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : 'bg-orange-100 text-orange-800 border border-orange-300'
                            : isDark
                            ? 'text-neutral-500 hover:text-neutral-300'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {sens}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security, Visual & Assistant Modules */}
          <div
            className={`rounded-lg border p-3 space-y-3 ${
              isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                <span>Security & Visual Modules</span>
                <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-rose-400">
                  New
                </span>
              </span>
            </div>

            {/* Feature 1: Defacement Detection */}
            <div className="space-y-2 border-t border-inherit pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">1. Website Defacement Detection</div>
                  <div className="text-[10px] text-neutral-500">
                    Compares page against trusted baseline (title, structure hash, scripts, size, defacement keywords)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDefacementEnabled(!defacementEnabled)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    defacementEnabled ? 'bg-rose-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      defacementEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Feature 2: Website Screenshot Comparison */}
            <div className="space-y-2 border-t border-inherit pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">2. Website Screenshot Comparison</div>
                  <div className="text-[10px] text-neutral-500">
                    Headless desktop & mobile visual captures, overlay slider & pixel diff analysis
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenshotEnabled(!screenshotEnabled)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    screenshotEnabled ? 'bg-indigo-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      screenshotEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {screenshotEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-0.5">Capture Schedule</label>
                    <select
                      value={screenshotSchedule}
                      onChange={e => setScreenshotSchedule(e.target.value as any)}
                      className={`w-full rounded-md border px-2 py-1 text-xs ${
                        isDark ? 'border-neutral-700 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily (Default)</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-0.5">Diff Alert Threshold %</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={screenshotThreshold}
                      onChange={e => setScreenshotThreshold(Number(e.target.value))}
                      placeholder="e.g. 10%"
                      className={`w-full rounded-md border px-2 py-1 text-xs ${
                        isDark ? 'border-neutral-700 bg-neutral-900 text-neutral-200' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Feature 3 & 4: Root Cause Analyzer & Auto Troubleshoot */}
            <div className="space-y-2 border-t border-inherit pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">3. Root Cause Diagnostics & AI Explainer</div>
                  <div className="text-[10px] text-neutral-500">
                    Rule-based diagnostic engine with plain language translation for outages & blocks
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRootCauseEnabled(!rootCauseEnabled)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    rootCauseEnabled ? 'bg-sky-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      rootCauseEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs font-semibold">4. Auto Troubleshoot Checklist</div>
                  <div className="text-[10px] text-neutral-500">
                    Step-by-step resolution checklist with copy-paste commands & instant re-check
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoTroubleshootEnabled(!autoTroubleshootEnabled)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoTroubleshootEnabled ? 'bg-emerald-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      autoTroubleshootEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-inherit">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                isDark ? 'text-neutral-400 hover:bg-neutral-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{editingMonitor ? 'Update Monitor' : 'Create Monitor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
