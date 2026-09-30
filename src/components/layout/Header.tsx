import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  RefreshCw,
  Bell,
  Plus,
  Play,
  Pause,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  QrCode,
  Volume2,
  VolumeX,
  Mic
} from 'lucide-react';
import { NavTab } from './Sidebar';

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  'dashboard': { title: 'Dashboard', subtitle: 'Global uptime overview and live service health' },
  'favorites': { title: 'Favorite Sites', subtitle: 'Manage, check, and monitor your prioritized starred endpoints' },
  'instant-check': { title: 'Website Check', subtitle: 'Direct real-time HTTP, SSL & latency verification' },
  'bulk-check': { title: 'Bulk Website Check', subtitle: 'Parallel multi-URL verification, SSL audit & batch monitoring' },
  'port-checker': { title: 'Port Checker', subtitle: 'Live socket reachability across TCP ports' },
  'watch-mode': { title: 'Watch Down Servers', subtitle: 'Autonomous 30s check loop with instant recovery alerts' },
  'incidents': { title: 'Incidents & 90-Day Uptime', subtitle: 'Outage timeline, duration tracking & historical reliability' },
  'logs': { title: 'History & Logs', subtitle: 'Comprehensive audit trail of monitoring checks & CSV export' },
  'tools': { title: 'SSL, DNS & Bulk Importer', subtitle: 'Certificate inspection, DNS record queries & batch tools' },
  'status-page': { title: 'Public Status Page', subtitle: 'Configurable public status page for your users and clients' },
  'content-changes': { title: 'Content Change Detection', subtitle: 'Automated snapshot comparison, selector monitoring & visual diffs' },
  'crawler-scanner': { title: 'Broken Link & Image Scanner', subtitle: 'Deep site crawler, status verification, alt-text audit & redirect tracking' },
  'anomalies': { title: 'Anomaly & Outlier Detection', subtitle: 'Rolling baseline response-time analysis, statistical outliers & pattern alerts' },
  'defacement-detection': { title: 'Website Defacement Detection', subtitle: 'Continuous DOM baseline auditing, unauthorized script injection & risk scoring' },
  'screenshot-comparison': { title: 'Website Screenshot Comparison', subtitle: 'Automated multi-device visual regression, baseline diff overlay & threshold alerts' },
  'settings': { title: 'Settings', subtitle: 'Notification channels, API keys, and workspace preferences' },
};

export type RefreshIntervalChoice = 'manual' | 15 | 30 | 60 | 300;

