import {
  Monitor,
  CheckLog,
  Incident,
  NotificationItem,
  UserProfile,
  StatusPageConfig,
  FavoriteSite,
  ContentChangeEvent,
  CrawlScanResult,
  AnomalyEvent,
  DefacementRecord,
  ScreenshotItem,
  MobileAlertsSettings,
  MobileAlertDeliveryLog
} from '../types';

export const initialProfile: UserProfile = {
  id: 'usr_default_01',
  email: 'admin@uptimechecker.pro',
  fullName: 'Alex Vance',
  timezone: 'UTC-07:00 (Pacific Time)',
  apiKey: 'ucp_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
  alertEmail: 'alerts@uptimechecker.pro',
  webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
  soundEnabled: true,
  browserNotificationsEnabled: true,
  refreshMode: 'auto',
  refreshInterval: 30,
  notifyContentChanges: true,
  notifyBrokenLinks: true,
  notifyAnomalies: true
};

export const initialMonitors: Monitor[] = [
  {
    id: 'mon_1',
    name: 'Main Public API (GitHub API)',
    url: 'https://api.github.com',
    type: 'http',
    intervalMinutes: 1,
    status: 'up',
    lastCheckedAt: new Date(Date.now() - 1000 * 25).toISOString(),
    responseTimeMs: 78,
    uptime24h: 100.0,
    uptime7d: 99.98,
    uptime30d: 99.95,
    uptime90d: 99.92,
    tags: ['Production', 'Core API'],
    maintenanceMode: false,
    isWatched: false,
    notificationChannels: { email: true, browser: true, sound: true },
    sslInfo: {
      valid: true,
      issuer: "DigiCert Global Root G2",
      validFrom: "2024-03-01T00:00:00.000Z",
      validTo: "2027-03-15T23:59:59.000Z",
      daysRemaining: 167,
      warning14Days: false,
      protocol: 'TLSv1.3'
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 'mon_2',
    name: 'Customer Web Portal',
    url: 'https://www.cloudflare.com',
    type: 'http',
    intervalMinutes: 5,
    status: 'up',
    lastCheckedAt: new Date(Date.now() - 1000 * 40).toISOString(),
    responseTimeMs: 44,
    uptime24h: 100.0,
    uptime7d: 100.0,
    uptime30d: 99.99,
    uptime90d: 99.97,
    tags: ['Production', 'Frontend'],
    maintenanceMode: false,
    isWatched: false,
    notificationChannels: { email: true, browser: true, sound: true },
    sslInfo: {
      valid: true,
      issuer: "Cloudflare Inc ECC CA-3",
      validFrom: "2024-06-01T00:00:00.000Z",
      validTo: "2027-05-30T23:59:59.000Z",
      daysRemaining: 243,
      warning14Days: false,
      protocol: 'TLSv1.3'
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: 'mon_3',
    name: 'Staging Server (Recovery Target)',
    url: 'https://staging-service.internal.test',
    type: 'http',
    intervalMinutes: 1,
    status: 'down',
    lastCheckedAt: new Date(Date.now() - 1000 * 15).toISOString(),
    responseTimeMs: 0,
    uptime24h: 92.4,
    uptime7d: 96.1,
    uptime30d: 97.5,
    uptime90d: 98.1,
    tags: ['Staging', 'DevOps'],
    maintenanceMode: false,
    isWatched: true,
    watchedSince: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    notificationChannels: { email: true, browser: true, sound: true },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: 'mon_4',
    name: 'Primary Database Host (Postgres)',
    url: 'db.production.cluster',
    type: 'port',
    port: 5432,
    intervalMinutes: 5,
    status: 'up',
    lastCheckedAt: new Date(Date.now() - 1000 * 55).toISOString(),
    responseTimeMs: 22,
    uptime24h: 100.0,
    uptime7d: 100.0,
    uptime30d: 99.95,
    uptime90d: 99.94,
    tags: ['Database', 'Infrastructure'],
    maintenanceMode: false,
    isWatched: false,
    notificationChannels: { email: true, browser: false, sound: false },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
  {
    id: 'mon_5',
    name: 'Documentation Landing (Keyword Check)',
    url: 'https://example.com',
    type: 'keyword',
    keyword: 'Example Domain',
    intervalMinutes: 10,
    status: 'up',
    lastCheckedAt: new Date(Date.now() - 1000 * 90).toISOString(),
    responseTimeMs: 62,
    uptime24h: 100.0,
    uptime7d: 99.92,
    uptime30d: 99.9,
    uptime90d: 99.88,
    tags: ['Marketing', 'Docs'],
    maintenanceMode: false,
    isWatched: false,
    notificationChannels: { email: false, browser: true, sound: false },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'mon_6',
    name: 'Payment Webhook Listener',
    url: 'https://httpbin.org/status/200',
    type: 'http',
    intervalMinutes: 5,
    status: 'up',
    lastCheckedAt: new Date(Date.now() - 1000 * 110).toISOString(),
    responseTimeMs: 145,
    uptime24h: 100.0,
    uptime7d: 99.8,
    uptime30d: 99.75,
    uptime90d: 99.6,
    tags: ['Billing', 'Core API'],
    maintenanceMode: false,
    isWatched: false,
    notificationChannels: { email: true, browser: true, sound: true },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
  {
    id: 'mon_7',
    name: 'Partner Data Stream (Bot-Protected)',
    url: 'https://httpbin.org/status/403',
    type: 'http',
    intervalMinutes: 5,
    status: 'blocked',
    lastStatusReason: 'HTTP 403 Forbidden, likely bot protection',
    lastCheckedAt: new Date(Date.now() - 1000 * 45).toISOString(),
    responseTimeMs: 84,
    uptime24h: 100.0,
    uptime7d: 99.9,
    uptime30d: 99.85,
    uptime90d: 99.8,
    tags: ['Partner', 'External'],
    maintenanceMode: false,
    isWatched: false,
    notificationChannels: { email: true, browser: true, sound: false },
    sslInfo: {
      valid: true,
      issuer: "Amazon RSA 2048 M02",
      validFrom: "2024-01-01T00:00:00.000Z",
      validTo: "2026-12-31T23:59:59.000Z",
      daysRemaining: 140,
      warning14Days: false,
      protocol: 'TLSv1.3'
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  }
];

export const initialIncidents: Incident[] = [
  {
    id: 'inc_1',
    monitorId: 'mon_3',
    monitorName: 'Staging Server (Recovery Target)',
    monitorUrl: 'https://staging-service.internal.test',
    startedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    resolvedAt: null,
    durationSeconds: null,
    status: 'ongoing',
    cause: 'Connection timed out (ETIMEDOUT) - 504 Gateway Timeout',
    type: 'outage',
    rootCause: {
      likelyCause: 'Upstream Reverse Proxy Gateway Timeout (504)',
      confidencePercent: 94,
      confidenceLevel: 'High',
      category: 'gateway_5xx',
      evidence: [
        'HTTP 504 status code returned from edge proxy',
        'TCP handshake to proxy port 443 succeeded (48ms)',
        'Backend application daemon failed to respond within 10,000ms timeout',
        'No DNS failure detected; domain resolves properly to 192.0.2.45'
      ],
      simpleExplanation: 'Your website proxy is working, but the actual app or database behind it is taking too long to answer or has crashed.',
      aiExplanation: 'The reverse proxy (e.g. Nginx or Cloudflare) successfully accepted incoming client connections, but the internal application service process (Node/Python/Go) failed to return a response before the upstream socket timed out. This typically points to an unhandled application freeze, heavy database lock, or worker pool starvation.',
      steps: [
        {
          id: 'step_1_1',
          order: 1,
          title: 'Verify backend daemon service status',
          beginnerDescription: 'Check if your website application service is turned on and running.',
          advancedDescription: 'Inspect the systemd service or Docker container status on the origin host.',
          exampleCommand: 'sudo systemctl status my-api-service || docker ps',
          completed: false
        },
        {
          id: 'step_1_2',
          order: 2,
          title: 'Inspect recent crash or unhandled exception logs',
          beginnerDescription: 'Read the error log file to find out why the app stopped answering.',
          advancedDescription: 'Check recent application stderr and journalctl logs for uncaught exceptions, OOM-kills, or database connection pool exhaustion.',
          exampleCommand: 'journalctl -u my-api-service -n 50 --no-pager | grep -iE "error|fatal|exception"',
          completed: false
        },
        {
          id: 'step_1_3',
          order: 3,
          title: 'Restart application process or worker pool',
          beginnerDescription: 'Reboot the background program to clear any frozen memory or stuck tasks.',
          advancedDescription: 'Perform a graceful reload or restart of the upstream server workers.',
          exampleCommand: 'sudo systemctl restart my-api-service && sudo nginx -s reload',
          completed: false
        },
        {
          id: 'step_1_4',
          order: 4,
          title: 'Inspect server CPU, RAM, and disk space',
          beginnerDescription: 'Make sure your computer server is not out of memory or hard drive storage.',
          advancedDescription: 'Verify whether memory saturation (OOM) or 100% disk usage filled /var/log or /tmp.',
          exampleCommand: 'top -b -n 1 | head -15 && df -h /',
          completed: false
        }
      ]
    }
  },
  {
    id: 'inc_2',
    monitorId: 'mon_1',
    monitorName: 'Main Public API (GitHub API)',
    monitorUrl: 'https://api.github.com',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 36 + 1000 * 60 * 4).toISOString(),
    durationSeconds: 240,
    status: 'resolved',
    cause: 'Spike in upstream HTTP 503 Service Unavailable',
    type: 'outage',
    rootCause: {
      likelyCause: 'Temporary API Gateway Overload / Maintenance (503)',
      confidencePercent: 91,
      confidenceLevel: 'High',
      category: 'gateway_5xx',
      evidence: [
        'HTTP 503 Service Unavailable response',
        'Retry-After header present in HTTP response headers',
        'Automatic recovery completed within 4 minutes'
      ],
      simpleExplanation: 'The service was briefly overloaded or performing a zero-downtime maintenance deployment.',
      aiExplanation: 'The target API endpoint returned a 503 Service Unavailable, indicating capacity throttling or blue-green pod rotation, which self-resolved.',
      steps: [
        {
          id: 'step_2_1',
          order: 1,
          title: 'Check public status page for announced maintenance',
          beginnerDescription: 'See if the API provider posted an alert about planned updates.',
          advancedDescription: 'Query the vendor status API or Twitter feed for real-time incident reports.',
          exampleCommand: 'curl -s https://www.githubstatus.com/api/v2/status.json | jq .',
          completed: true,
          markedAsFixed: true
        }
      ],
      resolvedByStepId: 'step_2_1'
    }
  },
  {
    id: 'inc_3',
    monitorId: 'mon_5',
    monitorName: 'Documentation Landing (Keyword Check)',
    monitorUrl: 'https://example.com',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 72 + 1000 * 60 * 8).toISOString(),
    durationSeconds: 480,
    status: 'resolved',
    cause: 'Keyword "Example Domain" was missing from HTML response',
    type: 'content_change'
  }
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'notif_1',
    monitorId: 'mon_3',
    title: 'Monitor Down: Staging Server',
    message: 'Staging Server is unreachable (HTTP 504). Watch mode is active.',
    type: 'down',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
  },
  {
    id: 'notif_2',
    monitorId: 'mon_3',
    title: 'Watch Active: Monitoring Recovery',
    message: 'High-frequency 30s checks engaged. You will be alerted the moment this server recovers.',
    type: 'watch_alert',
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    read: false,
  },
  {
    id: 'notif_3',
    monitorId: 'mon_1',
    title: 'Incident Resolved: Main Public API',
    message: 'Response returned to 200 OK after 4 minutes of downtime.',
    type: 'recovered',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 35).toISOString(),
    read: true,
  },
  {
    id: 'notif_4',
    title: 'Weekly Summary Ready',
    message: 'All systems achieved 99.94% overall uptime this week across 6 monitors.',
    type: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    read: true,
  }
];

export const initialStatusPage: StatusPageConfig = {
  id: 'sp_default',
  title: 'Apex Cloud Services Status',
  description: 'Real-time operational status and historical uptime metrics for our core APIs, edge CDN, and customer dashboard.',
  slug: 'apex-cloud',
  isPublic: true,
  publishedMonitorIds: ['mon_1', 'mon_2', 'mon_4', 'mon_5', 'mon_6'],
  customMessage: 'All core systems are fully operational with normal latency levels.'
};

/**
 * Generate 90 daily uptime blocks for a monitor
 */
export function generate90DayHistory(monitorId: string, status: 'up' | 'down' | 'paused') {
  const blocks: { date: string; uptimePercent: number; status: 'nominal' | 'degraded' | 'outage' }[] = [];
  const now = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Seed deterministic yet realistic variations
    const hash = (monitorId.charCodeAt(monitorId.length - 1) * 31 + i * 17) % 100;

    let uptime = 100;
    if (i === 0 && status === 'down') {
      uptime = 91.5;
    } else if (hash === 7) {
      uptime = 98.2;
    } else if (hash === 42) {
      uptime = 94.6;
    }

    let blockStatus: 'nominal' | 'degraded' | 'outage' = 'nominal';
    if (uptime < 95) blockStatus = 'outage';
    else if (uptime < 99.5) blockStatus = 'degraded';

    blocks.push({
      date: dateStr,
      uptimePercent: uptime,
      status: blockStatus,
    });
  }

  return blocks;
}

