export type MonitorType = 'http' | 'port' | 'ping' | 'keyword';

export type MonitorStatus = 'up' | 'blocked' | 'down' | 'paused' | 'pending';

export interface Monitor {
  id: string;
  name: string;
  url: string; // or hostname for port/ping
  type: MonitorType;
  port?: number;
  keyword?: string;
  acceptedStatusCodes?: string; // e.g. "200-299, 403"
  customUserAgent?: string;
  intervalMinutes: number;
  status: MonitorStatus;
  lastCheckedAt: string | null;
  responseTimeMs: number;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  uptime90d: number;
  tags: string[];
  maintenanceMode: boolean;
  isWatched: boolean; // Watch feature: notify immediately when back up
  watchedSince?: string | null;
  backOnlineAt?: string | null;
  lastStatusReason?: string;
  notificationChannels: {
    email: boolean;
    browser: boolean;
    sound: boolean;
    webhook?: string;
  };
  sslInfo?: SSLCertInfo;
  createdAt: string;
  // Site Intelligence configurations per monitor
  contentChangeConfig?: {
    enabled: boolean;
    intervalMinutes: number; // 15, 60, 360, 1440
    selector?: string;
    ignoreText?: string;
    notifyThresholdPercent?: number; // e.g. 10
    triggerKeyword?: string;
    lastContentHash?: string;
    lastContentSnapshot?: string;
    lastCheckedAt?: string;
  };
  crawlerConfig?: {
    enabled: boolean;
    depth: number; // 1, 50, 100, 500
    checkExternal: boolean;
    schedule: 'manual' | 'weekly' | 'monthly';
    lastScanAt?: string;
    brokenCount?: number;
  };
  anomalyConfig?: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    baselineLatency?: number;
    stdDevLatency?: number;
  };
  // Security & Assistant configurations per monitor
  defacementConfig?: {
    enabled: boolean;
    baselineSet: boolean;
    lastCheckedAt?: string;
    riskScore?: 'low' | 'medium' | 'high' | 'critical';
    baseline?: DefacementBaseline;
  };
  screenshotConfig?: {
    enabled: boolean;
    schedule: 'hourly' | 'daily' | 'weekly';
    thresholdPercent: number; // e.g. 10
    lastCapturedAt?: string;
    lastDiffPercent?: number;
  };
  rootCauseConfig?: {
    enabled: boolean;
    autoTroubleshoot: boolean;
  };
}

export interface SSLCertInfo {
  valid: boolean;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  warning14Days: boolean;
  protocol?: string;
}

export type LogEventType = 'check' | 'content_change' | 'broken_link' | 'anomaly';

export interface CheckLog {
  id: string;
  monitorId: string;
  monitorName: string;
  status: 'up' | 'blocked' | 'down';
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
  message?: string;
  reason?: string;
  eventType?: LogEventType;
  details?: Record<string, any>;
}

export interface Incident {
  id: string;
  monitorId: string;
  monitorName: string;
  monitorUrl: string;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number | null;
  status: 'ongoing' | 'resolved';
  cause: string;
  type?: 'outage' | 'anomaly' | 'content_change' | 'defacement';
  rootCause?: RootCauseInfo;
  defacementRecordId?: string;
  screenshotDiffPercent?: number;
}

export interface NotificationItem {
  id: string;
  monitorId?: string;
  title: string;
  message: string;
  type: 'down' | 'recovered' | 'watch_alert' | 'maintenance' | 'system' | 'content_changed' | 'broken_link' | 'anomaly' | 'defacement' | 'screenshot_alert';
  timestamp: string;
  read: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  timezone: string;
  apiKey: string;
  alertEmail: string;
  webhookUrl: string;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  logRetentionDays?: number; // 0 = Never, 30, 60, 90
  refreshMode?: 'auto' | 'manual';
  refreshInterval?: number; // 15, 30, 60, 300
  notifyContentChanges?: boolean;
  notifyBrokenLinks?: boolean;
  notifyAnomalies?: boolean;
}

export interface ClearHistoryOptions {
  scope: 'all' | 'filtered';
  olderThan?: 'all' | '24h' | '7d' | '30d' | '90d';
  monitorId?: string; // 'all' or specific monitor ID
  statusFilter?: 'all' | 'up' | 'down' | 'blocked';
  dataTypes?: {
    checks?: boolean;
    contentChanges?: boolean;
    crawlerScans?: boolean;
    anomalies?: boolean;
    defacements?: boolean;
    screenshots?: boolean;
    mobileLogs?: boolean;
  };
}

