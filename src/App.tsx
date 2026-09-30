import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header, RefreshIntervalChoice } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { WebsiteChecker } from './components/instant/WebsiteChecker';
import { BulkCheckView } from './components/bulk/BulkCheckView';
import { PortChecker } from './components/port/PortChecker';
import { WatchManager } from './components/watch/WatchManager';
import { IncidentTimeline } from './components/incidents/IncidentTimeline';
import { HistoryLogs } from './components/history/HistoryLogs';
import { ToolsView } from './components/tools/ToolsView';
import { PublicStatusPageView } from './components/statuspage/PublicStatusPageView';
import { SettingsView } from './components/settings/SettingsView';
import { FavoritesManagerView } from './components/favorites/FavoritesManagerView';
import { ContentChangesView } from './components/intelligence/ContentChangesView';
import { CrawlerScannerView } from './components/intelligence/CrawlerScannerView';
import { AnomalyDetectionView } from './components/intelligence/AnomalyDetectionView';
import { DefacementDetectionView } from './components/security/DefacementDetectionView';
import { ScreenshotComparisonView } from './components/security/ScreenshotComparisonView';
import { MonitorModal } from './components/monitors/MonitorModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { QrCodeModal } from './components/common/QrCodeModal';
import { VoiceAssistantModal } from './components/voice/VoiceAssistantModal';
import { MonitorQrModal } from './components/qr/MonitorQrModal';
import { QrScannerModal } from './components/qr/QrScannerModal';
import {
  Monitor,
  Incident,
  NotificationItem,
  UserProfile,
  StatusPageConfig,
  CheckLog,
  FavoriteSite,
  ContentChangeEvent,
  CrawlScanResult,
  AnomalyEvent,
  DefacementRecord,
  ScreenshotItem
} from './types';
import { api } from './services/api';
import { soundService } from './services/sound';
import { CheckCircle2, AlertTriangle, Eye, X, Star } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refresh Mode & Interval (Remembered in localStorage & profile)
  const [refreshMode, setRefreshMode] = useState<'auto' | 'manual'>(() => {
    const saved = localStorage.getItem('uptime_refresh_mode');
    if (saved === 'manual' || saved === 'auto') return saved;
    return 'auto';
  });

  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('uptime_refresh_interval');
    if (saved && !isNaN(Number(saved))) return Number(saved);
    return 30;
  });

  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() => {
    return new Date().toLocaleTimeString();
  });

  // Core Data
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [logs, setLogs] = useState<CheckLog[]>([]);
  const [favorites, setFavorites] = useState<FavoriteSite[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statusPage, setStatusPage] = useState<StatusPageConfig | null>(null);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  // Site Intelligence Data
  const [contentChanges, setContentChanges] = useState<ContentChangeEvent[]>([]);
  const [crawlerScans, setCrawlerScans] = useState<CrawlScanResult[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);

  // Security & Assistant Data
  const [defacementRecords, setDefacementRecords] = useState<DefacementRecord[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('uptime_voice_alerts') === 'true';
  });

  const handleToggleVoiceAlerts = useCallback(() => {
    setVoiceAlertsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('uptime_voice_alerts', String(next));
      if (next) {
        soundService.speakAlert('Voice alerts activated.');
      }
      return next;
    });
  }, []);

  // Toast banner for live recovery and alerts
  const [activeToast, setActiveToast] = useState<{
    id: string;
    type: 'recovery' | 'down' | 'watch';
    title: string;
    message: string;
  } | null>(null);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [selectedMonitorForQr, setSelectedMonitorForQr] = useState<Monitor | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrScannerMode, setQrScannerMode] = useState<'add-monitor' | 'link-phone'>('add-monitor');

  // Sync Dark Mode class on html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      const [
        fetchedMonitors,
        fetchedIncidents,
        fetchedNotifs,
        fetchedLogs,
        fetchedProfile,
        fetchedStatusPage,
        fetchedFavs,
        fetchedContentChanges,
        fetchedCrawlScans,
        fetchedAnomalies,
        fetchedDefacement,
        fetchedScreenshots
      ] = await Promise.all([
        api.getMonitors(),
        api.getIncidents(),
        api.getNotifications(),
        api.getLogs(),
        api.getProfile(),
        api.getStatusPage(),
        api.getFavorites(),
        api.getContentChanges(),
        api.getCrawlerScans(),
        api.getAnomalies(),
        api.getDefacementRecords(),
        api.getScreenshots()
      ]);

      setMonitors(fetchedMonitors);
      setIncidents(fetchedIncidents);
      setNotifications(fetchedNotifs);
      setLogs(fetchedLogs);
      setProfile(fetchedProfile);
      setStatusPage(fetchedStatusPage);
      setFavorites(fetchedFavs);
      setContentChanges(fetchedContentChanges);
      setCrawlerScans(fetchedCrawlScans);
      setAnomalies(fetchedAnomalies);
      setDefacementRecords(fetchedDefacement);
      setScreenshots(fetchedScreenshots);

      if (fetchedProfile?.refreshMode) {
        setRefreshMode(fetchedProfile.refreshMode);
      }
      if (fetchedProfile?.refreshInterval) {
        setRefreshInterval(fetchedProfile.refreshInterval);
      }
      setLastUpdatedTime(new Date().toLocaleTimeString());
    } catch {
      // Handled by service fallbacks
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manual & Auto Refresh handler
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [updated, incs, notifs, logsRes, favsRes, anoms, defRes, shotRes] = await Promise.all([
        api.getMonitors(),
        api.getIncidents(),
        api.getNotifications(),
        api.getLogs(),
        api.getFavorites(),
        api.getAnomalies(),
        api.getDefacementRecords(),
        api.getScreenshots()
      ]);
      setMonitors(updated);
      setIncidents(incs);
      setNotifications(notifs);
      setLogs(logsRes);
      setFavorites(favsRes);
      setAnomalies(anoms);
      setDefacementRecords(defRes);
      setScreenshots(shotRes);
      setLastUpdatedTime(new Date().toLocaleTimeString());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Autonomous Background Watch Down Servers Loop (Every 30 seconds, runs EVEN in manual mode)
  useEffect(() => {
    const watchInterval = setInterval(async () => {
      const watched = monitors.filter(m => m.isWatched);
      if (watched.length === 0) return;

      for (const w of watched) {
        try {
          const { monitor } = await api.runCheckNow(w.id);
          if (monitor.status === 'up' && w.status !== 'up') {
            soundService.playRecoveryChime();
            setActiveToast({
              id: 'watch_rec_' + Date.now(),
              type: 'recovery',
              title: `WATCH ALERT: ${monitor.name} is Back Online!`,
              message: `Service recovered at ${new Date().toLocaleTimeString()} with ${monitor.responseTimeMs}ms response time.`
            });
            const notifs = await api.getNotifications();
            setNotifications(notifs);
          }
        } catch {
          // background quiet
        }
      }

      const freshMonitors = await api.getMonitors();
      setMonitors(freshMonitors);
    }, 30000);

    return () => clearInterval(watchInterval);
  }, [monitors]);

  // Refresh Mode Handlers
  const handleToggleRefreshMode = useCallback(() => {
    setRefreshMode(prev => {
      const next = prev === 'auto' ? 'manual' : 'auto';
      localStorage.setItem('uptime_refresh_mode', next);
      if (profile) {
        api.updateProfile({ refreshMode: next });
      }
      return next;
    });
  }, [profile]);

  const handleChangeRefreshInterval = useCallback((choice: RefreshIntervalChoice) => {
    if (choice === 'manual') {
      setRefreshMode('manual');
      localStorage.setItem('uptime_refresh_mode', 'manual');
      if (profile) {
        api.updateProfile({ refreshMode: 'manual' });
      }
    } else {
      setRefreshMode('auto');
      setRefreshInterval(choice);
      localStorage.setItem('uptime_refresh_mode', 'auto');
      localStorage.setItem('uptime_refresh_interval', String(choice));
      if (profile) {
        api.updateProfile({ refreshMode: 'auto', refreshInterval: choice });
      }
    }
  }, [profile]);

  // Site Intelligence Actions
  const handleRefreshContentChanges = async () => {
    const fresh = await api.getContentChanges();
    setContentChanges(fresh);
  };

  const handleMarkContentChangeExpected = async (id: string, expected: boolean) => {
    await api.markContentChangeExpected(id, expected);
    setContentChanges(prev => prev.map(c => c.id === id ? { ...c, isExpected: expected } : c));
  };

  const handleDeleteContentChange = async (id: string) => {
    await api.deleteContentChange(id);
    setContentChanges(prev => prev.filter(c => c.id !== id));
  };

  const handleRefreshCrawlerScans = async () => {
    const fresh = await api.getCrawlerScans();
    setCrawlerScans(fresh);
  };

  const handleDeleteCrawlerScan = async (id: string) => {
    await api.deleteCrawlerScan(id);
    setCrawlerScans(prev => prev.filter(s => s.id !== id));
  };

  const handleRefreshAnomalies = async () => {
    const fresh = await api.getAnomalies();
    setAnomalies(fresh);
  };

  const handleActOnAnomaly = async (id: string, action: 'ignore' | 'investigate') => {
    const updated = await api.actOnAnomaly(id, action);
    setAnomalies(updated);
  };

  const handleDeleteAnomaly = async (id: string) => {
    await api.deleteAnomaly(id);
    setAnomalies(prev => prev.filter(a => a.id !== id));
  };

  const handleUpdateMonitorIntelligence = async (id: string, updates: Partial<Monitor>) => {
    const updated = await api.updateMonitor(id, updates);
    setMonitors(prev => prev.map(m => m.id === id ? updated : m));
  };

  // Check Single Monitor Now
  const handleCheckNow = async (id: string) => {
    setCheckingIds(prev => new Set(prev).add(id));
    try {
      const { monitor, log } = await api.runCheckNow(id);
      setMonitors(prev => prev.map(m => m.id === id ? monitor : m));
      if (log) {
        setLogs(prev => [log, ...prev]);
      }

      if (monitor.status === 'down') {
        soundService.playDowntimeAlert();
        setActiveToast({
          id: 'toast_' + Date.now(),
          type: 'down',
          title: `Alert: ${monitor.name} is Down`,
          message: monitor.lastStatusReason || 'Server failed to respond to probe. Click Watch to track recovery.'
        });
      } else if (monitor.status === 'blocked') {
        soundService.playClick();
        setActiveToast({
          id: 'toast_' + Date.now(),
          type: 'watch',
          title: `Notice: ${monitor.name} Blocked Checks`,
          message: monitor.lastStatusReason || 'Server is online but blocked automated checks (401/403/429/WAF).'
        });
      } else {
        soundService.playClick();
      }
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Toggle Watch Mode
  const handleToggleWatch = async (id: string) => {
    const updated = await api.toggleWatch(id);
    setMonitors(prev => prev.map(m => m.id === id ? updated : m));

    if (updated.isWatched) {
      soundService.playClick();
      setActiveToast({
        id: 'toast_' + Date.now(),
        type: 'watch',
        title: `Watching: ${updated.name}`,
        message: 'High-frequency 30s checks active. You will be alerted the second it comes back online!'
      });
    }
  };

  // Simulate Recovery (for instant user testing of watch chime & notification)
  const handleSimulateRecovery = async (id: string) => {
    const updated = await api.simulateRecovery(id);
    setMonitors(prev => prev.map(m => m.id === id ? updated : m));
    soundService.playRecoveryChime();

    setActiveToast({
      id: 'toast_' + Date.now(),
      type: 'recovery',
      title: `WATCH ALERT: ${updated.name} is Back Online!`,
      message: `Watched server recovered at ${updated.backOnlineAt} with 52ms response time.`
    });

    const notifs = await api.getNotifications();
    setNotifications(notifs);
  };

  // Pause / Resume
  const handleTogglePause = async (id: string, currentlyPaused: boolean) => {
    const nextStatus = currentlyPaused ? 'up' : 'paused';
    const updated = await api.updateMonitor(id, { status: nextStatus });
    setMonitors(prev => prev.map(m => m.id === id ? updated : m));
  };

  // Save Monitor (Create or Update)
  const handleSaveMonitor = async (monData: Partial<Monitor>) => {
    if (editingMonitor) {
      const updated = await api.updateMonitor(editingMonitor.id, monData);
      setMonitors(prev => prev.map(m => m.id === editingMonitor.id ? updated : m));
    } else {
      const created = await api.createMonitor(monData);
      setMonitors(prev => [created, ...prev]);
    }
  };

  // Delete Monitor
  const handleDeleteMonitor = async (id: string) => {
    await api.deleteMonitor(id);
    setMonitors(prev => prev.filter(m => m.id !== id));
  };

  // Bulk Import
  const handleBulkImport = async (imported: Partial<Monitor>[]) => {
    for (const item of imported) {
      await api.createMonitor(item);
    }
    const fresh = await api.getMonitors();
    setMonitors(fresh);
  };

  // Mark all notifications read
  const handleMarkAllNotifsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Clear all notifications
  const handleClearAllNotifs = async () => {
    await api.clearNotifications();
    setNotifications([]);
  };

  // Favorites Helpers & Actions
  const isStarred = useCallback((rawUrl: string): boolean => {
    if (!rawUrl) return false;
    const clean = rawUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
    return favorites.some(f => {
      const fClean = f.url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
      return fClean === clean;
    });
  }, [favorites]);

  const handleToggleStar = async (site: {
    url: string;
    name?: string;
    status?: 'up' | 'blocked' | 'down' | 'pending';
    responseTimeMs?: number;
    statusCode?: number;
    sslDaysRemaining?: number | null;
  }) => {
    try {
      const res = await api.toggleFavorite(site);
      if (res.error) {
        soundService.playClick();
        setActiveToast({
          id: 'toast_' + Date.now(),
          type: 'down',
          title: 'Favorites Limit Reached (20/20)',
          message: res.error
        });
        return;
      }

      setFavorites(res.favorites);
      soundService.playClick();
      setActiveToast({
        id: 'toast_' + Date.now(),
        type: res.isStarred ? 'recovery' : 'watch',
        title: res.isStarred ? '⭐ Added to Favorites' : 'Removed from Favorites',
        message: res.message
      });
    } catch {
      // Fallback
    }
  };

  const handleUpdateFavorite = async (id: string, updates: Partial<FavoriteSite>) => {
    const updated = await api.updateFavorite(id, updates);
    setFavorites(prev => prev.map(f => f.id === id ? updated : f));
  };

  const handleDeleteFavorite = async (id: string) => {
    await api.deleteFavorite(id);
    setFavorites(prev => prev.filter(f => f.id !== id));
    setActiveToast({
      id: 'toast_' + Date.now(),
      type: 'watch',
      title: 'Removed from Favorites',
      message: 'Website unstarred and removed from your favorites.'
    });
  };

  const handleReorderFavorites = async (orderedIds: string[]) => {
    const reordered = await api.reorderFavorites(orderedIds);
    setFavorites(reordered);
  };

  const handleCheckAllFavorites = async () => {
    const updated = await api.checkAllFavorites();
    setFavorites(updated);
    soundService.playClick();
    setActiveToast({
      id: 'toast_' + Date.now(),
      type: 'recovery',
      title: 'Favorites Check Complete',
      message: `Refreshed real-time status for all ${updated.length} starred sites.`
    });
  };

  const handleCheckFavorite = async (id: string) => {
    const updated = await api.checkFavorite(id);
    setFavorites(prev => prev.map(f => f.id === id ? updated : f));
    soundService.playClick();
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Toast Alert Banner */}
      {activeToast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-start gap-3 rounded-xl border p-4 shadow-2xl transition-all max-w-sm ${
            activeToast.type === 'recovery'
              ? 'border-emerald-500/50 bg-neutral-900 text-neutral-100 ring-2 ring-emerald-500/30'
              : activeToast.type === 'down'
              ? 'border-rose-500/50 bg-neutral-900 text-neutral-100 ring-2 ring-rose-500/30'
              : 'border-sky-500/50 bg-neutral-900 text-neutral-100 ring-2 ring-sky-500/30'
          }`}
        >
          {activeToast.type === 'recovery' && <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />}
          {activeToast.type === 'down' && <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />}
          {activeToast.type === 'watch' && <Eye className="h-5 w-5 text-sky-400 mt-0.5 shrink-0" />}

          <div className="flex-1 text-xs">
            <div className="font-bold text-sm">{activeToast.title}</div>
            <div className="mt-0.5 text-neutral-400">{activeToast.message}</div>
          </div>

          <button
            onClick={() => setActiveToast(null)}
            className="text-neutral-500 hover:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Responsive Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        monitors={monitors}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        userEmail={profile?.email || 'admin@uptimechecker.pro'}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        favoritesCount={favorites.length}
        contentChangesCount={contentChanges.filter(c => !c.isExpected).length}
        brokenItemsCount={crawlerScans[0]?.brokenLinksCount ? crawlerScans[0].brokenLinksCount + crawlerScans[0].brokenImagesCount : 0}
        anomaliesCount={anomalies.filter(a => a.status === 'active').length}
        defacementAlertsCount={defacementRecords.filter(r => (r.riskScore === 'high' || r.riskScore === 'critical') && r.status === 'active').length}
        screenshotAlertsCount={screenshots.filter(s => s.status === 'alert').length}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Header
          currentTab={currentTab}
          onOpenAddMonitor={() => {
            setEditingMonitor(null);
            setIsAddEditModalOpen(true);
          }}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadNotifsCount}
          refreshMode={refreshMode}
          refreshInterval={refreshInterval}
          onToggleRefreshMode={handleToggleRefreshMode}
          onChangeRefreshInterval={handleChangeRefreshInterval}
          onManualRefresh={handleRefreshAll}
          isRefreshing={isRefreshing}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          isDark={isDark}
          onNavigateToTab={setCurrentTab}
          lastUpdatedTime={lastUpdatedTime}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          voiceAlertsEnabled={voiceAlertsEnabled}
          onToggleVoiceAlerts={handleToggleVoiceAlerts}
          onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              monitors={monitors}
              onCheckNow={handleCheckNow}
              onToggleWatch={handleToggleWatch}
              onTogglePause={handleTogglePause}
              onEditMonitor={(m) => {
                setEditingMonitor(m);
                setIsAddEditModalOpen(true);
              }}
              onDeleteMonitor={handleDeleteMonitor}
              onOpenAddModal={() => {
                setEditingMonitor(null);
                setIsAddEditModalOpen(true);
              }}
              checkingIds={checkingIds}
              isDark={isDark}
              favorites={favorites}
              isStarred={isStarred}
              onToggleStar={handleToggleStar}
              onNavigateToFavorites={() => setCurrentTab('favorites')}
              onCheckFavorite={handleCheckFavorite}
              onCheckAllFavorites={handleCheckAllFavorites}
              anomalies={anomalies}
              defacementRecords={defacementRecords}
              screenshots={screenshots}
              incidents={incidents}
              onNavigateToTab={(tab) => setCurrentTab(tab as any)}
              onOpenMonitorQr={(m) => setSelectedMonitorForQr(m)}
            />
          )}

          {currentTab === 'favorites' && (
            <FavoritesManagerView
              favorites={favorites}
              monitors={monitors}
              isDark={isDark}
              onToggleStar={handleToggleStar}
              onUpdateFavorite={handleUpdateFavorite}
              onDeleteFavorite={handleDeleteFavorite}
              onReorderFavorites={handleReorderFavorites}
              onCheckAllFavorites={handleCheckAllFavorites}
              onCheckFavorite={handleCheckFavorite}
              onTrackAsMonitor={(url, name) => {
                setEditingMonitor({
                  id: '',
                  name,
                  url,
                  type: 'http',
                  intervalMinutes: 5,
                  status: 'up',
                  lastCheckedAt: new Date().toISOString(),
                  responseTimeMs: 45,
                  uptime24h: 100,
                  uptime7d: 100,
                  uptime30d: 100,
                  uptime90d: 100,
                  tags: ['Favorite'],
                  maintenanceMode: false,
                  isWatched: false,
                  notificationChannels: { email: true, browser: true, sound: true },
                  createdAt: new Date().toISOString()
                });
                setIsAddEditModalOpen(true);
              }}
              onEnableWatch={handleToggleWatch}
              onNavigateToWebsiteCheck={(_url) => {
                setCurrentTab('instant-check');
              }}
            />
          )}

          {currentTab === 'instant-check' && (
            <WebsiteChecker
              onAddMonitorFromUrl={(url, name) => {
                setEditingMonitor({
                  id: '',
                  name,
                  url,
                  type: 'http',
                  intervalMinutes: 5,
                  status: 'up',
                  lastCheckedAt: new Date().toISOString(),
                  responseTimeMs: 45,
                  uptime24h: 100,
                  uptime7d: 100,
                  uptime30d: 100,
                  uptime90d: 100,
                  tags: ['Website'],
                  maintenanceMode: false,
                  isWatched: false,
                  notificationChannels: { email: true, browser: true, sound: true },
                  createdAt: new Date().toISOString()
                });
                setIsAddEditModalOpen(true);
              }}
              isDark={isDark}
              favorites={favorites}
              isStarred={isStarred}
              onToggleStar={handleToggleStar}
              monitors={monitors}
              onCheckAllFavorites={handleCheckAllFavorites}
              onEnableWatch={handleToggleWatch}
            />
          )}

          {currentTab === 'bulk-check' && (
            <BulkCheckView
              isDark={isDark}
              existingMonitors={monitors}
              onAddMonitorFromUrl={(url, name) => {
                setEditingMonitor({
                  id: '',
                  name,
                  url,
                  type: 'http',
                  intervalMinutes: 5,
                  status: 'up',
                  lastCheckedAt: new Date().toISOString(),
                  responseTimeMs: 45,
                  uptime24h: 100,
                  uptime7d: 100,
                  uptime30d: 100,
                  uptime90d: 100,
                  tags: ['Bulk Check'],
                  maintenanceMode: false,
                  isWatched: false,
                  notificationChannels: { email: true, browser: true, sound: true },
                  createdAt: new Date().toISOString()
                });
                setIsAddEditModalOpen(true);
              }}
              onBulkAddMonitors={handleBulkImport}
              onToggleWatch={handleToggleWatch}
              onNavigateToTab={setCurrentTab}
              isStarred={isStarred}
              onToggleStar={handleToggleStar}
            />
          )}

          {currentTab === 'port-checker' && (
            <PortChecker
              onAddPortMonitor={(host, port) => {
                setEditingMonitor({
                  id: '',
                  name: `Port ${port} (${host})`,
                  url: host,
                  type: 'port',
                  port,
                  intervalMinutes: 5,
                  status: 'up',
                  lastCheckedAt: new Date().toISOString(),
                  responseTimeMs: 30,
                  uptime24h: 100,
                  uptime7d: 100,
                  uptime30d: 100,
                  uptime90d: 100,
                  tags: ['Port'],
                  maintenanceMode: false,
                  isWatched: false,
                  notificationChannels: { email: true, browser: true, sound: true },
                  createdAt: new Date().toISOString()
                });
                setIsAddEditModalOpen(true);
              }}
              isDark={isDark}
            />
          )}

          {currentTab === 'watch-mode' && (
            <WatchManager
              monitors={monitors}
              onToggleWatch={handleToggleWatch}
              onSimulateRecovery={handleSimulateRecovery}
              onCheckNow={handleCheckNow}
              isDark={isDark}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentTimeline
              incidents={incidents}
              monitors={monitors}
              isDark={isDark}
              onUpdateIncidents={(newIncidents) => setIncidents(newIncidents)}
              onUpdateMonitor={(updated) => setMonitors(prev => prev.map(m => m.id === updated.id ? updated : m))}
            />
          )}

          {currentTab === 'logs' && (
            <HistoryLogs
              logs={logs}
              monitors={monitors}
              isDark={isDark}
              onUpdateLogs={(newLogs) => setLogs(newLogs)}
              isStarred={isStarred}
              onToggleStar={handleToggleStar}
            />
          )}

          {currentTab === 'tools' && (
            <ToolsView
              onBulkImportMonitors={handleBulkImport}
              isDark={isDark}
              monitors={monitors}
              onNavigateToTab={setCurrentTab}
            />
          )}

          {currentTab === 'content-changes' && (
            <ContentChangesView
              changes={contentChanges}
              monitors={monitors}
              isDark={isDark}
              onRefreshChanges={handleRefreshContentChanges}
              onMarkExpected={handleMarkContentChangeExpected}
              onDeleteChange={handleDeleteContentChange}
              onUpdateMonitor={handleUpdateMonitorIntelligence}
            />
          )}

          {currentTab === 'crawler-scanner' && (
            <CrawlerScannerView
              scans={crawlerScans}
              monitors={monitors}
              isDark={isDark}
              onRefreshScans={handleRefreshCrawlerScans}
              onDeleteScan={handleDeleteCrawlerScan}
              onUpdateMonitor={handleUpdateMonitorIntelligence}
            />
          )}

          {currentTab === 'anomalies' && (
            <AnomalyDetectionView
              anomalies={anomalies}
              monitors={monitors}
              isDark={isDark}
              onRefreshAnomalies={handleRefreshAnomalies}
              onActOnAnomaly={handleActOnAnomaly}
              onDeleteAnomaly={handleDeleteAnomaly}
              onUpdateMonitor={handleUpdateMonitorIntelligence}
            />
          )}

          {currentTab === 'defacement-detection' && (
            <DefacementDetectionView
              monitors={monitors}
              records={defacementRecords}
              isDark={isDark}
              onRefreshRecords={async () => {
                const fresh = await api.getDefacementRecords();
                setDefacementRecords(fresh);
              }}
              onUpdateRecord={(rec: DefacementRecord) => {
                setDefacementRecords((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)]);
              }}
              onDeleteRecord={async (id: string) => {
                await api.deleteDefacementRecord(id);
                setDefacementRecords((prev) => prev.filter((r) => r.id !== id));
              }}
              onUpdateMonitor={(updated: Monitor) => {
                setMonitors((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
              }}
            />
          )}

          {currentTab === 'screenshot-comparison' && (
            <ScreenshotComparisonView
              monitors={monitors}
              screenshots={screenshots}
              isDark={isDark}
              onRefreshScreenshots={async () => {
                const fresh = await api.getScreenshots();
                setScreenshots(fresh);
              }}
              onUpdateScreenshot={(shot: ScreenshotItem) => {
                setScreenshots((prev) => [shot, ...prev.filter((s) => s.id !== shot.id)]);
              }}
              onDeleteScreenshot={async (id: string) => {
                await api.deleteScreenshot(id);
                setScreenshots((prev) => prev.filter((s) => s.id !== id));
              }}
              onUpdateMonitor={(updated: Monitor) => {
                setMonitors((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
              }}
            />
          )}

          {currentTab === 'status-page' && statusPage && (
            <PublicStatusPageView
              statusPage={statusPage}
              onUpdateStatusPage={async (updates) => {
                const fresh = await api.updateStatusPage(updates);
                setStatusPage(fresh);
              }}
              monitors={monitors}
              incidents={incidents}
              isDark={isDark}
            />
          )}

          {currentTab === 'settings' && profile && (
            <SettingsView
              profile={profile}
              onUpdateProfile={async (updates) => {
                const fresh = await api.updateProfile(updates);
                setProfile(fresh);
              }}
              isDark={isDark}
              onToggleTheme={() => setIsDark(!isDark)}
              onRemoveDemoData={async () => {
                const res = await api.removeDemoData();
                setMonitors(res.monitors);
                setIncidents(res.incidents);
                setLogs(res.logs);
              }}
              onResetAllData={async () => {
                await api.resetAllData('DELETE');
                setMonitors([]);
                setIncidents([]);
                setLogs([]);
                setNotifications([]);
              }}
            />
          )}
        </main>
      </div>

      {/* Add / Edit Monitor Modal */}
      <MonitorModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingMonitor(null);
        }}
        onSave={handleSaveMonitor}
        editingMonitor={editingMonitor}
        isDark={isDark}
      />

      {/* Notification Center Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotifsRead}
        onClearAll={handleClearAllNotifs}
        isDark={isDark}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={(email) => {
          if (profile) {
            setProfile({ ...profile, email, fullName: email.split('@')[0] });
          }
        }}
        currentEmail={profile?.email || 'admin@uptimechecker.pro'}
        isDark={isDark}
      />

      {/* QR Code Diagnostics Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        isDark={isDark}
        statusPageSlug={statusPage?.slug || 'global-network'}
        onOpenScanner={() => {
          setQrScannerMode('add-monitor');
          setIsQrScannerOpen(true);
        }}
      />

      {/* Voice Monitoring Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        monitors={monitors}
        notifications={notifications}
        onRefreshDashboard={handleRefreshAll}
        onNavigateToTab={(tab) => setCurrentTab(tab as any)}
        onToggleRefreshMode={handleToggleRefreshMode}
        refreshMode={refreshMode}
        onToggleWatch={handleToggleWatch}
        isDark={isDark}
        voiceAlertsEnabled={voiceAlertsEnabled}
        onToggleVoiceAlerts={handleToggleVoiceAlerts}
      />

      {/* Monitor QR & Mobile Pass Modal */}
      <MonitorQrModal
        isOpen={selectedMonitorForQr !== null}
        onClose={() => setSelectedMonitorForQr(null)}
        monitor={selectedMonitorForQr}
        isDark={isDark}
        statusPageSlug={statusPage?.slug || 'global-network'}
      />

      {/* QR Scanner Modal (Camera scanning to add monitor or link phone) */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        initialMode={qrScannerMode}
        onScannedUrl={(scannedUrl) => {
          setIsQrScannerOpen(false);
          let hostname = scannedUrl;
          try {
            hostname = new URL(scannedUrl.startsWith('http') ? scannedUrl : `https://${scannedUrl}`).hostname;
          } catch {}
          setEditingMonitor({
            id: '',
            name: hostname || 'Scanned Service',
            url: scannedUrl,
            type: 'http',
            intervalMinutes: 5,
            status: 'up',
            lastCheckedAt: new Date().toISOString(),
            responseTimeMs: 50,
            uptime24h: 100,
            uptime7d: 100,
            uptime30d: 100,
            uptime90d: 100,
            createdAt: new Date().toISOString(),
            tags: ['QR Added'],
            maintenanceMode: false,
            isWatched: false,
            notificationChannels: { email: true, browser: true, sound: true }
          });
          setIsAddEditModalOpen(true);
        }}
        onLinkedPhone={() => {
          setIsQrScannerOpen(false);
        }}
        isDark={isDark}
      />
    </div>
  );
}