/**
 * Generate response time history data points for charts (24h, 7d, 30d)
 */
export function generateResponseTimeHistory(period: '24h' | '7d' | '30d') {
  const points: { label: string; time: string; avgLatency: number; p95Latency: number }[] = [];
  const count = period === '24h' ? 24 : period === '7d' ? 28 : 30;
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    let t: Date;
    let label = '';
    if (period === '24h') {
      t = new Date(now - i * 3600 * 1000);
      label = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (period === '7d') {
      t = new Date(now - i * 6 * 3600 * 1000);
      label = `${t.toLocaleDateString([], { weekday: 'short' })} ${t.toLocaleTimeString([], { hour: '2-digit' })}`;
    } else {
      t = new Date(now - i * 24 * 3600 * 1000);
      label = t.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // Organic latency wave around 50-80ms with small spikes
    const base = 58;
    const wave = Math.sin(i * 0.4) * 16;
    const noise = (Math.random() - 0.5) * 8;
    const avg = Math.round(Math.max(25, base + wave + noise));
    const p95 = Math.round(avg * 1.45 + (Math.random() * 15));

    points.push({
      label,
      time: t.toISOString(),
      avgLatency: avg,
      p95Latency: p95,
    });
  }

  return points;
}

export const initialFavorites: FavoriteSite[] = [
  {
    id: 'fav_github_api',
    userId: 'usr_default_01',
    user_id: 'usr_default_01',
    url: 'https://api.github.com',
    name: 'GitHub REST API',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    lastStatus: 'up',
    last_status: 'up',
    lastCheckedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    last_checked_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    lastResponseTimeMs: 78,
    last_response_time_ms: 78,
    statusCode: 200,
    sslDaysRemaining: 167,
    pinned: true,
    orderIndex: 0,
    uptimePercent: 99.98
  },
  {
    id: 'fav_cloudflare',
    userId: 'usr_default_01',
    user_id: 'usr_default_01',
    url: 'https://cloudflare.com',
    name: 'Cloudflare Edge CDN',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    lastStatus: 'up',
    last_status: 'up',
    lastCheckedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    last_checked_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lastResponseTimeMs: 44,
    last_response_time_ms: 44,
    statusCode: 200,
    sslDaysRemaining: 94,
    pinned: true,
    orderIndex: 1,
    uptimePercent: 100.0
  },
  {
    id: 'fav_hacker_news',
    userId: 'usr_default_01',
    user_id: 'usr_default_01',
    url: 'https://news.ycombinator.com',
    name: 'Hacker News',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    lastStatus: 'up',
    last_status: 'up',
    lastCheckedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    last_checked_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    lastResponseTimeMs: 92,
    last_response_time_ms: 92,
    statusCode: 200,
    sslDaysRemaining: 112,
    pinned: false,
    orderIndex: 2,
    uptimePercent: 99.95
  }
];

export const initialContentChanges: ContentChangeEvent[] = [
  {
    id: 'cc_1',
    monitorId: 'mon_1',
    monitorName: 'Main Public API (GitHub API)',
    url: 'https://api.github.com',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    oldHash: 'a8b79c02e1f44d87',
    newHash: 'f491c305e921b77a',
    changePercent: 12.4,
    oldSnapshot: `{\n  "current_user_url": "https://api.github.com/user",\n  "authorizations_url": "https://api.github.com/authorizations",\n  "rate_limit_url": "https://api.github.com/rate_limit",\n  "api_version": "2022-11-28",\n  "status": "operational"\n}`,
    newSnapshot: `{\n  "current_user_url": "https://api.github.com/user",\n  "authorizations_url": "https://api.github.com/authorizations",\n  "rate_limit_url": "https://api.github.com/rate_limit",\n  "api_version": "2026-03-01",\n  "status": "operational",\n  "copilot_endpoint": "https://api.github.com/copilot"\n}`,
    diffSummary: {
      linesAdded: 2,
      linesRemoved: 1,
      wordsChanged: 4
    },
    isExpected: false,
    keywordTriggered: 'copilot'
  },
  {
    id: 'cc_2',
    monitorId: 'mon_2',
    monitorName: 'Customer Web Portal',
    url: 'https://www.cloudflare.com',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    oldHash: '918bfd4001a7',
    newHash: '20c78a993e11',
    changePercent: 6.8,
    oldSnapshot: `Cloudflare Connectivity Cloud\nProtect entire corporate networks, help customers build modern applications.\nStarting at $20/month per domain.`,
    newSnapshot: `Cloudflare Connectivity Cloud\nProtect entire corporate networks, help customers build modern AI applications.\nStarting at $25/month per domain.`,
    diffSummary: {
      linesAdded: 1,
      linesRemoved: 1,
      wordsChanged: 2
    },
    isExpected: true
  }
];

export const initialCrawlScans: CrawlScanResult[] = [
  {
    id: 'crawl_demo_1',
    monitorId: 'mon_2',
    startUrl: 'https://www.cloudflare.com',
    startedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 118).toISOString(),
    status: 'completed',
    depth: 50,
    checkExternal: true,
    pagesCrawled: 34,
    totalLinksChecked: 142,
    totalImagesChecked: 48,
    brokenLinksCount: 3,
    brokenImagesCount: 1,
    blockedCount: 2,
    redirectsCount: 8,
    items: [
      {
        id: 'ci_1',
        url: 'https://www.cloudflare.com/legacy-api-guide-v1.pdf',
        type: 'link',
        foundOnPage: 'https://www.cloudflare.com/docs',
        anchorOrAltText: 'Download Legacy PDF Guide',
        statusCode: 404,
        classification: 'broken',
        responseTimeMs: 210,
        error: 'HTTP 404 Not Found',
        isNewBroken: true
      },
      {
        id: 'ci_2',
        url: 'https://partners.olddomain-archive.org/spec',
        type: 'link',
        foundOnPage: 'https://www.cloudflare.com/integrations',
        anchorOrAltText: 'Partner Spec Sheet',
        statusCode: 502,
        classification: 'broken',
        responseTimeMs: 1540,
        error: 'HTTP 502 Bad Gateway',
        isNewBroken: true
      },
      {
        id: 'ci_3',
        url: 'https://assets.cloudflare.com/images/broken-hero-banner.png',
        type: 'image',
        foundOnPage: 'https://www.cloudflare.com/products',
        anchorOrAltText: 'Cloudflare Zero Trust Architecture Diagram',
        statusCode: 404,
        classification: 'broken',
        responseTimeMs: 180,
        isMissingAlt: false,
        error: 'Image source missing (404)',
        isNewBroken: true
      },
      {
        id: 'ci_4',
        url: 'https://internal-stats.cloudflare.com/metrics',
        type: 'link',
        foundOnPage: 'https://www.cloudflare.com/status',
        anchorOrAltText: 'Live Telemetry Metrics',
        statusCode: 403,
        classification: 'blocked',
        responseTimeMs: 95,
        error: 'Reachable, Blocked (HTTP 403 / WAF challenge)'
      },
      {
        id: 'ci_5',
        url: 'https://www.cloudflare.com/old-pricing',
        type: 'link',
        foundOnPage: 'https://www.cloudflare.com',
        anchorOrAltText: 'Compare Plans',
        statusCode: 301,
        classification: 'redirect',
        redirectUrl: 'https://www.cloudflare.com/plans',
        responseTimeMs: 82
      },
      {
        id: 'ci_6',
        url: 'https://assets.cloudflare.com/marketing/massive-banner-4k.png',
        type: 'image',
        foundOnPage: 'https://www.cloudflare.com/enterprise',
        anchorOrAltText: '',
        statusCode: 200,
        classification: 'ok',
        responseTimeMs: 460,
        isMissingAlt: true,
        isLargeImage: true,
        sizeBytes: 2450000
      }
    ]
  }
];