export interface StatusPageConfig {
  id: string;
  title: string;
  description: string;
  slug: string;
  isPublic: boolean;
  publishedMonitorIds: string[];
  customMessage?: string;
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'MX' | 'NS' | 'TXT' | 'CNAME';
  value: string;
  ttl?: number;
  priority?: number;
}

export interface BulkCheckResult {
  id: string;
  url: string;
  cleanUrl: string;
  classification: 'up' | 'blocked' | 'down' | 'pending' | 'checking';
  statusCode: number;
  responseTimeMs: number;
  sslDaysRemaining?: number | null;
  sslValid?: boolean;
  reason: string;
  message?: string;
  checkedAt: string;
  error?: string;
}

export interface BulkGroup {
  id: string;
  name: string;
  urls: string[];
  createdAt: string;
}

export interface FavoriteSite {
  id: string;
  userId?: string;
  user_id?: string;
  url: string;
  name: string;
  createdAt: string;
  created_at?: string;
  lastStatus: 'up' | 'blocked' | 'down' | 'pending';
  last_status?: 'up' | 'blocked' | 'down' | 'pending';
  lastCheckedAt: string | null;
  last_checked_at?: string | null;
  lastResponseTimeMs: number;
  last_response_time_ms?: number;
  statusCode?: number;
  sslDaysRemaining?: number | null;
  pinned: boolean;
  orderIndex: number;
  uptimePercent?: number;
}

// -------------------------------------------------------------
// Site Intelligence: 1. Content Change Detection
// -------------------------------------------------------------
export interface ContentChangeEvent {
  id: string;
  monitorId: string;
  monitorName: string;
  url: string;
  timestamp: string;
  oldHash: string;
  newHash: string;
  changePercent: number; // e.g. 14.5%
  oldSnapshot: string;
  newSnapshot: string;
  diffSummary?: {
    linesAdded: number;
    linesRemoved: number;
    wordsChanged: number;
  };
  isExpected: boolean; // marked as expected by user
  keywordTriggered?: string;
  targetSelector?: string;
}

// -------------------------------------------------------------
// Site Intelligence: 2. Broken Link & Broken Image Scanner
// -------------------------------------------------------------
export type CrawlItemType = 'link' | 'image';
export type CrawlItemStatus = 'ok' | 'redirect' | 'broken' | 'blocked';

export interface CrawlScanItem {
  id: string;
  url: string;
  type: CrawlItemType;
  foundOnPage: string;
  anchorOrAltText: string;
  statusCode: number;
  classification: CrawlItemStatus; // ok=2xx, redirect=3xx, broken=404/5xx/err, blocked=403/429
  redirectUrl?: string;
  responseTimeMs: number;
  isMissingAlt?: boolean;
  isLargeImage?: boolean;
  sizeBytes?: number;
  error?: string;
  isNewBroken?: boolean;
}

export interface CrawlScanResult {
  id: string;
  monitorId?: string;
  startUrl: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  depth: number; // 1 = this page only, 50, 100, 500
  checkExternal: boolean;
  pagesCrawled: number;
  totalLinksChecked: number;
  totalImagesChecked: number;
  brokenLinksCount: number;
  brokenImagesCount: number;
  blockedCount: number;
  redirectsCount: number;
  items: CrawlScanItem[];
}

// -------------------------------------------------------------
// Site Intelligence: 3. Anomaly Detection
// -------------------------------------------------------------
export type AnomalySeverity = 'low' | 'medium' | 'high';
export type AnomalyType = 'latency' | 'status_code' | 'page_size' | 'ssl_cert' | 'consecutive_slow';

export interface AnomalyEvent {
  id: string;
  monitorId: string;
  monitorName: string;
  url?: string;
  timestamp: string;
  severity: AnomalySeverity;
  type: AnomalyType;
  currentValue: string | number;
  expectedValue: string | number;
  reason: string;
  status: 'active' | 'ignored' | 'investigated';
  responseTimeMs?: number;
  normalAverageMs?: number;
}

