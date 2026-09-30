import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { api } from '../../services/api';
import { MobileAlertsSection } from './MobileAlertsSection';
import {
  Settings,
  Key,
  Bell,
  User,
  Globe,
  Database,
  Copy,
  Check,
  RefreshCw,
  Send,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Code,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Camera,
  Mic,
  Wrench,
  Smartphone
} from 'lucide-react';

interface SettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isDark: boolean;
  onToggleTheme: () => void;
  onRemoveDemoData?: () => Promise<void>;
  onResetAllData?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  isDark,
  onToggleTheme,
  onRemoveDemoData,
  onResetAllData
}) => {
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [alertEmail, setAlertEmail] = useState(profile.alertEmail);
  const [webhookUrl, setWebhookUrl] = useState(profile.webhookUrl);
  const [soundEnabled, setSoundEnabled] = useState(profile.soundEnabled);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(profile.browserNotificationsEnabled);
  const [logRetentionDays, setLogRetentionDays] = useState(profile.logRetentionDays || 0);

  // Global Feature Module Toggles
  const [featureDefacement, setFeatureDefacement] = useState(true);
  const [featureScreenshots, setFeatureScreenshots] = useState(true);
  const [featureVoice, setFeatureVoice] = useState(true);
  const [featureAutoTroubleshoot, setFeatureAutoTroubleshoot] = useState(true);

  const [apiKey, setApiKey] = useState(profile.apiKey);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Danger zone state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [resettingAll, setResettingAll] = useState(false);
  const [removingDemo, setRemovingDemo] = useState(false);
  const [dataMessage, setDataMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleGenerateNewKey = () => {
    const newKey = 'ucp_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setApiKey(newKey);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const curlCommand = `curl -X POST https://uptimechecker.pro/api/check-url \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://api.github.com"}'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setTestingWebhook(true);
    setWebhookStatus(null);
    try {
      const res = await api.testWebhook(webhookUrl.trim());
      setWebhookStatus({
        success: res.success,
        message: res.success ? `Webhook dispatched! HTTP Status ${res.status || 200}` : (res.error || 'Webhook test failed')
      });
    } catch {
      setWebhookStatus({ success: false, message: 'Network failed to dispatch webhook' });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onUpdateProfile({
        fullName,
        email,
        timezone,
        alertEmail,
        webhookUrl,
        soundEnabled,
        browserNotificationsEnabled,
        logRetentionDays,
        apiKey
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDemo = async () => {
    setRemovingDemo(true);
    setDataMessage(null);
    try {
      if (onRemoveDemoData) {
        await onRemoveDemoData();
      } else {
        await api.removeDemoData();
      }
      setDataMessage({ text: 'Seeded demo monitors and sample logs removed successfully', type: 'success' });
      setTimeout(() => setDataMessage(null), 5000);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDataMessage({ text: err.message || 'Failed to remove demo data', type: 'error' });
    } finally {
      setRemovingDemo(false);
    }
  };

  const handleConfirmResetAll = async () => {
    if (deleteConfirmationInput !== 'DELETE') return;
    setResettingAll(true);
    try {
      if (onResetAllData) {
        await onResetAllData();
      } else {
        await api.resetAllData('DELETE');
      }
      setIsResetModalOpen(false);
      setDeleteConfirmationInput('');
      setDataMessage({ text: 'All monitors, logs, and incidents have been completely reset', type: 'success' });
      setTimeout(() => setDataMessage(null), 5000);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDataMessage({ text: err.message || 'Reset failed', type: 'error' });
    } finally {
      setResettingAll(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* User Profile */}
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-inherit">
            <User className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              User Profile & Workspace
            </h3>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Account Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <option value="UTC-07:00 (Pacific Time)">UTC-07:00 (Pacific Time - PT)</option>
                <option value="UTC-04:00 (Eastern Time)">UTC-04:00 (Eastern Time - ET)</option>
                <option value="UTC+00:00 (UTC / GMT)">UTC+00:00 (Coordinated Universal Time)</option>
                <option value="UTC+01:00 (Central European)">UTC+01:00 (Central European - CET)</option>
                <option value="UTC+05:30 (India Standard)">UTC+05:30 (India Standard - IST)</option>
                <option value="UTC+08:00 (Singapore / HK)">UTC+08:00 (Singapore / Hong Kong)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Theme Preference</label>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isDark ? 'border-neutral-700 bg-neutral-950 text-neutral-200' : 'border-slate-300 bg-slate-100 text-slate-800'
                  }`}
                >
                  Current: {isDark ? 'Dark Mode 🌙' : 'Light Mode ☀️'} (Click to toggle)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications & Alert Preferences */}
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-inherit">
            <Bell className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Notification Channels & Webhooks
            </h3>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">Primary Alert Email</label>
              <input
                type="email"
                value={alertEmail}
                onChange={e => setAlertEmail(e.target.value)}
                placeholder="alerts@company.com"
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Incident Webhook URL (Slack, Discord, Telegram)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className={`flex-1 rounded-lg border px-3 py-2 font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  {testingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 text-sky-400" />}
                  <span>Test Webhook</span>
                </button>
              </div>

              {webhookStatus && (
                <div
                  className={`mt-2 p-2 rounded-lg border text-[11px] font-mono ${
                    webhookStatus.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {webhookStatus.message}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={e => setSoundEnabled(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Enable In-App Sound Alerts</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={browserNotificationsEnabled}
                  onChange={e => setBrowserNotificationsEnabled(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Enable Browser Push Notifications</span>
              </label>
            </div>
          </div>
        </div>

        {/* Global Security & Intelligence Modules Toggles */}
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-inherit">
            <ShieldAlert className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Security, Visual & Assistant Module Toggles
            </h3>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-inherit">
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  <span>Defacement Detection</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Automated HTML & script integrity baseline checks
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeatureDefacement(!featureDefacement)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  featureDefacement ? 'bg-emerald-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    featureDefacement ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-inherit">
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Screenshot Comparison</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Scheduled visual capture and pixel diffing
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeatureScreenshots(!featureScreenshots)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  featureScreenshots ? 'bg-emerald-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    featureScreenshots ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-inherit">
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 text-sky-400" />
                  <span>Voice Monitoring Assistant</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Speech recognition & spoken voice alert synthesis
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeatureVoice(!featureVoice)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  featureVoice ? 'bg-emerald-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    featureVoice ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-inherit">
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-amber-400" />
                  <span>Root Cause & Auto-Troubleshoot</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  AI & rule-based diagnostics with recovery steps
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeatureAutoTroubleshoot(!featureAutoTroubleshoot)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  featureAutoTroubleshoot ? 'bg-emerald-600' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    featureAutoTroubleshoot ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Alerts Multi-Channel Hub */}
        <MobileAlertsSection isDark={isDark} />

        {/* API Key Generation */}
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-inherit">
            <div className="flex items-center gap-2.5">
              <Key className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                REST API Credentials
              </h3>
            </div>
            <button
              type="button"
              onClick={handleGenerateNewKey}
              className="flex items-center gap-1 rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Roll Secret Key</span>
            </button>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">Your Bearer API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={apiKey}
                  className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-emerald-400 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 text-neutral-400">
                <span>cURL Integration Sample:</span>
                <button
                  type="button"
                  onClick={handleCopyCurl}
                  className="hover:text-emerald-400 text-[11px] flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
                {curlCommand}
              </div>
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-inherit">
            <Trash2 className="h-4 w-4 text-rose-500" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Data Management & Storage Retention
              </h3>
              <p className="text-[11px] text-neutral-500">
                Manage data retention, purge demo seed records, or perform a complete environment reset.
              </p>
            </div>
          </div>

          {/* Feedback message */}
          {dataMessage && (
            <div
              className={`mt-4 flex items-center justify-between p-3 rounded-lg border text-xs ${
                dataMessage.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              }`}
            >
              <span>{dataMessage.text}</span>
              <button
                type="button"
                onClick={() => setDataMessage(null)}
                className="text-neutral-400 hover:text-neutral-200 text-xs ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="mt-4 space-y-4 text-xs">
            {/* Auto-delete logs older than dropdown */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Auto-delete logs older than
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <select
                  value={logRetentionDays}
                  onChange={e => setLogRetentionDays(Number(e.target.value))}
                  className={`w-full sm:w-64 rounded-lg border px-3 py-2 transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
                  }`}
                >
                  <option value={0}>Never (Keep all history)</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                </select>
                <span className="text-[11px] text-neutral-500">
                  Automatically clears historical logs past this window during automated cron probes.
                </span>
              </div>
            </div>

            {/* Remove Demo Data Button */}
            <div className="pt-3 border-t border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-neutral-200">Remove Sample / Demo Data</div>
                <div className="text-[11px] text-neutral-400">
                  Deletes all initial example monitors, mock check logs, and sample incidents.
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveDemo}
                disabled={removingDemo}
                className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {removingDemo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{removingDemo ? 'Removing...' : 'Remove Demo Data'}</span>
              </button>
            </div>

            {/* Danger Zone: Reset Everything */}
            <div className="pt-3 border-t border-rose-500/20 rounded-xl bg-rose-500/5 p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-rose-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Danger Zone: Reset Everything</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Permanently deletes all monitors, checks, incidents, notifications, and telemetry.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationInput('');
                  setIsResetModalOpen(true);
                }}
                className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-rose-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-rose-500 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Reset Everything</span>
              </button>
            </div>
          </div>
        </div>

        {/* Supabase Integration Guide */}
        <div
          className={`rounded-xl border p-5 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-inherit">
            <Database className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Supabase Backend Schema & RLS
            </h3>
          </div>

          <div className="mt-4 text-xs text-neutral-400 space-y-2">
            <p>
              Your database schema is saved in <code className="text-emerald-400 font-mono">/supabase/schema.sql</code> with full Row Level Security (RLS) configured for:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-neutral-300">
              <span className="p-1.5 rounded bg-neutral-950 border border-neutral-800">public.profiles</span>
              <span className="p-1.5 rounded bg-neutral-950 border border-neutral-800">public.monitors</span>
              <span className="p-1.5 rounded bg-neutral-950 border border-neutral-800">public.checks</span>
              <span className="p-1.5 rounded bg-neutral-950 border border-neutral-800">public.incidents</span>
              <span className="p-1.5 rounded bg-neutral-950 border border-neutral-800">public.watches</span>
              <span className="p-1.5 rounded bg-neutral-950 border border-neutral-800">public.notifications</span>
              <span className="p-1.5 rounded bg-neutral-950 border border-neutral-800">public.status_pages</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              To connect your own remote Supabase instance, execute <code>schema.sql</code> in your Supabase SQL editor and add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code>.
            </p>
          </div>
        </div>

        {/* Save button bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Settings saved successfully
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Danger Zone Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-inherit text-rose-500">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold">Confirm Complete Data Wipe</h3>
                <p className="text-xs text-neutral-400">Irreversible environment reset</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <p className="text-neutral-300">
                This operation will permanently delete <strong>all monitors, incidents, check logs, and notifications</strong>. Your uptime charts and dashboard statistics will be reset.
              </p>

              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300">
                Please type <strong className="font-mono text-rose-200">DELETE</strong> below to confirm.
              </div>

              <div>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={e => setDeleteConfirmationInput(e.target.value)}
                  placeholder='Type "DELETE"'
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-sm tracking-widest text-center transition-colors focus:outline-hidden focus:ring-2 focus:ring-rose-500 ${
                    isDark ? 'border-neutral-800 bg-neutral-950 text-rose-400' : 'border-slate-300 bg-white text-rose-600'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-inherit">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resettingAll}
                className="rounded-lg border border-inherit px-4 py-2 text-xs font-semibold hover:bg-neutral-800 text-neutral-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmResetAll}
                disabled={deleteConfirmationInput !== 'DELETE' || resettingAll}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {resettingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Permanently Wipe All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