export const initialAnomalies: AnomalyEvent[] = [
  {
    id: 'anom_1',
    monitorId: 'mon_1',
    monitorName: 'Main Public API (GitHub API)',
    url: 'https://api.github.com',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    severity: 'high',
    type: 'latency',
    currentValue: '1,850 ms',
    expectedValue: '78 ms (±18 ms)',
    reason: 'Response 1,850 ms vs normal 78 ms (exceeds 3 standard deviations)',
    status: 'active',
    responseTimeMs: 1850,
    normalAverageMs: 78
  },
  {
    id: 'anom_2',
    monitorId: 'mon_2',
    monitorName: 'Customer Web Portal',
    url: 'https://www.cloudflare.com',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    severity: 'medium',
    type: 'consecutive_slow',
    currentValue: '390 ms',
    expectedValue: '44 ms',
    reason: 'Elevated response time for 4 consecutive check cycles',
    status: 'investigated',
    responseTimeMs: 390,
    normalAverageMs: 44
  },
  {
    id: 'anom_3',
    monitorId: 'mon_4',
    monitorName: 'Primary Database Host (Postgres)',
    url: 'db.production.cluster:5432',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    severity: 'low',
    type: 'latency',
    currentValue: '142 ms',
    expectedValue: '18 ms',
    reason: 'Socket handshake latency spike (+680% above 7d hourly baseline)',
    status: 'ignored',
    responseTimeMs: 142,
    normalAverageMs: 18
  }
];