// -------------------------------------------------------------
// Security & Assistant: 1. Website Defacement Detection
// -------------------------------------------------------------
export type DefacementRiskScore = 'low' | 'medium' | 'high' | 'critical';

export interface DefacementBaseline {
  title: string;
  mainText: string;
  htmlStructureHash: string;
  scripts: string[];
  iframes: string[];
  externalDomains: string[];
  pageSizeBytes: number;
  updatedAt: string;
}

export interface DefacementRecord {
  id: string;
  monitorId: string;
  monitorName: string;
  url: string;
  timestamp: string;
  riskScore: DefacementRiskScore;
  reasons: string[];
  currentTitle: string;
  baselineTitle: string;
  currentTextSnippet: string;
  baselineTextSnippet: string;
  injectedScripts: string[];
  injectedIframes: string[];
  redirectDomain?: string;
  sizeChangePercent: number;
  contentChangePercent: number;
  isExpected: boolean;
  status: 'active' | 'investigated' | 'resolved';
  evidenceDiff?: {
    addedWords: string[];
    removedWords: string[];
    suspiciousKeywords: string[];
  };
}

// -------------------------------------------------------------
// Security & Assistant: 2. Website Screenshot Comparison
// -------------------------------------------------------------
export interface ScreenshotIgnoredRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string; // e.g. "Ad Banner", "Live Clock"
}

export interface ScreenshotItem {
  id: string;
  monitorId: string;
  monitorName: string;
  url: string;
  timestamp: string;
  isBaseline: boolean;
  desktopImageUrl: string;
  mobileImageUrl: string;
  diffPercent: number; // visual diff compared to baseline
  highlightDiffUrl?: string; // visual diff overlay heatmap
  ignoredRegions: ScreenshotIgnoredRegion[];
  schedule: 'hourly' | 'daily' | 'weekly' | 'manual';
  status: 'clean' | 'changed' | 'alert';
}

// -------------------------------------------------------------
// Security & Assistant: 3 & 4. Root Cause Suggestion & Auto Troubleshoot
// -------------------------------------------------------------
export interface TroubleshootStep {
  id: string;
  order: number;
  title: string;
  beginnerDescription: string;
  advancedDescription: string;
  exampleCommand?: string;
  completed: boolean;
  markedAsFixed?: boolean;
}

export interface RootCauseInfo {
  likelyCause: string;
  confidencePercent: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  evidence: string[];
  category: 'dns' | 'port' | 'timeout' | 'gateway_5xx' | 'app_500' | 'blocked_waf' | 'ssl' | 'host_outage';
  simpleExplanation: string;
  aiExplanation?: string;
  steps: TroubleshootStep[];
  resolvedByStepId?: string;
}

// -------------------------------------------------------------
// Phone & Mobile Notifications
// -------------------------------------------------------------
export type MobileAlertEventType =
  | 'down'
  | 'recovered'
  | 'blocked'
  | 'defacement'
  | 'content_change'
  | 'anomaly'
  | 'ssl_expiring';

export interface TelegramConfig {
  enabled: boolean;
  botUsername: string;
  chatId: string;
  botToken?: string;
  isLinked: boolean;
  eventTypes: MobileAlertEventType[];
}

export interface TwilioConfig {
  enabled: boolean;
  channel: 'sms' | 'whatsapp' | 'both';
  accountSid: string;
  authToken: string;
  fromNumber: string;
  toNumber: string;
  eventTypes: MobileAlertEventType[];
}

export interface WebPushConfig {
  enabled: boolean;
  isSubscribed: boolean;
  eventTypes: MobileAlertEventType[];
}

export interface EmailAlertConfig {
  enabled: boolean;
  recipientEmail: string;
  eventTypes: MobileAlertEventType[];
}

export interface QuietHoursConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
  allowCriticalDowntime: boolean;
}

export interface MobileAlertsSettings {
  telegram: TelegramConfig;
  twilio: TwilioConfig;
  webPush: WebPushConfig;
  email: EmailAlertConfig;
  quietHours: QuietHoursConfig;
}

export interface MobileAlertDeliveryLog {
  id: string;
  timestamp: string;
  channel: 'telegram' | 'whatsapp' | 'sms' | 'web_push' | 'email';
  eventType: MobileAlertEventType;
  status: 'sent' | 'failed';
  recipient: string;
  messageText: string;
  error?: string;
}