interface HeaderProps {
  currentTab: NavTab;
  onOpenAddMonitor: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  refreshMode: 'auto' | 'manual';
  refreshInterval: number; // in seconds (15, 30, 60, 300)
  onToggleRefreshMode: () => void;
  onChangeRefreshInterval: (interval: RefreshIntervalChoice) => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  onOpenMobileMenu: () => void;
  isDark: boolean;
  onNavigateToTab: (tab: NavTab) => void;
  lastUpdatedTime: string;
  onOpenQrModal?: () => void;
  voiceAlertsEnabled?: boolean;
  onToggleVoiceAlerts?: () => void;
  onOpenVoiceAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenAddMonitor,
  onOpenNotifications,
  unreadNotificationsCount,
  refreshMode,
  refreshInterval,
  onToggleRefreshMode,
  onChangeRefreshInterval,
  onManualRefresh,
  isRefreshing,
  onOpenMobileMenu,
  isDark,
  onNavigateToTab,
  lastUpdatedTime,
  onOpenQrModal,
  voiceAlertsEnabled,
  onToggleVoiceAlerts,
  onOpenVoiceAssistant
}) => {
  const [secondsLeft, setSecondsLeft] = useState(refreshInterval || 30);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync seconds left when interval changes or on manual refresh
  useEffect(() => {
    setSecondsLeft(refreshInterval || 30);
  }, [refreshInterval]);

  // Click outside to close interval dropdown
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Countdown timer: runs ONLY when in Auto mode
  useEffect(() => {
    if (refreshMode === 'manual') return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onManualRefresh();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshMode, refreshInterval, onManualRefresh]);

  const activeInfo = TAB_TITLES[currentTab] || { title: 'Dashboard', subtitle: '' };

  const intervalOptions: { label: string; value: RefreshIntervalChoice }[] = [
    { label: 'Manual (No auto-refresh)', value: 'manual' },
    { label: '15 seconds', value: 15 },
    { label: '30 seconds (Default)', value: 30 },
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
  ];

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-4 sm:px-6 transition-colors ${
        isDark
          ? 'border-neutral-800/80 bg-neutral-900/90 backdrop-blur-md text-neutral-100'
          : 'border-slate-200 bg-white/95 backdrop-blur-md text-slate-800'
      }`}
    >
      {/* Zone 1: Breadcrumb & View Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {activeInfo.title}
            </h1>
          </div>
          <p className="hidden text-xs text-neutral-500 sm:block">
            {activeInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Zone 2: Refresh Controls (Auto/Manual Toggle, Countdown, Dropdown, Refresh Button, Last Updated) */}
      <div className="hidden md:flex items-center gap-2.5">
        {/* Last updated timestamp */}
        <span className="text-[11px] font-mono text-neutral-400 select-none mr-1 hidden lg:inline">
          Last updated: <strong className="text-neutral-300">{lastUpdatedTime}</strong>
        </span>

        {/* Segmented Refresh Toggle & Dropdown */}
        <div className="relative flex items-center" ref={dropdownRef}>
          {/* Main Toggle Button */}
          <button
            onClick={onToggleRefreshMode}
            className={`flex items-center gap-1.5 rounded-l-lg border-y border-l px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              refreshMode === 'auto'
                ? isDark
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : isDark
                ? 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-slate-300 bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title={refreshMode === 'auto' ? 'Click to switch to Manual mode' : 'Click to switch to Auto mode'}
          >
            {refreshMode === 'auto' ? (
              <>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Auto: <strong className="font-mono">{secondsLeft}s</strong></span>
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 text-neutral-400" />
                <span>Manual</span>
              </>
            )}
          </button>

          {/* Arrow dropdown trigger */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`rounded-r-lg border p-1.5 text-xs transition-colors cursor-pointer ${
              refreshMode === 'auto'
                ? isDark
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : isDark
                ? 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
                : 'border-slate-300 bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Choose refresh interval or switch to manual"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className={`absolute top-full mt-1.5 right-0 z-50 w-52 rounded-xl border p-1.5 shadow-xl backdrop-blur-md transition-all ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900/95 text-neutral-100'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Refresh Mode & Interval
              </div>
              <div className="space-y-0.5 mt-1">
                {intervalOptions.map((opt) => {
                  const isSelected =
                    opt.value === 'manual'
                      ? refreshMode === 'manual'
                      : refreshMode === 'auto' && refreshInterval === opt.value;

                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        onChangeRefreshInterval(opt.value);
                        setSecondsLeft(typeof opt.value === 'number' ? opt.value : 30);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                            : 'bg-emerald-50 text-emerald-800 font-semibold'
                          : isDark
                          ? 'hover:bg-neutral-800 text-neutral-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <span className="text-xs text-emerald-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={() => {
            setSecondsLeft(refreshInterval);
            onManualRefresh();
          }}
          disabled={isRefreshing}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            isDark
              ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          } ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
          title="Refresh All Monitors Now"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Zone 3: Quick instant check + QR + Voice + Notifications + Add Monitor */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* QR Code button */}
        {onOpenQrModal && (
          <button
            onClick={onOpenQrModal}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Scan Mobile QR Code"
          >
            <QrCode className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline">Mobile QR</span>
          </button>
        )}

        {/* Voice alerts toggle */}
        {onToggleVoiceAlerts && (
          <button
            onClick={onToggleVoiceAlerts}
            className={`flex items-center justify-center rounded-lg p-2 transition-colors cursor-pointer ${
              voiceAlertsEnabled
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : isDark
                ? 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title={voiceAlertsEnabled ? 'Voice Alerts Active (Click to mute)' : 'Enable Spoken Voice Alerts'}
          >
            {voiceAlertsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        )}

        {/* Voice Assistant button */}
        {onOpenVoiceAssistant && (
          <button
            onClick={onOpenVoiceAssistant}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'border-neutral-800 bg-neutral-900 text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/10'
                : 'border-slate-200 bg-white text-sky-600 hover:bg-sky-50'
            }`}
            title="Open Voice Monitoring Assistant (Speech Recognition & Spoken Answers)"
          >
            <Mic className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-semibold">Voice AI</span>
          </button>
        )}

        <button
          onClick={() => onNavigateToTab('instant-check')}
          className={`hidden lg:flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            isDark
              ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span>Quick Check</span>
        </button>

        {/* Notifications button with count */}
        <button
          onClick={onOpenNotifications}
          className={`relative rounded-lg p-2 text-neutral-400 transition-colors ${
            isDark ? 'hover:bg-neutral-800 hover:text-neutral-200' : 'hover:bg-slate-100 hover:text-slate-800'
          }`}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 font-mono text-[9px] font-bold text-white shadow">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onOpenAddMonitor}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Add Monitor</span>
        </button>
      </div>
    </header>
  );
};
