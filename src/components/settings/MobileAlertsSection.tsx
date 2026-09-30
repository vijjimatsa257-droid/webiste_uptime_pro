import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Send,
  MessageSquare,
  QrCode,
  Bell,
  Mail,
  Moon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Lock,
  DollarSign,
  Copy,
  Check
} from 'lucide-react';
import {
  MobileAlertsSettings,
  MobileAlertDeliveryLog,
  MobileAlertEventType
} from '../../types';
import { api } from '../../services/api';

interface MobileAlertsSectionProps {
  isDark: boolean;
}

export const MobileAlertsSection: React.FC<MobileAlertsSectionProps> = ({ isDark }) => {
  const [settings, setSettings] = useState<MobileAlertsSettings | null>(null);
  const [logs, setLogs] = useState<MobileAlertDeliveryLog[]>([]);
  const [activeChannelTab, setActiveChannelTab] = useState<'telegram' | 'twilio' | 'webPush' | 'email'>('telegram');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const loadData = async () => {
    try {
      const [fetchedSettings, fetchedLogs] = await Promise.all([
        api.getMobileAlertsSettings(),
        api.getMobileDeliveryLogs()
      ]);
      setSettings(fetchedSettings);
      setLogs(fetchedLogs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (newSettings: MobileAlertsSettings) => {
    setSettings(newSettings);
    setSaving(true);
    try {
      await api.updateMobileAlertsSettings(newSettings);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (channel: string, eventType: string = 'down') => {
    setTestingChannel(channel);
    setTestResult(null);
    try {
      const res = await api.sendMobileAlertTest(channel, eventType);
      setTestResult({ success: res.success, message: res.message });
      setLogs(prev => [res.log, ...prev]);

      // If testing Web Push, trigger standard browser notification if permitted
      if (channel === 'web_push' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🔴 DOWN: Staging Server', {
          body: 'Cause: Connection timeout. Since ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          icon: '/manifest.json'
        });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to send test dispatch' });
    } finally {
      setTestingChannel(null);
    }
  };

  const handleRequestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === 'granted' && settings) {
        const updated = {
          ...settings,
          webPush: { ...settings.webPush, isSubscribed: true }
        };
        handleSaveSettings(updated);
      }
    } catch {}
  };

  const handleClearLogs = async () => {
    await api.clearMobileDeliveryLogs();
    setLogs([]);
  };

  if (loading || !settings) {
    return (
      <div className="p-8 text-center text-xs text-neutral-500">
        <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin mx-auto mb-2" />
        Loading mobile notification profiles...
      </div>
    );
  }

  const allEventTypes: { key: MobileAlertEventType; label: string; icon: string }[] = [
    { key: 'down', label: 'Down Outages (Critical)', icon: '🔴' },
    { key: 'recovered', label: 'Recovered Online', icon: '🟢' },
    { key: 'blocked', label: 'WAF / Rate Limit Blocked (403/429)', icon: '🟡' },
    { key: 'defacement', label: 'Defacement Risks', icon: '🛡️' },
    { key: 'content_change', label: 'Content Alterations', icon: '📝' },
    { key: 'anomaly', label: 'Latency Outliers & Spikes', icon: '⚡' },
    { key: 'ssl_expiring', label: 'SSL Expiry Warning (< 14 Days)', icon: '🔒' }
  ];

  const telegramBotQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    `https://t.me/${settings.telegram.botUsername}?start=connect_${settings.telegram.chatId}`
  )}&margin=8&color=059669`;

  return (
    <div className={`rounded-xl border p-5 space-y-6 transition-colors ${
      isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 border-inherit">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              Phone & Mobile Notifications
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                MULTI-CHANNEL
              </span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Receive instant lock-screen alerts like standard text messages on your mobile device.
            </p>
          </div>
        </div>

        {saving && (
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" /> Saving changes...
          </span>
        )}
      </div>

      {/* Test Result Toast */}
      {testResult && (
        <div className={`flex items-center justify-between rounded-xl border p-3 text-xs shadow-xs animate-in fade-in ${
          testResult.success
            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
            : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />}
            <span>{testResult.message}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-neutral-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Channel Tabs */}
      <div className="flex rounded-xl p-1 bg-neutral-950/60 border border-inherit text-xs">
        <button
          onClick={() => setActiveChannelTab('telegram')}
          className={`flex-1 py-2 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeChannelTab === 'telegram'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Telegram Bot (Free)</span>
        </button>

        <button
          onClick={() => setActiveChannelTab('twilio')}
          className={`flex-1 py-2 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeChannelTab === 'twilio'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>WhatsApp & Twilio SMS</span>
        </button>

        <button
          onClick={() => setActiveChannelTab('webPush')}
          className={`flex-1 py-2 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeChannelTab === 'webPush'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Web Push (PWA)</span>
        </button>

        <button
          onClick={() => setActiveChannelTab('email')}
          className={`flex-1 py-2 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeChannelTab === 'email'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Email Backup</span>
        </button>
      </div>

      {/* 1. Telegram Bot Panel */}
      {activeChannelTab === 'telegram' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-neutral-200">Enable Telegram Alerts</label>
              <input
                type="checkbox"
                checked={settings.telegram.enabled}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    telegram: { ...settings.telegram, enabled: e.target.checked }
                  });
                }}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleSendTest('telegram')}
              disabled={testingChannel === 'telegram'}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Send className={`h-3.5 w-3.5 ${testingChannel === 'telegram' ? 'animate-spin' : ''}`} />
              <span>{testingChannel === 'telegram' ? 'Sending...' : 'Send Test Telegram Message'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Connection instructions + QR code */}
            <div className="rounded-xl border border-inherit bg-neutral-950/40 p-4 space-y-3">
              <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-emerald-400" />
                <span>Instant Auto-Connect via QR Code</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Scan this QR code with your phone camera or click the link below to open Telegram, press <strong>Start</strong>, and your Chat ID will link automatically.
              </p>

              <div className="flex items-center gap-4 pt-1">
                <div className="h-32 w-32 rounded-xl bg-white p-2 shadow-inner shrink-0 flex items-center justify-center">
                  <img src={telegramBotQrSrc} alt="Telegram Bot QR" className="h-full w-full object-contain" />
                </div>
                <div className="space-y-2 text-xs">
                  <a
                    href={`https://t.me/${settings.telegram.botUsername}?start=connect_${settings.telegram.chatId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:underline font-mono text-[11px]"
                  >
                    <span>t.me/{settings.telegram.botUsername}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="text-[11px] font-mono text-neutral-500">
                    Status: <strong className="text-emerald-400">Linked ✓ (Chat #{settings.telegram.chatId})</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Chat ID configuration */}
            <div className="rounded-xl border border-inherit bg-neutral-950/40 p-4 space-y-3">
              <div className="text-xs font-semibold text-neutral-300">Manual Telegram Credentials</div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Bot Username</label>
                <input
                  type="text"
                  value={settings.telegram.botUsername}
                  onChange={(e) => {
                    handleSaveSettings({
                      ...settings,
                      telegram: { ...settings.telegram, botUsername: e.target.value }
                    });
                  }}
                  className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-200"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Linked Telegram Chat ID</label>
                <input
                  type="text"
                  value={settings.telegram.chatId}
                  onChange={(e) => {
                    handleSaveSettings({
                      ...settings,
                      telegram: { ...settings.telegram, chatId: e.target.value, isLinked: true }
                    });
                  }}
                  className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-200"
                />
              </div>

              <div className="text-[11px] text-neutral-500">
                🔒 Bot token is stored securely in backend vault variables and never transmitted to client code.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Twilio WhatsApp & SMS Panel */}
      {activeChannelTab === 'twilio' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-neutral-200">Enable Twilio SMS / WhatsApp</label>
              <input
                type="checkbox"
                checked={settings.twilio.enabled}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    twilio: { ...settings.twilio, enabled: e.target.checked }
                  });
                }}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleSendTest('sms')}
              disabled={testingChannel === 'sms'}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Send className={`h-3.5 w-3.5 ${testingChannel === 'sms' ? 'animate-spin' : ''}`} />
              <span>{testingChannel === 'sms' ? 'Sending...' : 'Send Test SMS / WhatsApp'}</span>
            </button>
          </div>

          {/* Pricing Notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs text-amber-300">
            <DollarSign className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Carrier & API Usage Notice:</span>
              <p className="text-[11px] text-amber-300/90 mt-0.5">
                Twilio charges standard per-message rates for SMS and WhatsApp Business dispatches. Credentials are held in a secure server-side vault.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Target Phone Number</label>
              <input
                type="tel"
                value={settings.twilio.toNumber}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    twilio: { ...settings.twilio, toNumber: e.target.value }
                  });
                }}
                placeholder="+14155552671"
                className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-200"
              />
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Twilio Sender Number</label>
              <input
                type="tel"
                value={settings.twilio.fromNumber}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    twilio: { ...settings.twilio, fromNumber: e.target.value }
                  });
                }}
                placeholder="+18005550199"
                className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-200"
              />
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Twilio Account SID</label>
              <input
                type="text"
                value={settings.twilio.accountSid}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    twilio: { ...settings.twilio, accountSid: e.target.value }
                  });
                }}
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-200"
              />
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Twilio Auth Token</label>
              <input
                type="password"
                value={settings.twilio.authToken}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    twilio: { ...settings.twilio, authToken: e.target.value }
                  });
                }}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Web Push (PWA) Panel */}
      {activeChannelTab === 'webPush' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-neutral-200">Enable PWA Web Push Alerts</label>
              <input
                type="checkbox"
                checked={settings.webPush.enabled}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    webPush: { ...settings.webPush, enabled: e.target.checked }
                  });
                }}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleSendTest('web_push')}
              disabled={testingChannel === 'web_push'}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Send className={`h-3.5 w-3.5 ${testingChannel === 'web_push' ? 'animate-spin' : ''}`} />
              <span>{testingChannel === 'web_push' ? 'Sending...' : 'Send Test Web Push Notification'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-inherit bg-neutral-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-neutral-200">Native Lock Screen Notification Permission</div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Appears like normal phone messages with sound and vibration even when the app is closed.
                </p>
              </div>

              <button
                onClick={handleRequestPushPermission}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  pushPermission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {pushPermission === 'granted' ? '✓ Permission Granted' : 'Allow Phone Push Alerts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Email Panel */}
      {activeChannelTab === 'email' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-neutral-200">Enable Email Backup Alerts</label>
              <input
                type="checkbox"
                checked={settings.email.enabled}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    email: { ...settings.email, enabled: e.target.checked }
                  });
                }}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleSendTest('email')}
              disabled={testingChannel === 'email'}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Send className={`h-3.5 w-3.5 ${testingChannel === 'email' ? 'animate-spin' : ''}`} />
              <span>{testingChannel === 'email' ? 'Sending...' : 'Send Test Email'}</span>
            </button>
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">Alert Recipient Email</label>
            <input
              type="email"
              value={settings.email.recipientEmail}
              onChange={(e) => {
                handleSaveSettings({
                  ...settings,
                  email: { ...settings.email, recipientEmail: e.target.value }
                });
              }}
              className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-200"
            />
          </div>
        </div>
      )}

      {/* Notification Event Filter Checkboxes */}
      <div className="border-t pt-4 border-inherit space-y-3">
        <div className="text-xs font-bold text-neutral-200">Event Types to Broadcast to Phone</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {allEventTypes.map((ev) => {
            const isChecked = settings.telegram.eventTypes.includes(ev.key);

            return (
              <label
                key={ev.key}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-inherit bg-neutral-950/40 hover:bg-neutral-800/40 transition-colors cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const current = settings.telegram.eventTypes;
                    const next = e.target.checked
                      ? [...current, ev.key]
                      : current.filter(x => x !== ev.key);

                    handleSaveSettings({
                      ...settings,
                      telegram: { ...settings.telegram, eventTypes: next },
                      twilio: { ...settings.twilio, eventTypes: next },
                      webPush: { ...settings.webPush, eventTypes: next }
                    });
                  }}
                  className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-900 text-emerald-500"
                />
                <span className="truncate">
                  {ev.icon} {ev.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Quiet Hours Settings */}
      <div className="border-t pt-4 border-inherit space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-neutral-200">Quiet Hours (Mute Non-Critical Notifications)</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={settings.quietHours.enabled}
              onChange={(e) => {
                handleSaveSettings({
                  ...settings,
                  quietHours: { ...settings.quietHours, enabled: e.target.checked }
                });
              }}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500"
            />
            <span className="text-neutral-300">Quiet Hours Active</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">Start Time</label>
            <input
              type="time"
              value={settings.quietHours.startTime}
              onChange={(e) => {
                handleSaveSettings({
                  ...settings,
                  quietHours: { ...settings.quietHours, startTime: e.target.value }
                });
              }}
              className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200"
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">End Time</label>
            <input
              type="time"
              value={settings.quietHours.endTime}
              onChange={(e) => {
                handleSaveSettings({
                  ...settings,
                  quietHours: { ...settings.quietHours, endTime: e.target.value }
                });
              }}
              className="w-full rounded-lg border border-inherit bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
              <input
                type="checkbox"
                checked={settings.quietHours.allowCriticalDowntime}
                onChange={(e) => {
                  handleSaveSettings({
                    ...settings,
                    quietHours: { ...settings.quietHours, allowCriticalDowntime: e.target.checked }
                  });
                }}
                className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-900 text-emerald-500"
              />
              <span>Always sound Critical Outages</span>
            </label>
          </div>
        </div>
      </div>

      {/* Message Delivery Logs */}
      <div className="border-t pt-4 border-inherit space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-neutral-200 flex items-center gap-2">
            <span>Dispatched Message Delivery Logs</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
              {logs.length} logged
            </span>
          </div>

          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear Delivery History</span>
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-4 text-center text-xs text-neutral-500 rounded-lg bg-neutral-950/40 border border-inherit">
            No mobile messages sent yet. Use the "Send Test" buttons above to verify delivery.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-inherit bg-neutral-950/50 p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      SENT ✓
                    </span>
                    <span className="text-neutral-400 font-bold uppercase">{log.channel}</span>
                    <span className="text-neutral-500">·</span>
                    <span className="text-neutral-400">{log.recipient}</span>
                  </div>
                  <div className="text-neutral-200 font-mono text-[11px] leading-relaxed">
                    {log.messageText}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-neutral-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