export const initialDefacementRecords: DefacementRecord[] = [
  {
    id: 'def_1',
    monitorId: 'mon_2',
    monitorName: 'Customer Web Portal',
    url: 'https://www.cloudflare.com',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    riskScore: 'medium',
    reasons: [
      'Unusual HTML title replacement detected',
      '2 new external unverified scripts injected in header',
      'Page payload size shrank by 32% suddenly'
    ],
    currentTitle: 'Cloudflare - Connect, Protect and Build (Unverified Revision)',
    baselineTitle: 'Cloudflare - The Web Performance & Security Company',
    currentTextSnippet: 'Connect and protect your infrastructure worldwide. Notice: Maintenance scripts injected.',
    baselineTextSnippet: 'Connect, protect, and build everywhere. Accelerate internet performance and stop DDoS attacks.',
    injectedScripts: ['https://cdn-analytics-external.io/tracker.js', 'https://static-cdn-verify.net/beacon.js'],
    injectedIframes: [],
    sizeChangePercent: -32.4,
    contentChangePercent: 38.0,
    isExpected: false,
    status: 'active',
    evidenceDiff: {
      addedWords: ['Notice:', 'Maintenance', 'scripts', 'injected', 'cdn-analytics-external.io'],
      removedWords: ['everywhere.', 'Accelerate', 'DDoS', 'attacks'],
      suspiciousKeywords: ['unverified', 'injected']
    }
  }
];

