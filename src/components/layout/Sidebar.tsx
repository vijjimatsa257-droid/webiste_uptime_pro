import React from 'react';
import {
  Activity,
  Zap,
  Radio,
  Eye,
  AlertTriangle,
  FileText,
  Wrench,
  Globe,
  Settings,
  ChevronRight,
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  UserCheck,
  Layers,
  Star,
  FileDiff,
  ScanLine,
  TrendingUp,
  ShieldAlert,
  Camera
} from 'lucide-react';
import { Monitor } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'favorites'
  | 'instant-check'
  | 'bulk-check'
  | 'port-checker'
  | 'watch-mode'
  | 'incidents'
  | 'logs'
  | 'tools'
  | 'content-changes'
  | 'crawler-scanner'
  | 'anomalies'
  | 'defacement-detection'
  | 'screenshot-comparison'
  | 'status-page'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  monitors: Monitor[];
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  userEmail: string;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  favoritesCount?: number;
  contentChangesCount?: number;
  brokenItemsCount?: number;
  anomaliesCount?: number;
  defacementAlertsCount?: number;
  screenshotAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  monitors,
  isDark,
  onToggleTheme,
  onOpenAuth,
  userEmail,
  isMobileOpen,
  onCloseMobile,
  favoritesCount = 0,
  contentChangesCount = 0,
  brokenItemsCount = 0,
  anomaliesCount = 0,
  defacementAlertsCount = 0,
  screenshotAlertsCount = 0
}) => {
  const downCount = monitors.filter(m => m.status === 'down').length;
  const watchedCount = monitors.filter(m => m.isWatched).length;

  const monitoringHubItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Star,
      badge: favoritesCount > 0 ? favoritesCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    { id: 'instant-check', label: 'Website Check', icon: Zap },
    { id: 'bulk-check', label: 'Bulk Check', icon: Layers },
    { id: 'port-checker', label: 'Port Checker', icon: Radio },
    {
      id: 'watch-mode',
      label: 'Watch Down Servers',
      icon: Eye,
      badge: watchedCount > 0 ? watchedCount : undefined,
      badgeColor: 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
    },
    {
      id: 'incidents',
      label: 'Incidents & 90d',
      icon: AlertTriangle,
      badge: downCount > 0 ? downCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    },
    { id: 'logs', label: 'History & Logs', icon: FileText },
    { id: 'tools', label: 'SSL, DNS & Bulk', icon: Wrench },
    { id: 'status-page', label: 'Public Status Page', icon: Globe },
  ];

  const siteIntelligenceItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; badgeColor?: string }[] = [
    {
      id: 'content-changes',
      label: 'Content Changes',
      icon: FileDiff,
      badge: contentChangesCount > 0 ? contentChangesCount : undefined,
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
    },
    {
      id: 'crawler-scanner',
      label: 'Link & Image Scanner',
      icon: ScanLine,
      badge: brokenItemsCount > 0 ? brokenItemsCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    {
      id: 'anomalies',
      label: 'Anomaly Detection',
      icon: TrendingUp,
      badge: anomaliesCount > 0 ? anomaliesCount : undefined,
      badgeColor: 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
    }
  ];

  const securityAssistantItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; badgeColor?: string }[] = [
    {
      id: 'defacement-detection',
      label: 'Defacement Detection',
      icon: ShieldAlert,
      badge: defacementAlertsCount > 0 ? defacementAlertsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
    },
    {
      id: 'screenshot-comparison',
      label: 'Screenshot Diff',
      icon: Camera,
      badge: screenshotAlertsCount > 0 ? screenshotAlertsCount : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
    }
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-200 lg:static lg:translate-x-0 ${
          isDark
            ? 'border-neutral-800/80 bg-neutral-900 text-neutral-200'
            : 'border-slate-200 bg-white text-slate-800'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand Zone */}
        <div className="flex h-16 items-center justify-between border-b px-5 border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Uptime Checker Pro
              </span>
              <div className="text-[11px] text-neutral-500 font-mono tracking-wide">
                SYSTEM MONITOR
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
              Monitoring Hub
            </div>
            <div className="space-y-0.5">
              {monitoringHubItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-neutral-800 text-emerald-400 font-semibold'
                          : 'bg-emerald-50 text-emerald-800 font-semibold'
                        : isDark
                        ? 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-emerald-500'
                            : isDark
                            ? 'text-neutral-400 group-hover:text-neutral-300'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`ml-2 shrink-0 rounded px-1.5 py-0.2 font-mono text-[10px] font-semibold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-amber-500/90 uppercase flex items-center justify-between">
              <span>Site Intelligence</span>
              <span className="text-[9px] font-mono px-1 rounded bg-amber-500/10 text-amber-400">PRO</span>
            </div>
            <div className="space-y-0.5">
              {siteIntelligenceItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-neutral-800 text-amber-400 font-semibold'
                          : 'bg-amber-50 text-amber-900 font-semibold'
                        : isDark
                        ? 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-amber-400'
                            : isDark
                            ? 'text-neutral-400 group-hover:text-neutral-300'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`ml-2 shrink-0 rounded px-1.5 py-0.2 font-mono text-[10px] font-semibold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-rose-500/90 uppercase flex items-center justify-between">
              <span>Security & Assistant</span>
              <span className="text-[9px] font-mono px-1 rounded bg-rose-500/10 text-rose-400">SHIELD</span>
            </div>
            <div className="space-y-0.5">
              {securityAssistantItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-neutral-800 text-rose-400 font-semibold'
                          : 'bg-rose-50 text-rose-900 font-semibold'
                        : isDark
                        ? 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-rose-400'
                            : isDark
                            ? 'text-neutral-400 group-hover:text-neutral-300'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`ml-2 shrink-0 rounded px-1.5 py-0.2 font-mono text-[10px] font-semibold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
              Preferences
            </div>
            <button
              onClick={() => {
                onSelectTab('settings');
                onCloseMobile();
              }}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                currentTab === 'settings'
                  ? isDark
                    ? 'bg-neutral-800 text-emerald-400 font-semibold'
                    : 'bg-emerald-50 text-emerald-800 font-semibold'
                  : isDark
                  ? 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Settings
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    currentTab === 'settings'
                      ? 'text-emerald-500'
                      : isDark
                      ? 'text-neutral-400 group-hover:text-neutral-300'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">Settings</span>
              </div>
            </button>
          </div>
        </nav>

        {/* Live operational summary card */}
        <div className="p-3">
          <div
            className={`rounded-lg border p-3 ${
              isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 font-medium">Network Probes</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-center text-xs">
              <div
                className={`rounded p-1.5 ${
                  isDark ? 'bg-neutral-900' : 'bg-white border border-slate-200'
                }`}
              >
                <div className="font-mono text-base font-bold text-emerald-500">
                  {monitors.filter(m => m.status === 'up').length}
                </div>
                <div className="text-[10px] text-neutral-400">Up</div>
              </div>
              <div
                className={`rounded p-1.5 ${
                  isDark ? 'bg-neutral-900' : 'bg-white border border-slate-200'
                }`}
              >
                <div
                  className={`font-mono text-base font-bold ${
                    downCount > 0 ? 'text-rose-500' : 'text-neutral-400'
                  }`}
                >
                  {downCount}
                </div>
                <div className="text-[10px] text-neutral-400">Down</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Account & Theme */}
        <div className="border-t p-3 border-inherit space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isDark
                  ? 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Toggle Dark/Light Mode"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              onClick={onOpenAuth}
              className={`rounded-md p-1.5 text-xs transition-colors ${
                isDark
                  ? 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title="Account Settings / Switch"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          </div>

          <div
            onClick={onOpenAuth}
            className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between ${
              isDark ? 'hover:bg-neutral-800/80 text-neutral-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="truncate">
              <div className="font-medium truncate">{userEmail}</div>
              <div className="text-[10px] text-neutral-400 font-mono">Workspace Admin</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
          </div>
        </div>
      </aside>
    </>
  );
};