export const initialScreenshots: ScreenshotItem[] = [
  {
    id: 'shot_1',
    monitorId: 'mon_2',
    monitorName: 'Customer Web Portal',
    url: 'https://www.cloudflare.com',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isBaseline: true,
    desktopImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1280&h=800&q=80',
    mobileImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=375&h=667&q=80',
    diffPercent: 0,
    ignoredRegions: [
      { id: 'ign_1', x: 20, y: 15, width: 280, height: 60, label: 'Live Stock Ticker' }
    ],
    schedule: 'hourly',
    status: 'clean'
  },
  {
    id: 'shot_2',
    monitorId: 'mon_2',
    monitorName: 'Customer Web Portal',
    url: 'https://www.cloudflare.com',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isBaseline: false,
    desktopImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1280&h=800&q=80',
    mobileImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=375&h=667&q=80',
    diffPercent: 14.8,
    highlightDiffUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1280&h=800&q=80',
    ignoredRegions: [
      { id: 'ign_1', x: 20, y: 15, width: 280, height: 60, label: 'Live Stock Ticker' }
    ],
    schedule: 'hourly',
    status: 'alert'
  }
];

export const initialMobileAlertsSettings: MobileAlertsSettings = {
  telegram: {
    enabled: true,
    botUsername: 'UptimeCheckerPro_bot',
    chatId: '749201948',
    botToken: '682910394:AAHF-EXAMPLE_TOKEN_BOT_SAFE',
    isLinked: true,
    eventTypes: ['down', 'recovered', 'blocked', 'defacement', 'anomaly']
  },
  twilio: {
    enabled: false,
    channel: 'sms',
    accountSid: 'AC_live_demo_account_sid_masked',
    authToken: 'demo_auth_token_secret_vault',
    fromNumber: '+18005550199',
    toNumber: '+14155552671',
    eventTypes: ['down', 'recovered', 'defacement']
  },
  webPush: {
    enabled: true,
    isSubscribed: true,
    eventTypes: ['down', 'recovered', 'defacement', 'content_change', 'anomaly', 'ssl_expiring']
  },
  email: {
    enabled: true,
    recipientEmail: 'alerts@uptimechecker.pro',
    eventTypes: ['down', 'recovered', 'defacement', 'ssl_expiring']
  },
  quietHours: {
    enabled: true,
    startTime: '22:00',
    endTime: '07:00',
    timezone: 'UTC-07:00',
    allowCriticalDowntime: true
  }
};

export const initialMobileDeliveryLogs: MobileAlertDeliveryLog[] = [
  {
    id: 'log_del_1',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    channel: 'telegram',
    eventType: 'down',
    status: 'sent',
    recipient: '@UptimeCheckerPro_bot (Chat #749201948)',
    messageText: '🔴 DOWN: Staging Server (Recovery Target). Cause: Gateway Timeout (504). Since 10:01. Tap to view: https://uptimechecker.pro/m/3'
  },
  {
    id: 'log_del_2',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    channel: 'web_push',
    eventType: 'down',
    status: 'sent',
    recipient: 'Subscribed Mobile & Desktop Browsers (2 devices)',
    messageText: '🔴 DOWN: Staging Server (Recovery Target) is unresponsive.'
  },
  {
    id: 'log_del_3',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    channel: 'telegram',
    eventType: 'recovered',
    status: 'sent',
    recipient: '@UptimeCheckerPro_bot (Chat #749201948)',
    messageText: '🟢 RECOVERED: Customer Web Portal after 8 min (44ms response).'
  }
];


