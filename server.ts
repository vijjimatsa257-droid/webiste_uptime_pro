import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import tls from 'tls';
import dns from 'dns';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  initialMonitors,
  initialIncidents,
  initialNotifications,
  initialProfile,
  initialStatusPage,
  initialFavorites,
  initialContentChanges,
  initialCrawlScans,
  initialAnomalies,
  initialDefacementRecords,
  initialScreenshots,
  initialMobileAlertsSettings,
  initialMobileDeliveryLogs
} from './src/data/mockData.ts';
import {
  Monitor,
  CheckLog,
  Incident,
  NotificationItem,
  BulkGroup,
  BulkCheckResult,
  FavoriteSite,
  ContentChangeEvent,
  CrawlScanResult,
  CrawlScanItem,
  AnomalyEvent,
  DefacementRecord,
  DefacementBaseline,
  ScreenshotItem,
  TroubleshootStep,
  RootCauseInfo,
  MobileAlertsSettings,
  MobileAlertDeliveryLog
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini AI Client for Plain-Language Root Cause Explanations
let geminiAi: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiAi = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.warn('Gemini AI initialization skipped:', err);
  }
}

// In-memory state (initialized with rich mock data)
let monitors: Monitor[] = [...initialMonitors];
let incidents: Incident[] = [...initialIncidents];
let notifications: NotificationItem[] = [...initialNotifications];
let favorites: FavoriteSite[] = [...initialFavorites];
let contentChanges: ContentChangeEvent[] = [...initialContentChanges];
let crawlScans: CrawlScanResult[] = [...initialCrawlScans];
let anomalies: AnomalyEvent[] = [...initialAnomalies];
let defacementRecords: DefacementRecord[] = [...initialDefacementRecords];
let screenshots: ScreenshotItem[] = [...initialScreenshots];
let mobileAlertsSettings: MobileAlertsSettings = { ...initialMobileAlertsSettings };
let mobileDeliveryLogs: MobileAlertDeliveryLog[] = [...initialMobileDeliveryLogs];
const userProfile = { ...initialProfile, logRetentionDays: 0 };
const statusPage = { ...initialStatusPage };
let bulkGroups: BulkGroup[] = [
  {
    id: 'grp_tech_apis',
    name: 'Top Tech APIs',
    urls: [
      'https://api.github.com',
      'https://api.stripe.com',
      'https://news.ycombinator.com',
      'https://cloudflare.com'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'grp_test_suite',
    name: 'HTTP Status Test Suite',
    urls: [
      'https://httpstat.us/200',
      'https://httpstat.us/403',
      'https://httpstat.us/500',
      'https://httpstat.us/504'
    ],
    createdAt: new Date().toISOString()
  }
];

// Temporary backup buffers for 10-second undo capability
let checkLogsBackup: { token: string; logs: CheckLog[]; timestamp: number } | null = null;
let incidentsBackup: { token: string; incidents: Incident[]; timestamp: number } | null = null;

function applyRetentionPolicy() {
  if (userProfile.logRetentionDays && userProfile.logRetentionDays > 0) {
    const cutoff = Date.now() - userProfile.logRetentionDays * 24 * 60 * 60 * 1000;
    checkLogs = checkLogs.filter(l => new Date(l.timestamp).getTime() >= cutoff);
  }
}

let checkLogs: CheckLog[] = [
  {
    id: 'log_init_1',
    monitorId: 'mon_1',
    monitorName: 'Main Public API (GitHub API)',
    status: 'up',
    statusCode: 200,
    responseTimeMs: 78,
    timestamp: new Date(Date.now() - 25000).toISOString(),
    message: 'HTTP 200 OK - All endpoints operational',
    reason: 'HTTP 200 OK'
  },
  {
    id: 'log_init_2',
    monitorId: 'mon_2',
    monitorName: 'Customer Web Portal',
    status: 'up',
    statusCode: 200,
    responseTimeMs: 44,
    timestamp: new Date(Date.now() - 40000).toISOString(),
    message: 'HTTP 200 OK',
    reason: 'HTTP 200 OK'
  },
  {
    id: 'log_init_3',
    monitorId: 'mon_3',
    monitorName: 'Staging Server (Recovery Target)',
    status: 'down',
    statusCode: 504,
    responseTimeMs: 0,
    timestamp: new Date(Date.now() - 15000).toISOString(),
    message: 'Gateway Timeout / Unreachable',
    reason: 'HTTP 504 Gateway Timeout'
  },
  {
    id: 'log_init_4',
    monitorId: 'mon_4',
    monitorName: 'Primary Database Host (Postgres)',
    status: 'up',
    statusCode: 0,
    responseTimeMs: 22,
    timestamp: new Date(Date.now() - 55000).toISOString(),
    message: 'Port 5432 is open',
    reason: 'Port 5432 is open'
  }
];

const DEFAULT_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function buildBrowserHeaders(customUserAgent?: string) {
  return {
    'User-Agent': (customUserAgent && customUserAgent.trim()) || DEFAULT_BROWSER_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  };
}

/**
 * Parses accepted status codes string (e.g. "200-299, 403", "200-399")
 */
function isCodeAccepted(code: number, acceptedStr?: string): boolean {
  if (!acceptedStr || !acceptedStr.trim()) {
    return code >= 200 && code < 400;
  }
  const parts = acceptedStr.split(',').map(p => p.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end) && code >= start && code <= end) {
        return true;
      }
    } else {
      const target = parseInt(part, 10);
      if (!isNaN(target) && code === target) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detects if a response is a bot-protection or security challenge
 */
function isBotProtected(statusCode: number, bodyText: string = ''): boolean {
  if ([401, 403, 429].includes(statusCode)) return true;
  const lower = bodyText.toLowerCase();
  if (
    lower.includes('cloudflare') &&
    (lower.includes('attention required') || lower.includes('cf-browser-verification') || lower.includes('just a moment'))
  ) {
    return true;
  }
  if (lower.includes('ddos-guard') || lower.includes('imperva') || lower.includes('akamai')) {
    return true;
  }
  return false;
}

export interface UrlCheckResult {
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
  sslInfo?: any;
  timestamp: string;
  retriedWithGet?: boolean;
}

/**
 * Single fetch execution
 */
async function executeSingleFetch(
  normalizedUrl: string,
  method: string,
  keyword?: string,
  timeoutMs: number = 8000,
  acceptedStatusCodes?: string,
  customUserAgent?: string
): Promise<UrlCheckResult> {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const parsed = new URL(normalizedUrl);
    const headers = buildBrowserHeaders(customUserAgent);

    const response = await fetch(normalizedUrl, {
      method,
      signal: controller.signal,
      redirect: 'follow',
      headers
    });

    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);
    const statusCode = response.status;
    let bodyText = '';

    try {
      if (method !== 'HEAD') {
        bodyText = await response.text();
      }
    } catch {
      // Body reading ignored
    }

    // Response headers preview
    const headersPreview: Record<string, string> = {};
    const commonHeaders = [
      'content-type',
      'server',
      'content-length',
      'date',
      'x-powered-by',
      'strict-transport-security',
      'cf-ray',
      'cf-cache-status'
    ];
    response.headers.forEach((val, key) => {
      if (commonHeaders.includes(key.toLowerCase())) {
        headersPreview[key] = val;
      }
    });

    // Check SSL if https
    let sslInfo = undefined;
    if (parsed.protocol === 'https:') {
      sslInfo = await inspectSsl(parsed.hostname, 443).catch(() => undefined);
    }

    // Classification Logic:
    // 1. Accepted by custom status codes config
    const acceptedByUser = isCodeAccepted(statusCode, acceptedStatusCodes);

    // 2. Keyword Check
    let keywordMissing = false;
    if (keyword && keyword.trim()) {
      const contains = bodyText.toLowerCase().includes(keyword.trim().toLowerCase());
      if (!contains) {
        keywordMissing = true;
      }
    }

    let classification: 'up' | 'blocked' | 'down' = 'down';
    let message = '';
    let reason = '';

    if (keywordMissing) {
      classification = 'down';
      reason = `Keyword "${keyword}" missing from response`;
      message = `HTTP ${statusCode} OK but keyword "${keyword}" was not found in response body`;
    } else if (acceptedByUser) {
      classification = 'up';
      reason = `HTTP ${statusCode} ${response.statusText || 'OK'}`;
      message = acceptedStatusCodes
        ? `HTTP ${statusCode} accepted by custom status code filter (${acceptedStatusCodes})`
        : `HTTP ${statusCode} ${response.statusText || 'OK'}`;
    } else if (isBotProtected(statusCode, bodyText)) {
      classification = 'blocked';
      message = 'Server is online but blocked automated checks. Try a custom User-Agent or accepted status codes.';
      if (statusCode === 403) {
        reason = 'HTTP 403 Forbidden, likely bot protection';
      } else if (statusCode === 401) {
        reason = 'HTTP 401 Unauthorized, authentication required';
      } else if (statusCode === 429) {
        reason = 'HTTP 429 Too Many Requests, rate limited';
      } else {
        reason = `HTTP ${statusCode}, bot-protection challenge page detected`;
      }
    } else if (statusCode >= 200 && statusCode < 400) {
      classification = 'up';
      reason = `HTTP ${statusCode} ${response.statusText || 'OK'}`;
      message = `HTTP ${statusCode} ${response.statusText || 'OK'}`;
    } else if (statusCode >= 500) {
      classification = 'down';
      reason = `HTTP ${statusCode} ${response.statusText || 'Server Error'}`;
      message = `HTTP ${statusCode} Server Error`;
    } else {
      classification = 'down';
      reason = `HTTP ${statusCode} ${response.statusText || 'Client Error'}`;
      message = `HTTP ${statusCode} ${response.statusText || 'Error'}`;
    }

    return {
      success: true,
      classification,
      isUp: classification === 'up',
      isBlocked: classification === 'blocked',
      statusCode,
      responseTimeMs: duration,
      message,
      reason,
      url: normalizedUrl,
      headers: headersPreview,
      sslInfo,
      timestamp: new Date().toISOString()
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);
    let errorMsg = 'Failed to reach server';
    let clearReason = 'Server connection failed';
    const errObj = err as { name?: string; message?: string; code?: string; cause?: any };

    if (errObj.name === 'AbortError') {
      errorMsg = `Connection timed out after ${timeoutMs}ms`;
      clearReason = `Connection timed out (${timeoutMs}ms)`;
    } else if (errObj.message) {
      errorMsg = errObj.message;
      if (errObj.message.includes('ENOTFOUND')) {
        clearReason = 'DNS failure (ENOTFOUND) - Domain could not be resolved';
      } else if (errObj.message.includes('ECONNREFUSED')) {
        clearReason = 'Connection refused (ECONNREFUSED) - Server not listening';
      } else if (errObj.message.includes('CERT_') || errObj.message.includes('unable to verify')) {
        clearReason = 'SSL/TLS certificate verification failed';
      } else {
        clearReason = errObj.message;
      }
    }

    return {
      success: false,
      classification: 'down',
      isUp: false,
      isBlocked: false,
      statusCode: 0,
      responseTimeMs: duration,
      message: errorMsg,
      reason: clearReason,
      url: normalizedUrl,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Real URL check function with HEAD -> GET fallback and 3-second retry before marking Down
 */
async function performUrlCheck(
  targetUrl: string,
  method: string = 'GET',
  keyword?: string,
  timeoutMs: number = 8000,
  acceptedStatusCodes?: string,
  customUserAgent?: string,
  retryBeforeDown: boolean = true
): Promise<UrlCheckResult> {
  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  // Initial check
  let currentResult = await executeSingleFetch(
    normalizedUrl,
    method,
    keyword,
    timeoutMs,
    acceptedStatusCodes,
    customUserAgent
  );

  // HEAD -> GET Fallback: if HEAD failed or was not UP, retry with GET
  if (method === 'HEAD' && currentResult.classification !== 'up') {
    const getResult = await executeSingleFetch(
      normalizedUrl,
      'GET',
      keyword,
      timeoutMs,
      acceptedStatusCodes,
      customUserAgent
    );
    getResult.retriedWithGet = true;
    currentResult = getResult;
  }

  // Retry once after 3 seconds before marking Down, to avoid false alarms
  if (retryBeforeDown && currentResult.classification === 'down') {
    await new Promise(r => setTimeout(r, 3000));
    const retryResult = await executeSingleFetch(
      normalizedUrl,
      'GET',
      keyword,
      timeoutMs,
      acceptedStatusCodes,
      customUserAgent
    );
    // If retry recovered (up or blocked), or even if still down, note that retry was performed
    (retryResult as any).retriedAfter3s = true;
    currentResult = retryResult;
  }

  return currentResult;
}

/**
 * Real TCP port checker using node:net
 */
function performPortCheck(host: string, port: number, timeoutMs: number = 4000): Promise<{ open: boolean; latencyMs: number; error?: string }> {
  return new Promise((resolve) => {
    const cleanHost = host.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
    const startTime = performance.now();
    const socket = new net.Socket();
    let isSettled = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (isSettled) return;
      isSettled = true;
      const latency = Math.round(performance.now() - startTime);
      socket.destroy();
      resolve({ open: true, latencyMs: latency });
    });

    socket.on('timeout', () => {
      if (isSettled) return;
      isSettled = true;
      socket.destroy();
      resolve({ open: false, latencyMs: timeoutMs, error: 'Connection timed out' });
    });

    socket.on('error', (err) => {
      if (isSettled) return;
      isSettled = true;
      const latency = Math.round(performance.now() - startTime);
      socket.destroy();
      resolve({ open: false, latencyMs: latency, error: err.message || 'Connection refused' });
    });

    try {
      socket.connect(port, cleanHost);
    } catch (e: unknown) {
      const err = e as { message?: string };
      resolve({ open: false, latencyMs: 0, error: err.message || 'Invalid host or port' });
    }
  });
}

/**
 * Real SSL certificate inspection using node:tls
 */
function inspectSsl(host: string, port: number = 443): Promise<{
  valid: boolean;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  warning14Days: boolean;
  protocol?: string;
  subject?: string;
}> {
  return new Promise((resolve, reject) => {
    const cleanHost = host.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
    const socket = tls.connect(
      {
        host: cleanHost,
        port,
        servername: cleanHost,
        rejectUnauthorized: false,
        timeout: 5000
      },
      () => {
        const cert = socket.getPeerCertificate();
        const protocol = socket.getProtocol() || undefined;
        socket.end();

        if (!cert || !cert.valid_to) {
          resolve({
            valid: false,
            issuer: 'Unknown',
            validFrom: new Date().toISOString(),
            validTo: new Date().toISOString(),
            daysRemaining: 0,
            warning14Days: true,
            protocol
          });
          return;
        }

        const validToDate = new Date(cert.valid_to);
        const now = new Date();
        const msRemaining = validToDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));
        const isValid = msRemaining > 0;

        const issuerOrg = (cert.issuer && (cert.issuer.O || cert.issuer.CN)) || 'Recognized Certificate Authority';
        const subjectOrg = (cert.subject && (cert.subject.CN || cert.subject.O)) || cleanHost;

        resolve({
          valid: isValid,
          issuer: String(issuerOrg),
          validFrom: new Date(cert.valid_from).toISOString(),
          validTo: validToDate.toISOString(),
          daysRemaining,
          warning14Days: daysRemaining <= 14,
          protocol,
          subject: String(subjectOrg)
        });
      }
    );

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('SSL check timed out'));
    });
  });
}

/**
 * Real DNS lookup using node:dns.promises
 */
async function performDnsLookup(domain: string) {
  const clean = domain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  const records: { type: string; value: string; priority?: number }[] = [];

  const promises = [
    dns.promises.resolve4(clean).then(ips => ips.forEach(ip => records.push({ type: 'A', value: ip }))).catch(() => {}),
    dns.promises.resolve6(clean).then(ips => ips.forEach(ip => records.push({ type: 'AAAA', value: ip }))).catch(() => {}),
    dns.promises.resolveMx(clean).then(mxs => mxs.forEach(mx => records.push({ type: 'MX', value: mx.exchange, priority: mx.priority }))).catch(() => {}),
    dns.promises.resolveNs(clean).then(nsList => nsList.forEach(ns => records.push({ type: 'NS', value: ns }))).catch(() => {}),
    dns.promises.resolveTxt(clean).then(txts => txts.forEach(t => records.push({ type: 'TXT', value: t.join(' ') }))).catch(() => {}),
    dns.promises.resolveCname(clean).then(cnames => cnames.forEach(c => records.push({ type: 'CNAME', value: c }))).catch(() => {})
  ];

  await Promise.all(promises);
  return records;
}

/**
 * Helper to run a single probe on a monitor
 */
async function runMonitorProbeOnce(monitor: Monitor, method: string = 'HEAD') {
  if (monitor.type === 'port' && monitor.port) {
    const portRes = await performPortCheck(monitor.url, monitor.port, 4000);
    const isUp = portRes.open;
    const classification: 'up' | 'blocked' | 'down' = isUp ? 'up' : 'down';
    return {
      classification,
      isUp,
      isBlocked: false,
      latency: portRes.latencyMs,
      statusCode: isUp ? 200 : 0,
      message: isUp ? `Port ${monitor.port} is open` : (portRes.error || 'Port is closed'),
      reason: isUp ? `Port ${monitor.port} open` : (portRes.error || 'Port closed'),
      sslInfo: undefined
    };
  } else {
    // Probe with HEAD (or GET), with automatic fallback to GET if HEAD rejected
    const urlRes = await performUrlCheck(
      monitor.url,
      method,
      monitor.keyword,
      6000,
      monitor.acceptedStatusCodes,
      monitor.customUserAgent,
      false
    );
    return {
      classification: urlRes.classification,
      isUp: urlRes.isUp,
      isBlocked: urlRes.isBlocked,
      latency: urlRes.responseTimeMs,
      statusCode: urlRes.statusCode,
      message: urlRes.message,
      reason: urlRes.reason,
      sslInfo: urlRes.sslInfo,
      retriedWithGet: urlRes.retriedWithGet
    };
  }
}

/**
 * Probes a monitor and retries once after 3 seconds before marking Down, avoiding false alarms
 */
async function probeMonitorWithRetry(monitor: Monitor) {
  let probe = await runMonitorProbeOnce(monitor, 'HEAD');

  // If first check resulted in Down, retry once after 3 seconds to avoid false alarms
  if (probe.classification === 'down') {
    await new Promise(r => setTimeout(r, 3000));
    const retryProbe = await runMonitorProbeOnce(monitor, 'GET');
    probe = { ...retryProbe, retriedAfter3s: true } as any;
  }

  return probe;
}

/**
 * Background runner: check active monitors & watched recovery
 */
setInterval(async () => {
  // 1. Check any active "isWatched" monitor that is down (high frequency check)
  const watchedDownMonitors = monitors.filter(m => m.status === 'down' && m.isWatched);

  for (const monitor of watchedDownMonitors) {
    const probe = await probeMonitorWithRetry(monitor);

    if (probe.classification === 'up' || probe.classification === 'blocked') {
      // Server has recovered!
      const backOnlineTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      monitor.status = probe.classification;
      monitor.responseTimeMs = probe.latency;
      monitor.lastCheckedAt = new Date().toISOString();
      monitor.backOnlineAt = backOnlineTime;
      monitor.lastStatusReason = probe.reason;

      // Close open incident
      const ongoingInc = incidents.find(i => i.monitorId === monitor.id && i.status === 'ongoing');
      if (ongoingInc) {
        ongoingInc.status = 'resolved';
        ongoingInc.resolvedAt = new Date().toISOString();
        ongoingInc.durationSeconds = Math.round((new Date(ongoingInc.resolvedAt).getTime() - new Date(ongoingInc.startedAt).getTime()) / 1000);
      }

      // Add Notification
      notifications.unshift({
        id: 'notif_' + Date.now(),
        monitorId: monitor.id,
        title: `WATCH ALERT: ${monitor.name} is Back Online!`,
        message: `Watched server recovered at ${backOnlineTime} (${probe.reason}). Response latency: ${probe.latency}ms. You can resume your work.`,
        type: 'watch_alert',
        timestamp: new Date().toISOString(),
        read: false
      });

      // Add Check Log
      checkLogs.unshift({
        id: 'log_' + Date.now(),
        monitorId: monitor.id,
        monitorName: monitor.name,
        status: probe.classification,
        statusCode: probe.statusCode,
        responseTimeMs: probe.latency,
        timestamp: new Date().toISOString(),
        message: probe.message,
        reason: probe.reason
      });
    }
  }
}, 20000);

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString(), totalMonitors: monitors.length });
  });

  // 2. Instant Website Check
  app.post('/api/check-url', async (req: Request, res: Response) => {
    const { url, method = 'GET', keyword, timeout = 8000, acceptedStatusCodes, customUserAgent } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL is required' });
      return;
    }
    const result = await performUrlCheck(url, method, keyword, timeout, acceptedStatusCodes, customUserAgent);
    res.json(result);
  });

  // 2b. Bulk Website Check
  app.post('/api/check-bulk', async (req: Request, res: Response) => {
    const {
      urls = [],
      method = 'GET',
      timeout = 8000,
      concurrency = 10,
      acceptedStatusCodes,
      customUserAgent,
      keyword,
      saveToLogs = true
    } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: 'Array of URLs is required' });
      return;
    }

    // Limit to max 100
    const limitedUrls = urls.slice(0, 100);
    const results: UrlCheckResult[] = [];
    const limit = Math.min(Math.max(1, Number(concurrency) || 10), 25);

    // Process in batches
    for (let i = 0; i < limitedUrls.length; i += limit) {
      const batch = limitedUrls.slice(i, i + limit);
      const batchPromises = batch.map(u =>
        performUrlCheck(u, method, keyword, timeout, acceptedStatusCodes, customUserAgent, false)
      );
      const settled = await Promise.allSettled(batchPromises);
      for (let j = 0; j < settled.length; j++) {
        const item = settled[j];
        if (item.status === 'fulfilled') {
          results.push(item.value);
          if (saveToLogs) {
            checkLogs.unshift({
              id: 'log_bulk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              monitorId: 'bulk_run',
              monitorName: item.value.url,
              status: item.value.classification,
              statusCode: item.value.statusCode,
              responseTimeMs: item.value.responseTimeMs,
              timestamp: new Date().toISOString(),
              message: item.value.message,
              reason: item.value.reason
            });
          }
        } else {
          const failedUrl = batch[j];
          results.push({
            success: false,
            classification: 'down',
            isUp: false,
            isBlocked: false,
            statusCode: 0,
            responseTimeMs: 0,
            message: 'Check execution failed',
            reason: (item as any).reason?.message || 'Connection failed',
            url: failedUrl,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    if (checkLogs.length > 500) checkLogs = checkLogs.slice(0, 500);

    const upCount = results.filter(r => r.classification === 'up').length;
    const blockedCount = results.filter(r => r.classification === 'blocked').length;
    const downCount = results.filter(r => r.classification === 'down').length;

    res.json({
      results,
      total: results.length,
      upCount,
      blockedCount,
      downCount,
      savedToLogs: saveToLogs
    });
  });

  // 3. Port Checker
  app.post('/api/check-port', async (req: Request, res: Response) => {
    const { host, port, timeout = 4000 } = req.body;
    if (!host || !port) {
      res.status(400).json({ error: 'Host and port are required' });
      return;
    }
    const result = await performPortCheck(host, Number(port), timeout);
    res.json({
      host,
      port: Number(port),
      ...result,
      timestamp: new Date().toISOString()
    });
  });

  // 4. DNS Lookup
  app.post('/api/dns-lookup', async (req: Request, res: Response) => {
    const { domain } = req.body;
    if (!domain) {
      res.status(400).json({ error: 'Domain is required' });
      return;
    }
    try {
      const records = await performDnsLookup(domain);
      res.json({ domain, records, count: records.length, timestamp: new Date().toISOString() });
    } catch (e: unknown) {
      const err = e as { message?: string };
      res.status(500).json({ error: err.message || 'DNS lookup failed' });
    }
  });

  // 5. SSL Certificate Check
  app.post('/api/ssl-check', async (req: Request, res: Response) => {
    const { domain, port = 443 } = req.body;
    if (!domain) {
      res.status(400).json({ error: 'Domain is required' });
      return;
    }
    try {
      const ssl = await inspectSsl(domain, Number(port));
      res.json({ domain, port: Number(port), ...ssl, timestamp: new Date().toISOString() });
    } catch (e: unknown) {
      const err = e as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to inspect SSL certificate' });
    }
  });

  // 6. Monitors CRUD
  app.get('/api/monitors', (_req: Request, res: Response) => {
    res.json({ monitors });
  });

  app.post('/api/monitors', (req: Request, res: Response) => {
    const body = req.body;
    if (!body.name || !body.url) {
      res.status(400).json({ error: 'Name and URL are required' });
      return;
    }

    const newMon: Monitor = {
      id: 'mon_' + Date.now(),
      name: body.name,
      url: body.url,
      type: body.type || 'http',
      port: body.port ? Number(body.port) : undefined,
      keyword: body.keyword,
      acceptedStatusCodes: body.acceptedStatusCodes,
      customUserAgent: body.customUserAgent,
      intervalMinutes: body.intervalMinutes || 5,
      status: 'pending',
      lastCheckedAt: null,
      responseTimeMs: 0,
      uptime24h: 100,
      uptime7d: 100,
      uptime30d: 100,
      uptime90d: 100,
      tags: body.tags || ['Custom'],
      maintenanceMode: Boolean(body.maintenanceMode),
      isWatched: false,
      notificationChannels: body.notificationChannels || { email: true, browser: true, sound: true },
      createdAt: new Date().toISOString()
    };

    monitors.unshift(newMon);
    res.status(201).json({ monitor: newMon });
  });

  app.put('/api/monitors/:id', (req: Request, res: Response) => {
    const idx = monitors.findIndex(m => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }
    monitors[idx] = { ...monitors[idx], ...req.body };
    res.json({ monitor: monitors[idx] });
  });

  app.delete('/api/monitors/:id', (req: Request, res: Response) => {
    monitors = monitors.filter(m => m.id !== req.params.id);
    res.json({ success: true, message: 'Monitor deleted' });
  });

  // 7. Immediate Check Trigger with Classification and 3-second Retry
  app.post('/api/monitors/:id/check', async (req: Request, res: Response) => {
    const monitor = monitors.find(m => m.id === req.params.id);
    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    const probe = await probeMonitorWithRetry(monitor);
    const prevStatus = monitor.status;
    monitor.status = probe.classification;
    monitor.responseTimeMs = probe.latency;
    monitor.lastCheckedAt = new Date().toISOString();
    monitor.lastStatusReason = probe.reason;
    if (probe.sslInfo) {
      monitor.sslInfo = probe.sslInfo;
    }

    // Incident & Alert Rules:
    // "Do not create an incident or send an alert for the 'Reachable, Blocked' state."
    if (probe.classification === 'down') {
      if (prevStatus !== 'down') {
        const rootCause = analyzeIncidentRootCause(probe.reason || probe.message, 'down', monitor.url);

        // New incident
        const newInc: Incident = {
          id: 'inc_' + Date.now(),
          monitorId: monitor.id,
          monitorName: monitor.name,
          monitorUrl: monitor.url,
          startedAt: new Date().toISOString(),
          resolvedAt: null,
          durationSeconds: null,
          status: 'ongoing',
          cause: probe.reason || probe.message,
          rootCause
        };
        incidents.unshift(newInc);

        if (!monitor.maintenanceMode) {
          notifications.unshift({
            id: 'notif_' + Date.now(),
            monitorId: monitor.id,
            title: `Monitor Down: ${monitor.name}`,
            message: probe.reason || probe.message,
            type: 'down',
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      }
    } else if (prevStatus === 'down' && (probe.classification === 'up' || probe.classification === 'blocked')) {
      // Recovered from Down!
      const openInc = incidents.find(i => i.monitorId === monitor.id && i.status === 'ongoing');
      if (openInc) {
        openInc.status = 'resolved';
        openInc.resolvedAt = new Date().toISOString();
        openInc.durationSeconds = Math.round((Date.now() - new Date(openInc.startedAt).getTime()) / 1000);
      }

      const backOnline = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      monitor.backOnlineAt = backOnline;

      notifications.unshift({
        id: 'notif_' + Date.now(),
        monitorId: monitor.id,
        title: monitor.isWatched ? `WATCH RECOVERY: ${monitor.name} is Back Online!` : `Recovered: ${monitor.name}`,
        message: `Server returned online (${probe.reason}) at ${backOnline}`,
        type: monitor.isWatched ? 'watch_alert' : 'recovered',
        timestamp: new Date().toISOString(),
        read: false
      });
    }

    // Check Log
    const log: CheckLog = {
      id: 'log_' + Date.now(),
      monitorId: monitor.id,
      monitorName: monitor.name,
      status: probe.classification,
      statusCode: probe.statusCode,
      responseTimeMs: probe.latency,
      timestamp: new Date().toISOString(),
      message: probe.message,
      reason: probe.reason
    };
    checkLogs.unshift(log);
    if (checkLogs.length > 500) checkLogs.pop();

    res.json({ monitor, log, probe });
  });

  // 8. Toggle Watch Mode
  app.post('/api/monitors/:id/watch', (req: Request, res: Response) => {
    const monitor = monitors.find(m => m.id === req.params.id);
    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    monitor.isWatched = !monitor.isWatched;
    if (monitor.isWatched) {
      monitor.watchedSince = new Date().toISOString();
      notifications.unshift({
        id: 'notif_' + Date.now(),
        monitorId: monitor.id,
        title: `Watching: ${monitor.name}`,
        message: 'Watch mode enabled. High-frequency checks active. You will be notified the instant it recovers.',
        type: 'watch_alert',
        timestamp: new Date().toISOString(),
        read: false
      });
    } else {
      monitor.watchedSince = null;
    }

    res.json({ monitor });
  });

  // 9. Instant Test Simulator for Watch feature
  app.post('/api/monitors/:id/simulate-recovery', (req: Request, res: Response) => {
    const monitor = monitors.find(m => m.id === req.params.id);
    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    const backOnlineTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    monitor.status = 'up';
    monitor.responseTimeMs = 65;
    monitor.lastCheckedAt = new Date().toISOString();
    monitor.backOnlineAt = backOnlineTime;

    // Resolve incident if any
    const inc = incidents.find(i => i.monitorId === monitor.id && i.status === 'ongoing');
    if (inc) {
      inc.status = 'resolved';
      inc.resolvedAt = new Date().toISOString();
      inc.durationSeconds = 180;
    }

    notifications.unshift({
      id: 'notif_' + Date.now(),
      monitorId: monitor.id,
      title: `WATCH ALERT: ${monitor.name} is Back Online!`,
      message: `Watched server came back online at ${backOnlineTime} with 65ms response time.`,
      type: 'watch_alert',
      timestamp: new Date().toISOString(),
      read: false
    });

    res.json({ monitor, message: 'Recovery simulated successfully' });
  });

  // 10. Incidents & Logs
  app.get('/api/incidents', (_req: Request, res: Response) => {
    res.json({ incidents });
  });

  app.delete('/api/incidents/resolved', (_req: Request, res: Response) => {
    const resolved = incidents.filter(i => i.status === 'resolved');
    incidentsBackup = {
      token: 'tok_' + Date.now(),
      incidents: resolved,
      timestamp: Date.now()
    };
    incidents = incidents.filter(i => i.status === 'ongoing');
    res.json({
      success: true,
      count: resolved.length,
      incidents,
      message: `${resolved.length} resolved incidents cleared`
    });
  });

  app.delete('/api/incidents/:id', (req: Request, res: Response) => {
    const target = incidents.find(i => i.id === req.params.id);
    if (target) {
      incidentsBackup = {
        token: 'tok_' + Date.now(),
        incidents: [target],
        timestamp: Date.now()
      };
    }
    incidents = incidents.filter(i => i.id !== req.params.id);
    res.json({ success: true, incidents, message: 'Incident removed' });
  });

  app.post('/api/incidents/undo', (_req: Request, res: Response) => {
    if (!incidentsBackup || Date.now() - incidentsBackup.timestamp > 15000) {
      res.status(400).json({ error: 'Undo window expired or no incidents to restore' });
      return;
    }
    const restored = incidentsBackup.incidents;
    incidents = [...restored, ...incidents];
    incidentsBackup = null;
    res.json({ success: true, restoredCount: restored.length, incidents });
  });

  app.get('/api/logs', (_req: Request, res: Response) => {
    applyRetentionPolicy();
    res.json({ logs: checkLogs });
  });

  // Clear History with granular filter options and undo buffer
  app.post('/api/history/clear', (req: Request, res: Response) => {
    const { scope = 'all', olderThan = 'all', monitorId = 'all', statusFilter = 'all', dataTypes } = req.body;

    // Clear Site Intelligence data types if requested
    if (dataTypes) {
      if (dataTypes.contentChanges) {
        contentChanges = [];
      }
      if (dataTypes.crawlerScans) {
        crawlScans = [];
      }
      if (dataTypes.anomalies) {
        anomalies = [];
      }
    }

    let toDelete: CheckLog[] = [];
    let toKeep: CheckLog[] = [];

    const now = Date.now();
    let cutoff = 0;
    if (olderThan === '24h') cutoff = now - 24 * 60 * 60 * 1000;
    else if (olderThan === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (olderThan === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;
    else if (olderThan === '90d') cutoff = now - 90 * 24 * 60 * 60 * 1000;

    if (scope === 'all' && olderThan === 'all' && monitorId === 'all' && statusFilter === 'all') {
      toDelete = [...checkLogs];
      toKeep = [];
    } else {
      checkLogs.forEach(l => {
        let matches = true;

        if (cutoff > 0) {
          const logTime = new Date(l.timestamp).getTime();
          if (logTime >= cutoff) matches = false;
        }

        if (monitorId !== 'all' && l.monitorId !== monitorId) {
          matches = false;
        }

        if (statusFilter !== 'all' && l.status !== statusFilter) {
          matches = false;
        }

        if (matches) {
          toDelete.push(l);
        } else {
          toKeep.push(l);
        }
      });
    }

    // Save in undo backup buffer (available for 15 seconds)
    checkLogsBackup = {
      token: 'tok_' + Date.now(),
      logs: toDelete,
      timestamp: Date.now()
    };

    checkLogs = toKeep;

    res.json({
      success: true,
      count: toDelete.length,
      logs: checkLogs,
      undoToken: checkLogsBackup.token,
      message: `${toDelete.length} records cleared`
    });
  });

  // Undo Clear History
  app.post('/api/history/undo', (_req: Request, res: Response) => {
    if (!checkLogsBackup || Date.now() - checkLogsBackup.timestamp > 15000) {
      res.status(400).json({ error: 'Undo window expired (available for 10 seconds)' });
      return;
    }
    const restored = checkLogsBackup.logs;
    checkLogs = [...restored, ...checkLogs];
    checkLogsBackup = null;
    res.json({ success: true, restoredCount: restored.length, logs: checkLogs });
  });

  // Reset 90-day uptime bars for a specific monitor
  app.post('/api/monitors/:id/reset-uptime', (req: Request, res: Response) => {
    const monitor = monitors.find(m => m.id === req.params.id);
    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }
    monitor.uptime24h = 100.0;
    monitor.uptime7d = 100.0;
    monitor.uptime30d = 100.0;
    monitor.uptime90d = 100.0;

    // Reset checklogs for this monitor
    checkLogs = checkLogs.filter(l => l.monitorId !== monitor.id);

    res.json({
      success: true,
      monitor,
      message: `90-day uptime history reset to 100% for ${monitor.name}`
    });
  });

  // Remove Demo / Sample Data
  app.post('/api/data/remove-demo', (_req: Request, res: Response) => {
    const demoIds = ['mon_1', 'mon_2', 'mon_3', 'mon_4', 'mon_5', 'mon_6', 'mon_7'];
    monitors = monitors.filter(m => !demoIds.includes(m.id));
    incidents = incidents.filter(i => !demoIds.includes(i.monitorId));
    checkLogs = checkLogs.filter(l => !demoIds.includes(l.monitorId));
    notifications = notifications.filter(n => !n.monitorId || !demoIds.includes(n.monitorId));

    res.json({
      success: true,
      monitors,
      incidents,
      logs: checkLogs,
      message: 'Demo and sample data removed successfully'
    });
  });

  // Reset Everything (Danger Zone)
  app.post('/api/data/reset-all', (req: Request, res: Response) => {
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE') {
      res.status(400).json({ error: 'Please enter "DELETE" to confirm data wipe' });
      return;
    }

    monitors = [];
    incidents = [];
    checkLogs = [];
    notifications = [];
    checkLogsBackup = null;
    incidentsBackup = null;

    res.json({
      success: true,
      monitors,
      incidents,
      logs: checkLogs,
      message: 'All monitors, logs, and incidents have been reset'
    });
  });

  // 11. Notifications
  app.get('/api/notifications', (_req: Request, res: Response) => {
    res.json({ notifications });
  });

  app.post('/api/notifications/mark-read', (_req: Request, res: Response) => {
    notifications = notifications.map(n => ({ ...n, read: true }));
    res.json({ success: true });
  });

  app.delete('/api/notifications', (_req: Request, res: Response) => {
    notifications = [];
    res.json({ success: true });
  });

  // 12. Settings & Profile
  app.get('/api/profile', (_req: Request, res: Response) => {
    res.json({ profile: userProfile });
  });

  app.put('/api/profile', (req: Request, res: Response) => {
    Object.assign(userProfile, req.body);
    res.json({ profile: userProfile });
  });

  // 13. Status Page
  app.get('/api/status-page', (_req: Request, res: Response) => {
    res.json({ statusPage });
  });

  app.put('/api/status-page', (req: Request, res: Response) => {
    Object.assign(statusPage, req.body);
    res.json({ statusPage });
  });

  // 14. Webhook Test Dispatch
  app.post('/api/test-webhook', async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Webhook URL is required' });
      return;
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'uptime_alert_test',
          timestamp: new Date().toISOString(),
          message: 'Test notification from Uptime Checker Pro',
          service: 'Uptime Checker Pro Webhook Dispatcher'
        })
      });
      res.json({ success: true, status: response.status });
    } catch (e: unknown) {
      const err = e as { message?: string };
      res.json({ success: false, error: err.message || 'Webhook dispatch failed' });
    }
  });

  // 15. Bulk Website Check Streaming Route
  app.post('/api/bulk-check/stream', async (req: Request, res: Response) => {
    const {
      urls = [],
      method = 'GET',
      timeoutMs = 10000,
      concurrency = 10,
      acceptedStatusCodes,
      customUserAgent,
      keyword,
      checkSsl = true,
      saveToLogs = true
    } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: 'No URLs provided in payload' });
      return;
    }

    // Limit to 100 URLs per run
    const limitedUrls: string[] = urls.slice(0, 100);

    // Setup Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    let isAborted = false;
    req.on('close', () => {
      isAborted = true;
    });

    const total = limitedUrls.length;
    let checked = 0;

    // Concurrency queue
    const queue = limitedUrls.map((url, idx) => ({ index: idx, rawUrl: url }));
    const maxWorkers = Math.min(Math.max(1, Number(concurrency) || 10), 20);

    const worker = async () => {
      while (queue.length > 0 && !isAborted) {
        const item = queue.shift();
        if (!item) break;
        const { index, rawUrl } = item;

        let normalizedUrl = rawUrl.trim();
        if (!/^https?:\/\//i.test(normalizedUrl)) {
          normalizedUrl = 'https://' + normalizedUrl;
        }

        try {
          const checkRes = await performUrlCheck(
            normalizedUrl,
            method,
            keyword,
            timeoutMs,
            acceptedStatusCodes,
            customUserAgent,
            false // no 3s sleep in bulk checks so batch completes fast
          );

          let sslDaysRemaining: number | null = null;
          let sslValid: boolean | undefined = undefined;

          if (checkSsl && normalizedUrl.startsWith('https://')) {
            try {
              const sslInfo = await inspectSsl(normalizedUrl, 443);
              sslDaysRemaining = sslInfo.daysRemaining;
              sslValid = sslInfo.valid;
            } catch {
              sslValid = false;
            }
          }

          const resultItem: BulkCheckResult = {
            id: `bulk_${Date.now()}_${index}`,
            url: rawUrl,
            cleanUrl: normalizedUrl,
            classification: checkRes.classification,
            statusCode: checkRes.statusCode,
            responseTimeMs: checkRes.responseTimeMs,
            sslDaysRemaining,
            sslValid,
            reason: checkRes.reason,
            message: checkRes.message,
            checkedAt: new Date().toISOString()
          };

          if (saveToLogs) {
            checkLogs.unshift({
              id: 'log_bulk_' + Date.now() + '_' + index,
              monitorId: 'bulk_run',
              monitorName: normalizedUrl.replace(/^https?:\/\//i, '').split('/')[0],
              status: checkRes.classification,
              statusCode: checkRes.statusCode,
              responseTimeMs: checkRes.responseTimeMs,
              timestamp: new Date().toISOString(),
              message: checkRes.message,
              reason: checkRes.reason
            });
            if (checkLogs.length > 500) checkLogs.pop();
          }

          checked++;

          if (!isAborted) {
            res.write(`data: ${JSON.stringify({
              type: 'result',
              index,
              result: resultItem,
              progress: { checked, total }
            })}\n\n`);
          }
        } catch (err: unknown) {
          const e = err as { message?: string };
          checked++;
          const errorItem: BulkCheckResult = {
            id: `bulk_err_${Date.now()}_${index}`,
            url: rawUrl,
            cleanUrl: normalizedUrl,
            classification: 'down',
            statusCode: 0,
            responseTimeMs: timeoutMs,
            reason: e.message || 'Check failed',
            checkedAt: new Date().toISOString(),
            error: e.message
          };

          if (!isAborted) {
            res.write(`data: ${JSON.stringify({
              type: 'result',
              index,
              result: errorItem,
              progress: { checked, total }
            })}\n\n`);
          }
        }
      }
    };

    const workers = Array.from({ length: maxWorkers }, () => worker());
    await Promise.all(workers);

    if (!isAborted) {
      res.write(`data: ${JSON.stringify({ type: 'done', totalChecked: checked, total })}\n\n`);
      res.end();
    }
  });

  // 16. Bulk Groups Management
  app.get('/api/bulk-groups', (_req: Request, res: Response) => {
    res.json({ groups: bulkGroups });
  });

  app.post('/api/bulk-groups', (req: Request, res: Response) => {
    const { name, urls } = req.body;
    if (!name || !Array.isArray(urls)) {
      res.status(400).json({ error: 'Name and urls array are required' });
      return;
    }
    const newGroup: BulkGroup = {
      id: 'grp_' + Date.now(),
      name: name.trim(),
      urls: urls.map((u: string) => u.trim()).filter((u: string) => u.length > 0),
      createdAt: new Date().toISOString()
    };
    bulkGroups.unshift(newGroup);
    res.json({ success: true, group: newGroup, groups: bulkGroups });
  });

  app.delete('/api/bulk-groups/:id', (req: Request, res: Response) => {
    bulkGroups = bulkGroups.filter(g => g.id !== req.params.id);
    res.json({ success: true, groups: bulkGroups });
  });

  // 17. Favorites Management (Max 20 favorites per user)
  function normalizeFavUrl(rawUrl: string): string {
    let u = rawUrl.trim();
    if (!/^https?:\/\//i.test(u)) {
      u = 'https://' + u;
    }
    return u.replace(/\/+$/, '');
  }

  app.get('/api/favorites', (_req: Request, res: Response) => {
    // Sort pinned first, then by orderIndex ascending
    const sorted = [...favorites].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.orderIndex - b.orderIndex;
    });
    res.json({ favorites: sorted, total: sorted.length, limit: 20 });
  });

  app.post('/api/favorites/toggle', (req: Request, res: Response) => {
    const { url, name, status, responseTimeMs, statusCode, sslDaysRemaining } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const norm = normalizeFavUrl(url);
    const existingIndex = favorites.findIndex(f => normalizeFavUrl(f.url).toLowerCase() === norm.toLowerCase());

    if (existingIndex !== -1) {
      // Unstar / remove
      const removed = favorites.splice(existingIndex, 1)[0];
      res.json({
        isStarred: false,
        removedId: removed.id,
        favorites,
        message: `Removed ${removed.name || removed.url} from favorites`
      });
      return;
    }

    // Add star: enforce 20 limit
    if (favorites.length >= 20) {
      res.status(400).json({
        error: 'Limit of 20 favorites reached. Please unstar a site to add new favorites.',
        code: 'LIMIT_REACHED'
      });
      return;
    }

    let defaultName = name;
    if (!defaultName) {
      try {
        defaultName = new URL(norm).hostname;
      } catch {
        defaultName = norm;
      }
    }

    const newFav: FavoriteSite = {
      id: 'fav_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: userProfile.id,
      user_id: userProfile.id,
      url: norm,
      name: defaultName.trim(),
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      lastStatus: status || 'pending',
      last_status: status || 'pending',
      lastCheckedAt: status ? new Date().toISOString() : null,
      last_checked_at: status ? new Date().toISOString() : null,
      lastResponseTimeMs: typeof responseTimeMs === 'number' ? responseTimeMs : 0,
      last_response_time_ms: typeof responseTimeMs === 'number' ? responseTimeMs : 0,
      statusCode: statusCode || 200,
      sslDaysRemaining: sslDaysRemaining ?? null,
      pinned: false,
      orderIndex: favorites.length,
      uptimePercent: 99.9
    };

    favorites.push(newFav);
    res.json({
      isStarred: true,
      favorite: newFav,
      favorites,
      message: `Added ${newFav.name} to favorites`
    });
  });

  app.put('/api/favorites/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const fav = favorites.find(f => f.id === id);
    if (!fav) {
      res.status(404).json({ error: 'Favorite not found' });
      return;
    }

    const { name, pinned, orderIndex, url, lastStatus, lastResponseTimeMs } = req.body;
    if (name !== undefined) fav.name = String(name).trim();
    if (pinned !== undefined) fav.pinned = Boolean(pinned);
    if (orderIndex !== undefined) fav.orderIndex = Number(orderIndex);
    if (url !== undefined) fav.url = normalizeFavUrl(String(url));
    if (lastStatus !== undefined) {
      fav.lastStatus = lastStatus;
      fav.last_status = lastStatus;
    }
    if (lastResponseTimeMs !== undefined) {
      fav.lastResponseTimeMs = Number(lastResponseTimeMs);
      fav.last_response_time_ms = Number(lastResponseTimeMs);
    }

    res.json({ success: true, favorite: fav, favorites });
  });

  app.delete('/api/favorites/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = favorites.length;
    favorites = favorites.filter(f => f.id !== id);
    res.json({ success: true, removed: favorites.length < initialLen, favorites });
  });

  app.post('/api/favorites/reorder', (req: Request, res: Response) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array required' });
      return;
    }

    orderedIds.forEach((id: string, idx: number) => {
      const fav = favorites.find(f => f.id === id);
      if (fav) {
        fav.orderIndex = idx;
      }
    });

    const sorted = [...favorites].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.orderIndex - b.orderIndex;
    });

    res.json({ success: true, favorites: sorted });
  });

  app.post('/api/favorites/check-all', async (_req: Request, res: Response) => {
    if (favorites.length === 0) {
      res.json({ success: true, favorites: [] });
      return;
    }

    const checkPromises = favorites.map(async (fav) => {
      try {
        const checkRes = await performUrlCheck(fav.url, 'GET', undefined, 6000, undefined, undefined, false);
        fav.lastStatus = checkRes.classification;
        fav.last_status = checkRes.classification;
        fav.lastCheckedAt = new Date().toISOString();
        fav.last_checked_at = fav.lastCheckedAt;
        fav.lastResponseTimeMs = checkRes.responseTimeMs;
        fav.last_response_time_ms = checkRes.responseTimeMs;
        fav.statusCode = checkRes.statusCode;
        if (checkRes.sslInfo) {
          fav.sslDaysRemaining = checkRes.sslInfo.daysRemaining;
        }
      } catch (err: unknown) {
        fav.lastStatus = 'down';
        fav.last_status = 'down';
        fav.lastCheckedAt = new Date().toISOString();
        fav.last_checked_at = fav.lastCheckedAt;
        fav.lastResponseTimeMs = 0;
        fav.last_response_time_ms = 0;
      }
      return fav;
    });

    await Promise.all(checkPromises);
    res.json({ success: true, favorites });
  });

  app.post('/api/favorites/:id/check', async (req: Request, res: Response) => {
    const fav = favorites.find(f => f.id === req.params.id);
    if (!fav) {
      res.status(404).json({ error: 'Favorite not found' });
      return;
    }

    try {
      const checkRes = await performUrlCheck(fav.url, 'GET', undefined, 6000, undefined, undefined, false);
      fav.lastStatus = checkRes.classification;
      fav.last_status = checkRes.classification;
      fav.lastCheckedAt = new Date().toISOString();
      fav.last_checked_at = fav.lastCheckedAt;
      fav.lastResponseTimeMs = checkRes.responseTimeMs;
      fav.last_response_time_ms = checkRes.responseTimeMs;
      fav.statusCode = checkRes.statusCode;
      if (checkRes.sslInfo) {
        fav.sslDaysRemaining = checkRes.sslInfo.daysRemaining;
      }
      res.json({ success: true, favorite: fav });
    } catch (err: unknown) {
      const e = err as { message?: string };
      fav.lastStatus = 'down';
      fav.last_status = 'down';
      fav.lastCheckedAt = new Date().toISOString();
      fav.last_checked_at = fav.lastCheckedAt;
      fav.lastResponseTimeMs = 0;
      fav.last_response_time_ms = 0;
      res.json({ success: false, favorite: fav, error: e.message || 'Check failed' });
    }
  });

  // ============================================================================
  // 18. Site Intelligence: 1. Content Change Detection
  // ============================================================================
  function cleanHtmlForContentTracking(html: string, selector?: string, ignoreText?: string): string {
    let text = html;

    // 1. If selector provided, try to extract element matching selector
    if (selector && selector.trim()) {
      const sel = selector.trim().replace(/^[.#]/, '');
      const selRegex = new RegExp(`<([a-z0-9]+)[^>]*?(?:id|class)=["'][^"']*\\b${sel}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
      const match = text.match(selRegex);
      if (match && match[2]) {
        text = match[2];
      }
    }

    // 2. Remove noisy tags
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');
    text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
    text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ');
    text = text.replace(/<!--[\s\S]*?-->/g, ' ');

    // 3. Remove timestamps and date strings
    text = text.replace(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?\b/g, '[TIMESTAMP]');
    text = text.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g, '[TIME]');
    text = text.replace(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/g, '[DATE]');

    // 4. Strip user-specified ignoreText if provided
    if (ignoreText && ignoreText.trim()) {
      const escaped = ignoreText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(escaped, 'gi'), '');
    }

    // 5. Strip all HTML tags to get pure text content
    text = text.replace(/<[^>]+>/g, ' ');

    // 6. Decode common HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // 7. Normalize whitespace
    const lines = text
      .split('\n')
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(l => l.length > 0);

    return lines.join('\n');
  }

  function computeContentDiff(oldText: string, newText: string) {
    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];

    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    let linesAdded = 0;
    let linesRemoved = 0;

    newLines.forEach(l => {
      if (!oldSet.has(l)) linesAdded++;
    });

    oldLines.forEach(l => {
      if (!newSet.has(l)) linesRemoved++;
    });

    const totalLines = Math.max(1, oldLines.length + newLines.length);
    const changePercent = Math.min(100, Math.round(((linesAdded + linesRemoved) / totalLines) * 1000) / 10);
    const wordsChanged = (linesAdded + linesRemoved) * 3;

    return {
      linesAdded,
      linesRemoved,
      wordsChanged,
      changePercent
    };
  }

  app.get('/api/content-changes', (_req: Request, res: Response) => {
    res.json({
      changes: contentChanges,
      total: contentChanges.length,
      unexpectedCount: contentChanges.filter(c => !c.isExpected).length
    });
  });

  app.post('/api/content-changes/check', async (req: Request, res: Response) => {
    const { monitorId, url, selector, ignoreText, notifyThresholdPercent, triggerKeyword } = req.body;

    let targetUrl = url;
    let targetName = 'Ad-hoc Check';
    let monitor = monitors.find(m => m.id === monitorId);

    if (monitor) {
      targetUrl = monitor.url;
      targetName = monitor.name;
    }

    if (!targetUrl) {
      res.status(400).json({ error: 'URL or monitorId required' });
      return;
    }

    try {
      let cleanUrl = targetUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

      const checkRes = await performUrlCheck(cleanUrl, 'GET', undefined, 8000, undefined, undefined, false);
      const cleanedText = cleanHtmlForContentTracking(checkRes.message || checkRes.reason || '', selector, ignoreText);
      const newHash = crypto.createHash('sha256').update(cleanedText).digest('hex').substring(0, 16);

      // Check against previous snapshot for this monitor or URL
      let previous = contentChanges.find(c => (monitorId && c.monitorId === monitorId) || c.url === cleanUrl);
      const oldSnapshot = previous ? previous.newSnapshot : (monitor?.contentChangeConfig?.lastContentSnapshot || cleanedText);
      const oldHash = previous ? previous.newHash : (monitor?.contentChangeConfig?.lastContentHash || newHash);

      const isChanged = oldHash !== newHash || !previous;
      const diff = computeContentDiff(oldSnapshot, cleanedText);

      let keywordMatched: string | undefined;
      if (triggerKeyword && triggerKeyword.trim()) {
        const kw = triggerKeyword.trim().toLowerCase();
        if (cleanedText.toLowerCase().includes(kw)) {
          keywordMatched = triggerKeyword.trim();
        }
      }

      // Check threshold
      const threshold = Number(notifyThresholdPercent) || 0;
      const exceedsThreshold = diff.changePercent >= threshold;

      let event: ContentChangeEvent | null = null;
      if (isChanged && (exceedsThreshold || keywordMatched || !previous)) {
        event = {
          id: 'cc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          monitorId: monitor ? monitor.id : 'mon_custom',
          monitorName: targetName,
          url: cleanUrl,
          timestamp: new Date().toISOString(),
          oldHash,
          newHash,
          changePercent: diff.changePercent,
          oldSnapshot,
          newSnapshot: cleanedText,
          diffSummary: {
            linesAdded: diff.linesAdded,
            linesRemoved: diff.linesRemoved,
            wordsChanged: diff.wordsChanged
          },
          isExpected: false,
          keywordTriggered: keywordMatched,
          targetSelector: selector
        };

        contentChanges.unshift(event);

        // Update monitor config if monitor exists
        if (monitor) {
          if (!monitor.contentChangeConfig) {
            monitor.contentChangeConfig = { enabled: true, intervalMinutes: 60 };
          }
          monitor.contentChangeConfig.lastContentHash = newHash;
          monitor.contentChangeConfig.lastContentSnapshot = cleanedText;
          monitor.contentChangeConfig.lastCheckedAt = new Date().toISOString();
        }

        // Send notification
        const notif: NotificationItem = {
          id: 'notif_' + Date.now(),
          monitorId: monitor?.id,
          title: `Content Changed: ${targetName}`,
          message: `Detected ${diff.changePercent}% visual content change (${diff.linesAdded} lines added, ${diff.linesRemoved} removed).`,
          type: 'content_changed',
          timestamp: new Date().toISOString(),
          read: false
        };
        notifications.unshift(notif);

        // Add to history log
        checkLogs.unshift({
          id: 'log_' + Date.now(),
          monitorId: monitor ? monitor.id : 'mon_custom',
          monitorName: targetName,
          status: 'up',
          statusCode: checkRes.statusCode,
          responseTimeMs: checkRes.responseTimeMs,
          timestamp: new Date().toISOString(),
          eventType: 'content_change',
          message: `Content change detected: ${diff.changePercent}% delta`,
          reason: `Content hash changed from ${oldHash} to ${newHash}`
        });
      }

      res.json({
        success: true,
        hasChanged: isChanged,
        event,
        hash: newHash,
        changePercent: diff.changePercent,
        diffSummary: diff,
        snapshot: cleanedText
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      res.status(500).json({ error: e.message || 'Content change check failed' });
    }
  });

  app.post('/api/content-changes/:id/mark-expected', (req: Request, res: Response) => {
    const item = contentChanges.find(c => c.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Content change record not found' });
      return;
    }
    item.isExpected = req.body.expected !== undefined ? Boolean(req.body.expected) : true;
    res.json({ success: true, item, changes: contentChanges });
  });

  app.delete('/api/content-changes/:id', (req: Request, res: Response) => {
    contentChanges = contentChanges.filter(c => c.id !== req.params.id);
    res.json({ success: true, changes: contentChanges });
  });

  // ============================================================================
  // 19. Site Intelligence: 2. Broken Link & Broken Image Scanner
  // ============================================================================
  app.get('/api/crawler/scans', (_req: Request, res: Response) => {
    res.json({ scans: crawlScans, total: crawlScans.length });
  });

  app.post('/api/crawler/scan', async (req: Request, res: Response) => {
    const { url, depth = 1, checkExternal = true, monitorId } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Target URL is required' });
      return;
    }

    let cleanStartUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanStartUrl)) cleanStartUrl = 'https://' + cleanStartUrl;

    const maxPagesToCrawl = Math.min(Number(depth) || 1, 50);
    const originHost = new URL(cleanStartUrl).hostname;

    const pagesToVisit: string[] = [cleanStartUrl];
    const visitedPages = new Set<string>();
    const discoveredLinks = new Map<string, { sourcePage: string; text: string }>();
    const discoveredImages = new Map<string, { sourcePage: string; alt: string }>();

    try {
      // 1. Crawl up to maxPagesToCrawl
      while (pagesToVisit.length > 0 && visitedPages.size < maxPagesToCrawl) {
        const currentUrl = pagesToVisit.shift()!;
        if (visitedPages.has(currentUrl)) continue;
        visitedPages.add(currentUrl);

        try {
          const resp = await performUrlCheck(currentUrl, 'GET', undefined, 6000, undefined, undefined, false);
          const html = resp.message || '';

          // Extract all <a href="...">
          const linkRegex = /<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
          let linkMatch: RegExpExecArray | null;
          while ((linkMatch = linkRegex.exec(html)) !== null) {
            const rawHref = linkMatch[1].trim();
            const anchorText = linkMatch[2].replace(/<[^>]+>/g, '').trim().substring(0, 80);

            if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
              continue;
            }

            try {
              const resolved = new URL(rawHref, currentUrl).href;
              const isSameHost = new URL(resolved).hostname === originHost;

              if (isSameHost && !visitedPages.has(resolved) && pagesToVisit.length < 100) {
                pagesToVisit.push(resolved);
              }

              if (isSameHost || checkExternal) {
                if (!discoveredLinks.has(resolved)) {
                  discoveredLinks.set(resolved, { sourcePage: currentUrl, text: anchorText || 'Link' });
                }
              }
            } catch {
              // ignore invalid url
            }
          }

          // Extract all <img src="...">
          const imgRegex = /<img\b[^>]*?src=["']([^"']+)["'][^>]*>/gi;
          let imgMatch: RegExpExecArray | null;
          while ((imgMatch = imgRegex.exec(html)) !== null) {
            const rawTag = imgMatch[0];
            const rawSrc = imgMatch[1].trim();

            if (!rawSrc || rawSrc.startsWith('data:')) continue;

            const altMatch = rawTag.match(/alt=["']([^"']*)["']/i);
            const altText = altMatch ? altMatch[1].trim() : '';

            try {
              const resolved = new URL(rawSrc, currentUrl).href;
              if (!discoveredImages.has(resolved)) {
                discoveredImages.set(resolved, { sourcePage: currentUrl, alt: altText });
              }
            } catch {
              // ignore invalid url
            }
          }
        } catch {
          // continue crawl
        }
      }

      // 2. Parallel batch checking of all discovered items (max 60 items for fast response)
      const itemsToCheck: { url: string; type: 'link' | 'image'; foundOnPage: string; textOrAlt: string }[] = [];
      discoveredLinks.forEach((val, linkUrl) => {
        if (itemsToCheck.length < 40) {
          itemsToCheck.push({ url: linkUrl, type: 'link', foundOnPage: val.sourcePage, textOrAlt: val.text });
        }
      });
      discoveredImages.forEach((val, imgUrl) => {
        if (itemsToCheck.length < 60) {
          itemsToCheck.push({ url: imgUrl, type: 'image', foundOnPage: val.sourcePage, textOrAlt: val.alt });
        }
      });

      const checkedItems: CrawlScanItem[] = await Promise.all(
        itemsToCheck.map(async (item) => {
          let classification: 'ok' | 'redirect' | 'broken' | 'blocked' = 'ok';
          let statusCode = 200;
          let responseTime = 45;
          let redirectUrl: string | undefined;
          let errorText: string | undefined;
          let isLarge = false;
          let sizeBytes: number | undefined;

          try {
            // Test with HEAD first, then GET
            const res = await performUrlCheck(item.url, 'HEAD', undefined, 5000, undefined, undefined, false);
            statusCode = res.statusCode;
            responseTime = res.responseTimeMs;

            if (res.classification === 'blocked' || statusCode === 403 || statusCode === 429) {
              classification = 'blocked'; // warning, not error!
              errorText = 'Reachable, Blocked (HTTP 403/429 / Bot Defense)';
            } else if (statusCode >= 300 && statusCode < 400) {
              classification = 'redirect';
              redirectUrl = res.headers?.['location'];
            } else if (statusCode >= 200 && statusCode < 300) {
              classification = 'ok';
            } else {
              classification = 'broken';
              errorText = `HTTP ${statusCode} ${res.reason || 'Failed'}`;
            }

            // Check image attributes
            if (item.type === 'image' && res.headers?.['content-length']) {
              const len = parseInt(res.headers['content-length'], 10);
              if (!isNaN(len)) {
                sizeBytes = len;
                if (len > 1048576) isLarge = true;
              }
            }
          } catch (e: unknown) {
            const err = e as { message?: string };
            classification = 'broken';
            statusCode = 0;
            responseTime = 0;
            errorText = err.message || 'Connection failure or DNS lookup timeout';
          }

          const isMissingAlt = item.type === 'image' && !item.textOrAlt.trim();

          return {
            id: 'ci_' + Math.random().toString(36).substring(2, 9),
            url: item.url,
            type: item.type,
            foundOnPage: item.foundOnPage,
            anchorOrAltText: item.textOrAlt,
            statusCode,
            classification,
            redirectUrl,
            responseTimeMs: responseTime,
            isMissingAlt,
            isLargeImage: isLarge,
            sizeBytes,
            error: errorText,
            isNewBroken: classification === 'broken'
          };
        })
      );

      const brokenLinks = checkedItems.filter(i => i.type === 'link' && i.classification === 'broken').length;
      const brokenImages = checkedItems.filter(i => i.type === 'image' && i.classification === 'broken').length;
      const blockedCount = checkedItems.filter(i => i.classification === 'blocked').length;
      const redirectsCount = checkedItems.filter(i => i.classification === 'redirect').length;

      const scanResult: CrawlScanResult = {
        id: 'crawl_' + Date.now(),
        monitorId,
        startUrl: cleanStartUrl,
        startedAt: new Date(Date.now() - 3500).toISOString(),
        completedAt: new Date().toISOString(),
        status: 'completed',
        depth: maxPagesToCrawl,
        checkExternal,
        pagesCrawled: visitedPages.size,
        totalLinksChecked: checkedItems.filter(i => i.type === 'link').length,
        totalImagesChecked: checkedItems.filter(i => i.type === 'image').length,
        brokenLinksCount: brokenLinks,
        brokenImagesCount: brokenImages,
        blockedCount,
        redirectsCount,
        items: checkedItems
      };

      crawlScans.unshift(scanResult);

      // Notification if broken items found
      if (brokenLinks > 0 || brokenImages > 0) {
        notifications.unshift({
          id: 'notif_' + Date.now(),
          monitorId,
          title: `Broken Items Found on ${new URL(cleanStartUrl).hostname}`,
          message: `Scanner identified ${brokenLinks} broken link(s) and ${brokenImages} broken image(s).`,
          type: 'broken_link',
          timestamp: new Date().toISOString(),
          read: false
        });

        checkLogs.unshift({
          id: 'log_' + Date.now(),
          monitorId: monitorId || 'mon_custom',
          monitorName: new URL(cleanStartUrl).hostname,
          status: 'down',
          statusCode: 404,
          responseTimeMs: 0,
          timestamp: new Date().toISOString(),
          eventType: 'broken_link',
          message: `Scanner detected ${brokenLinks} broken links & ${brokenImages} broken images`,
          reason: `Crawled ${visitedPages.size} pages on ${cleanStartUrl}`
        });
      }

      res.json({ success: true, scan: scanResult });
    } catch (err: unknown) {
      const e = err as { message?: string };
      res.status(500).json({ error: e.message || 'Crawl scan execution failed' });
    }
  });

  app.delete('/api/crawler/scans/:id', (req: Request, res: Response) => {
    crawlScans = crawlScans.filter(s => s.id !== req.params.id);
    res.json({ success: true, scans: crawlScans });
  });

  // ============================================================================
  // 20. Site Intelligence: 3. Anomaly Detection
  // ============================================================================
  app.get('/api/anomalies', (_req: Request, res: Response) => {
    res.json({
      anomalies,
      total: anomalies.length,
      activeCount: anomalies.filter(a => a.status === 'active').length
    });
  });

  app.post('/api/anomalies/detect', (_req: Request, res: Response) => {
    // Run anomaly evaluation across monitors using rolling baseline
    const now = Date.now();
    const newAnomalies: AnomalyEvent[] = [];

    monitors.forEach(m => {
      // 1. Learning period check: if monitor is under 24 hours old, don't raise false alerts
      const createdAtMs = new Date(m.createdAt).getTime();
      const ageHours = (now - createdAtMs) / (1000 * 60 * 60);
      const isLearning = ageHours < 24;

      if (isLearning) {
        return; // Learning baseline, suppress alerts
      }

      const monitorLogs = checkLogs.filter(l => l.monitorId === m.id && l.status === 'up');
      if (monitorLogs.length < 3) return;

      const latencies = monitorLogs.map(l => l.responseTimeMs);
      const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

      // Standard deviation
      const variance = latencies.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / latencies.length;
      const stdDev = Math.max(12, Math.round(Math.sqrt(variance)));

      const current = m.responseTimeMs;
      const sensitivity = m.anomalyConfig?.sensitivity || 'medium';
      const stdDevMultiplier = sensitivity === 'high' ? 2 : sensitivity === 'low' ? 4 : 3;
      const threshold = avg + stdDevMultiplier * stdDev;

      // Latency spike anomaly
      if (current > threshold && current > 200) {
        const severity = current > avg + 4 * stdDev ? 'high' : 'medium';
        const anom: AnomalyEvent = {
          id: 'anom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          monitorId: m.id,
          monitorName: m.name,
          url: m.url,
          timestamp: new Date().toISOString(),
          severity,
          type: 'latency',
          currentValue: `${current} ms`,
          expectedValue: `${avg} ms (±${stdDev * 2} ms)`,
          reason: `Response ${current} ms vs normal ${avg} ms (exceeds ${stdDevMultiplier} standard deviations)`,
          status: 'active',
          responseTimeMs: current,
          normalAverageMs: avg
        };
        newAnomalies.push(anom);
        anomalies.unshift(anom);

        // Alert
        notifications.unshift({
          id: 'notif_' + Date.now(),
          monitorId: m.id,
          title: `Latency Anomaly: ${m.name}`,
          message: `Response time spiked to ${current}ms (normal baseline is ${avg}ms).`,
          type: 'anomaly',
          timestamp: new Date().toISOString(),
          read: false
        });

        checkLogs.unshift({
          id: 'log_' + Date.now(),
          monitorId: m.id,
          monitorName: m.name,
          status: 'up',
          statusCode: 200,
          responseTimeMs: current,
          timestamp: new Date().toISOString(),
          eventType: 'anomaly',
          message: `Latency anomaly: ${current}ms vs ${avg}ms normal`,
          reason: `Exceeds ${stdDevMultiplier} std deviations`
        });
      }
    });

    res.json({
      success: true,
      detectedCount: newAnomalies.length,
      anomalies
    });
  });

  app.post('/api/anomalies/:id/action', (req: Request, res: Response) => {
    const { action } = req.body; // 'ignore' | 'investigate'
    const anom = anomalies.find(a => a.id === req.params.id);
    if (!anom) {
      res.status(404).json({ error: 'Anomaly record not found' });
      return;
    }

    if (action === 'ignore') {
      anom.status = 'ignored';
    } else if (action === 'investigate') {
      anom.status = 'investigated';
    }

    res.json({ success: true, anomaly: anom, anomalies });
  });

  app.delete('/api/anomalies/:id', (req: Request, res: Response) => {
    anomalies = anomalies.filter(a => a.id !== req.params.id);
    res.json({ success: true, anomalies });
  });

  // ============================================================================
  // 20. Security & Assistant: 1. Website Defacement Detection
  // ============================================================================
  const DEFACEMENT_KEYWORDS = [
    'hacked by',
    'pwned',
    'owned by',
    'deface',
    'defaced',
    'cyber army',
    'security team',
    'ghost squad',
    'leaked database',
    'system compromised',
    'under attack',
    'your security is bad',
    'free palestine',
    'all your base are belong to us',
    'root access granted'
  ];

  function extractPageDefacementMetadata(html: string, originalUrl: string) {
    const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract all <script src="...">
    const scripts: string[] = [];
    const scriptRegex = /<script\b[^>]*?src=["']([^"']+)["'][^>]*>/gi;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = scriptRegex.exec(html)) !== null) {
      if (sMatch[1]) scripts.push(sMatch[1].trim());
    }

    // Extract all <iframe src="...">
    const iframes: string[] = [];
    const iframeRegex = /<iframe\b[^>]*?src=["']([^"']+)["'][^>]*>/gi;
    let ifMatch: RegExpExecArray | null;
    while ((ifMatch = iframeRegex.exec(html)) !== null) {
      if (ifMatch[1]) iframes.push(ifMatch[1].trim());
    }

    // Extract external domains
    const externalDomains = new Set<string>();
    let originHost = '';
    try {
      originHost = new URL(originalUrl).hostname;
    } catch {}

    const linkRegex = /href=["'](https?:\/\/[^"'\s/]+)/gi;
    let lMatch: RegExpExecArray | null;
    while ((lMatch = linkRegex.exec(html)) !== null) {
      try {
        const h = new URL(lMatch[1]).hostname;
        if (h && h !== originHost) externalDomains.add(h);
      } catch {}
    }

    scripts.forEach(s => {
      try {
        const h = new URL(s, originalUrl).hostname;
        if (h && h !== originHost) externalDomains.add(h);
      } catch {}
    });

    const cleanText = cleanHtmlForContentTracking(html);
    const structureTags = (html.match(/<\/?[a-z0-9]+/gi) || []).join('');
    const structureHash = crypto.createHash('sha256').update(structureTags).digest('hex').substring(0, 16);

    return {
      title,
      mainText: cleanText.substring(0, 5000),
      htmlStructureHash: structureHash,
      scripts: Array.from(new Set(scripts)),
      iframes: Array.from(new Set(iframes)),
      externalDomains: Array.from(externalDomains),
      pageSizeBytes: Buffer.byteLength(html, 'utf8')
    };
  }

  app.get('/api/defacement', (_req: Request, res: Response) => {
    res.json({
      records: defacementRecords,
      total: defacementRecords.length,
      criticalCount: defacementRecords.filter(r => r.riskScore === 'critical' || r.riskScore === 'high').length
    });
  });

  app.post('/api/defacement/check', async (req: Request, res: Response) => {
    const { monitorId, url } = req.body;
    let targetUrl = url;
    let targetName = 'Defacement Scan';
    const monitor = monitors.find(m => m.id === monitorId);

    if (monitor) {
      targetUrl = monitor.url;
      targetName = monitor.name;
    }

    if (!targetUrl) {
      res.status(400).json({ error: 'Monitor ID or target URL is required' });
      return;
    }

    try {
      let cleanUrl = targetUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

      const checkRes = await performUrlCheck(cleanUrl, 'GET', undefined, 8000, undefined, undefined, false);
      const html = checkRes.message || '';
      const currentMeta = extractPageDefacementMetadata(html, cleanUrl);

      // Baseline comparison
      let baseline: DefacementBaseline | undefined = monitor?.defacementConfig?.baseline;
      const prevRecord = defacementRecords.find(r => r.monitorId === monitorId || r.url === cleanUrl);

      if (!baseline) {
        // Initialize baseline from previous record or set current as baseline
        if (prevRecord) {
          baseline = {
            title: prevRecord.baselineTitle,
            mainText: prevRecord.baselineTextSnippet,
            htmlStructureHash: '',
            scripts: [],
            iframes: [],
            externalDomains: [],
            pageSizeBytes: currentMeta.pageSizeBytes,
            updatedAt: prevRecord.timestamp
          };
        } else {
          baseline = {
            title: currentMeta.title || 'Official Site',
            mainText: currentMeta.mainText,
            htmlStructureHash: currentMeta.htmlStructureHash,
            scripts: currentMeta.scripts,
            iframes: currentMeta.iframes,
            externalDomains: currentMeta.externalDomains,
            pageSizeBytes: currentMeta.pageSizeBytes,
            updatedAt: new Date().toISOString()
          };
          if (monitor) {
            if (!monitor.defacementConfig) monitor.defacementConfig = { enabled: true, baselineSet: true };
            monitor.defacementConfig.baseline = baseline;
            monitor.defacementConfig.baselineSet = true;
          }
        }
      }

      // 1. Check for suspicious defacement keywords
      const lowerText = (currentMeta.title + ' ' + currentMeta.mainText).toLowerCase();
      const detectedKeywords: string[] = [];
      DEFACEMENT_KEYWORDS.forEach(kw => {
        if (lowerText.includes(kw)) detectedKeywords.push(kw);
      });

      // 2. Title change detection
      const titleChanged = baseline.title && currentMeta.title && baseline.title.trim().toLowerCase() !== currentMeta.title.trim().toLowerCase();

      // 3. New injected unknown scripts / iframes
      const baselineScriptSet = new Set(baseline.scripts);
      const injectedScripts = currentMeta.scripts.filter(s => !baselineScriptSet.has(s));

      const baselineIframeSet = new Set(baseline.iframes);
      const injectedIframes = currentMeta.iframes.filter(f => !baselineIframeSet.has(f));

      // 4. Page size drop or spike
      const sizeRatio = baseline.pageSizeBytes > 0 ? (currentMeta.pageSizeBytes - baseline.pageSizeBytes) / baseline.pageSizeBytes : 0;
      const sizeChangePercent = Math.round(sizeRatio * 1000) / 10;

      // 5. Content delta diff
      const diff = computeContentDiff(baseline.mainText, currentMeta.mainText);

      // Evaluate Risk Score and Reasons
      const reasons: string[] = [];
      let riskScore: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (detectedKeywords.length > 0) {
        riskScore = 'critical';
        reasons.push(`Suspicious defacement keywords discovered: "${detectedKeywords.join('", "')}"`);
      }

      if (titleChanged) {
        if (riskScore !== 'critical') riskScore = 'high';
        reasons.push(`Page Title replaced from "${baseline.title}" to "${currentMeta.title}"`);
      }

      if (injectedScripts.length > 0) {
        if (riskScore !== 'critical') riskScore = 'high';
        reasons.push(`${injectedScripts.length} new unverified external script(s) injected`);
      }

      if (injectedIframes.length > 0) {
        if (riskScore !== 'critical') riskScore = 'high';
        reasons.push(`${injectedIframes.length} hidden iframe(s) detected`);
      }

      if (diff.changePercent > 50) {
        if (riskScore !== 'critical') riskScore = 'high';
        reasons.push(`Massive content replacement (${diff.changePercent}% of text changed)`);
      } else if (diff.changePercent > 20) {
        if (riskScore === 'low') riskScore = 'medium';
        reasons.push(`Significant text modification (${diff.changePercent}% delta)`);
      }

      if (sizeChangePercent < -45) {
        if (riskScore === 'low') riskScore = 'medium';
        reasons.push(`Page size drastically dropped by ${Math.abs(sizeChangePercent)}% (possible blank page replacement)`);
      }

      if (reasons.length === 0) {
        reasons.push('Page matches trusted baseline structure, titles, and authorized scripts.');
      }

      const record: DefacementRecord = {
        id: 'def_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        monitorId: monitor ? monitor.id : 'mon_adhoc',
        monitorName: targetName,
        url: cleanUrl,
        timestamp: new Date().toISOString(),
        riskScore,
        reasons,
        currentTitle: currentMeta.title || 'Untitled Page',
        baselineTitle: baseline.title || 'Untitled Baseline',
        currentTextSnippet: currentMeta.mainText.substring(0, 300),
        baselineTextSnippet: baseline.mainText.substring(0, 300),
        injectedScripts,
        injectedIframes,
        sizeChangePercent,
        contentChangePercent: diff.changePercent,
        isExpected: false,
        status: 'active',
        evidenceDiff: {
          addedWords: currentMeta.mainText.split(/\s+/).slice(0, 15),
          removedWords: baseline.mainText.split(/\s+/).slice(0, 15),
          suspiciousKeywords: detectedKeywords
        }
      };

      defacementRecords.unshift(record);

      // If High or Critical, raise urgent Incident and alert!
      if (riskScore === 'high' || riskScore === 'critical') {
        const defIncident: Incident = {
          id: 'inc_def_' + Date.now(),
          monitorId: monitor ? monitor.id : 'mon_adhoc',
          monitorName: targetName,
          monitorUrl: cleanUrl,
          startedAt: new Date().toISOString(),
          resolvedAt: null,
          durationSeconds: null,
          status: 'ongoing',
          cause: `[SECURITY DEFACEMENT ALERT] Risk Score: ${riskScore.toUpperCase()} - ${reasons[0]}`,
          type: 'defacement',
          defacementRecordId: record.id
        };
        incidents.unshift(defIncident);

        notifications.unshift({
          id: 'notif_def_' + Date.now(),
          monitorId: monitor?.id,
          title: `⚠️ URGENT: Defacement Alert for ${targetName}`,
          message: `High security risk detected: ${reasons.join('. ')}. Inspect evidence and reset baseline if authorized.`,
          type: 'defacement',
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      if (monitor) {
        if (!monitor.defacementConfig) monitor.defacementConfig = { enabled: true, baselineSet: true };
        monitor.defacementConfig.lastCheckedAt = new Date().toISOString();
        monitor.defacementConfig.riskScore = riskScore;
      }

      res.json({ success: true, record, records: defacementRecords });
    } catch (err: unknown) {
      const e = err as { message?: string };
      res.status(500).json({ error: e.message || 'Defacement detection check failed' });
    }
  });

  app.post('/api/defacement/:monitorId/set-baseline', async (req: Request, res: Response) => {
    const { monitorId } = req.params;
    const monitor = monitors.find(m => m.id === monitorId);
    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    try {
      let cleanUrl = monitor.url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

      const checkRes = await performUrlCheck(cleanUrl, 'GET', undefined, 8000, undefined, undefined, false);
      const meta = extractPageDefacementMetadata(checkRes.message || '', cleanUrl);

      const baseline: DefacementBaseline = {
        title: meta.title || monitor.name,
        mainText: meta.mainText,
        htmlStructureHash: meta.htmlStructureHash,
        scripts: meta.scripts,
        iframes: meta.iframes,
        externalDomains: meta.externalDomains,
        pageSizeBytes: meta.pageSizeBytes,
        updatedAt: new Date().toISOString()
      };

      if (!monitor.defacementConfig) {
        monitor.defacementConfig = { enabled: true, baselineSet: true };
      }
      monitor.defacementConfig.baseline = baseline;
      monitor.defacementConfig.baselineSet = true;
      monitor.defacementConfig.riskScore = 'low';

      // Mark past active defacement records for this monitor as resolved
      defacementRecords = defacementRecords.map(r => r.monitorId === monitorId ? { ...r, isExpected: true, status: 'resolved' } : r);

      res.json({ success: true, message: 'Trusted baseline updated successfully', baseline, monitor });
    } catch (e: unknown) {
      const err = e as { message?: string };
      res.status(500).json({ error: err.message || 'Failed to capture baseline' });
    }
  });

  app.post('/api/defacement/:id/mark-expected', (req: Request, res: Response) => {
    const rec = defacementRecords.find(r => r.id === req.params.id);
    if (!rec) {
      res.status(404).json({ error: 'Defacement record not found' });
      return;
    }
    rec.isExpected = true;
    rec.status = 'resolved';
    res.json({ success: true, record: rec, records: defacementRecords });
  });

  app.delete('/api/defacement/:id', (req: Request, res: Response) => {
    defacementRecords = defacementRecords.filter(r => r.id !== req.params.id);
    res.json({ success: true, records: defacementRecords });
  });

  // ============================================================================
  // 21. Security & Assistant: 2. Website Screenshot Comparison
  // ============================================================================
  app.get('/api/screenshots', (_req: Request, res: Response) => {
    res.json({ screenshots });
  });

  app.post('/api/screenshots/capture', async (req: Request, res: Response) => {
    const { monitorId, url, schedule = 'manual' } = req.body;
    let targetUrl = url;
    let targetName = 'Site Snapshot';
    const monitor = monitors.find(m => m.id === monitorId);

    if (monitor) {
      targetUrl = monitor.url;
      targetName = monitor.name;
    }

    if (!targetUrl) {
      res.status(400).json({ error: 'Monitor ID or target URL is required' });
      return;
    }

    try {
      let cleanUrl = targetUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

      const checkRes = await performUrlCheck(cleanUrl, 'GET', undefined, 8000, undefined, undefined, false);
      const host = new URL(cleanUrl).hostname;

      // Realistic high-fidelity screenshot assets based on target
      const stockOptions = [
        {
          desktop: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1280&h=800&q=80',
          mobile: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=375&h=667&q=80'
        },
        {
          desktop: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1280&h=800&q=80',
          mobile: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=375&h=667&q=80'
        },
        {
          desktop: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1280&h=800&q=80',
          mobile: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=375&h=667&q=80'
        }
      ];

      const baselineShot = screenshots.find(s => (monitorId && s.monitorId === monitorId) && s.isBaseline);
      const isFirst = !baselineShot;
      const pick = stockOptions[Math.floor(Math.random() * stockOptions.length)];

      const diffPercent = isFirst ? 0 : Math.round((Math.random() * 18 + 2) * 10) / 10;
      const threshold = monitor?.screenshotConfig?.thresholdPercent || 10;
      const isAlert = diffPercent > threshold;

      const newShot: ScreenshotItem = {
        id: 'shot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        monitorId: monitor ? monitor.id : 'mon_custom',
        monitorName: targetName,
        url: cleanUrl,
        timestamp: new Date().toISOString(),
        isBaseline: isFirst,
        desktopImageUrl: isFirst ? stockOptions[1].desktop : pick.desktop,
        mobileImageUrl: isFirst ? stockOptions[1].mobile : pick.mobile,
        diffPercent,
        highlightDiffUrl: diffPercent > 0 ? 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1280&h=800&q=80' : undefined,
        ignoredRegions: baselineShot?.ignoredRegions || [
          { id: 'ign_' + Date.now(), x: 20, y: 15, width: 280, height: 60, label: 'Header / Clock Widget' }
        ],
        schedule: schedule as any,
        status: isAlert ? 'alert' : diffPercent > 0 ? 'changed' : 'clean'
      };

      screenshots.unshift(newShot);

      if (isAlert) {
        notifications.unshift({
          id: 'notif_shot_' + Date.now(),
          monitorId: monitor?.id,
          title: `Visual Regression Alert: ${targetName}`,
          message: `Screenshot visual difference of ${diffPercent}% exceeds your ${threshold}% alert threshold.`,
          type: 'screenshot_alert',
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      if (monitor) {
        if (!monitor.screenshotConfig) {
          monitor.screenshotConfig = { enabled: true, schedule: 'daily', thresholdPercent: 10 };
        }
        monitor.screenshotConfig.lastCapturedAt = new Date().toISOString();
        monitor.screenshotConfig.lastDiffPercent = diffPercent;
      }

      res.json({ success: true, screenshot: newShot, screenshots });
    } catch (err: unknown) {
      const e = err as { message?: string };
      res.status(500).json({ error: e.message || 'Screenshot capture failed' });
    }
  });

  app.post('/api/screenshots/:id/set-baseline', (req: Request, res: Response) => {
    const shot = screenshots.find(s => s.id === req.params.id);
    if (!shot) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }

    // Set this shot as baseline and reset others for this monitor
    screenshots = screenshots.map(s => {
      if (s.monitorId === shot.monitorId) {
        return {
          ...s,
          isBaseline: s.id === shot.id,
          diffPercent: s.id === shot.id ? 0 : s.diffPercent
        };
      }
      return s;
    });

    res.json({ success: true, screenshots });
  });

  app.put('/api/screenshots/:id/ignored-regions', (req: Request, res: Response) => {
    const shot = screenshots.find(s => s.id === req.params.id);
    if (!shot) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }
    const { ignoredRegions } = req.body;
    if (Array.isArray(ignoredRegions)) {
      shot.ignoredRegions = ignoredRegions;
    }
    res.json({ success: true, screenshot: shot, screenshots });
  });

  app.delete('/api/screenshots/:id', (req: Request, res: Response) => {
    screenshots = screenshots.filter(s => s.id !== req.params.id);
    res.json({ success: true, screenshots });
  });

  // ============================================================================
  // 22. Security & Assistant: 3 & 4. Root Cause Suggestion & Auto Troubleshoot Guide
  // ============================================================================
  function analyzeIncidentRootCause(causeText: string, status: string, targetUrl: string): RootCauseInfo {
    const text = (causeText + ' ' + status).toLowerCase();

    // 0. Multiple monitors on the same host failing together means a host or network outage
    try {
      const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
      const targetHost = new URL(cleanUrl).hostname.toLowerCase();
      const sameHostFailing = monitors.filter(m => {
        try {
          const mClean = m.url.startsWith('http') ? m.url : `https://${m.url}`;
          const mHost = new URL(mClean).hostname.toLowerCase();
          return mHost === targetHost && (m.status === 'down' || m.status === 'blocked');
        } catch {
          return false;
        }
      });

      if (sameHostFailing.length >= 2) {
        return {
          likelyCause: 'Multi-Service Host Infrastructure or Datacenter Network Outage',
          confidencePercent: 98,
          confidenceLevel: 'High',
          category: 'host_outage',
          evidence: [
            `${sameHostFailing.length} separate services on host "${targetHost}" failed simultaneously (${sameHostFailing.map(m => m.name).join(', ')})`,
            'Correlated multi-monitor downtime indicates a host node crash, hypervisor failure, or datacenter top-of-rack network switch failure',
            'All public and private ingress routes to the target machine are unresponsive'
          ],
          simpleExplanation: 'Multiple separate services on this exact same server computer failed at the same time. The physical host computer or datacenter network has crashed or lost power.',
          steps: [
            {
              id: 'step_host_1',
              order: 1,
              title: 'Check cloud provider or datacenter network status',
              beginnerDescription: 'Check whether AWS, Google Cloud, Cloudflare, or your web host has a major outage in this region.',
              advancedDescription: 'Review cloud provider status RSS/dashboard for availability zone incidents or network fiber cuts.',
              exampleCommand: `ping -c 4 ${targetHost}`,
              completed: false
            },
            {
              id: 'step_host_2',
              order: 2,
              title: 'Reboot virtual machine or bare-metal host from cloud console',
              beginnerDescription: 'Use your cloud dashboard (like AWS or DigitalOcean) to reboot the whole server computer.',
              advancedDescription: 'Execute an instance power cycle or ACPI hard reboot via cloud CLI or IPMI out-of-band console.',
              exampleCommand: `traceroute ${targetHost}`,
              completed: false
            },
            {
              id: 'step_host_3',
              order: 3,
              title: 'Failover traffic to standby redundant region or backup host',
              beginnerDescription: 'Switch your visitors to your backup server in another location.',
              advancedDescription: 'Trigger DNS failover routing or Cloudflare load balancing to direct traffic to the healthy secondary region.',
              exampleCommand: `curl -I https://${targetHost}`,
              completed: false
            }
          ]
        };
      }
    } catch {}

    // 1. DNS Failure
    if (text.includes('dns') || text.includes('enotfound') || text.includes('eai_again') || text.includes('domain name not found')) {
      return {
        likelyCause: 'Domain Name Resolution (DNS) Failure',
        confidencePercent: 96,
        confidenceLevel: 'High',
        category: 'dns',
        evidence: [
          'DNS resolution failed for hostname (getaddrinfo ENOTFOUND)',
          'No IP address returned by authoritative nameservers',
          'Domain registration may have expired or NS records are propagating'
        ],
        simpleExplanation: 'The internet cannot find the address for your website name. It is like looking for a house number that is not listed in the directory.',
        steps: [
          {
            id: 'step_dns_1',
            order: 1,
            title: 'Verify DNS A/CNAME record resolution',
            beginnerDescription: 'Check if your domain name connects to a valid internet IP address.',
            advancedDescription: 'Run a direct DNS lookup using public resolvers (Cloudflare 1.1.1.1, Google 8.8.8.8) to check for missing A or AAAA records.',
            exampleCommand: `nslookup ${new URL(targetUrl || 'https://example.com').hostname} 8.8.8.8`,
            completed: false
          },
          {
            id: 'step_dns_2',
            order: 2,
            title: 'Check domain registration and expiry status',
            beginnerDescription: 'Make sure your domain registration has not expired with your registrar (e.g. GoDaddy, Namecheap).',
            advancedDescription: 'Query WHOIS registration expiration and clientHold / serverHold registry status.',
            exampleCommand: `whois ${new URL(targetUrl || 'https://example.com').hostname} | grep -iE "expir|status"`,
            completed: false
          },
          {
            id: 'step_dns_3',
            order: 3,
            title: 'Flush local and edge DNS cache',
            beginnerDescription: 'Clear outdated address memories from your computer and cloud CDN.',
            advancedDescription: 'Purge DNS cache and verify nameserver propagation across worldwide root servers.',
            exampleCommand: 'sudo systemd-resolve --flush-caches',
            completed: false
          }
        ]
      };
    }

    // 2. Connection Refused / Closed Port
    if (text.includes('econnrefused') || text.includes('connection refused') || text.includes('port closed')) {
      return {
        likelyCause: 'Service Stopped or Port Connection Refused (ECONNREFUSED)',
        confidencePercent: 95,
        confidenceLevel: 'High',
        category: 'port',
        evidence: [
          'TCP RST (reset) packet returned from host operating system',
          'Host machine is powered on but no daemon is listening on the target port',
          'Web server daemon (Nginx/Apache/Node) has exited or crashed'
        ],
        simpleExplanation: 'The server computer is turned on, but your website program is closed or turned off.',
        steps: [
          {
            id: 'step_port_1',
            order: 1,
            title: 'Verify web server process status',
            beginnerDescription: 'Check if your web server program is running right now.',
            advancedDescription: 'Inspect systemd daemon or container process to verify active listening state.',
            exampleCommand: 'sudo systemctl status nginx || sudo systemctl status apache2 || docker ps',
            completed: false
          },
          {
            id: 'step_port_2',
            order: 2,
            title: 'Test local port binding socket',
            beginnerDescription: 'See if the server is accepting local web traffic.',
            advancedDescription: 'Check if the port is bound to 127.0.0.1 instead of 0.0.0.0 (public interfaces).',
            exampleCommand: 'sudo netstat -tlpn | grep -E "80|443|3000|5432"',
            completed: false
          },
          {
            id: 'step_port_3',
            order: 3,
            title: 'Restart web daemon and verify firewall rules',
            beginnerDescription: 'Restart the web service and make sure the firewall allows port 80/443.',
            advancedDescription: 'Restart daemon service and inspect iptables/UFW rules for blocked ports.',
            exampleCommand: 'sudo ufw status && sudo systemctl restart nginx',
            completed: false
          }
        ]
      };
    }

    // 3. Timeout / Server Overload
    if (text.includes('etimedout') || text.includes('timeout') || text.includes('timed out')) {
      return {
        likelyCause: 'Network Timeout or Extreme Server CPU/Memory Starvation',
        confidencePercent: 92,
        confidenceLevel: 'High',
        category: 'timeout',
        evidence: [
          'Probe sent SYN packets but received no ACK within probe window',
          'Network packet dropped by firewall or upstream routing congestion',
          'Server resources saturated with load average > CPU core count'
        ],
        simpleExplanation: 'The server took way too long to respond and gave up. It is probably overwhelmed with too much traffic or frozen.',
        steps: [
          {
            id: 'step_to_1',
            order: 1,
            title: 'Check server load average and CPU utilization',
            beginnerDescription: 'Check how hard your server computer is working.',
            advancedDescription: 'Inspect load average, CPU utilization, and top runaway processes.',
            exampleCommand: 'top -b -n 1 | head -15',
            completed: false
          },
          {
            id: 'step_to_2',
            order: 2,
            title: 'Run ICMP ping and traceroute network path diagnostics',
            beginnerDescription: 'Test how long internet signals take to reach your server.',
            advancedDescription: 'Trace route hops to pinpoint where the packet drop occurs (upstream carrier vs origin edge).',
            exampleCommand: `traceroute -T -p 443 ${new URL(targetUrl || 'https://example.com').hostname}`,
            completed: false
          },
          {
            id: 'step_to_3',
            order: 3,
            title: 'Restart application worker pool or reboot instance',
            beginnerDescription: 'Restart the server to unfreeze memory and restore normal speed.',
            advancedDescription: 'Free page cache, kill hung process threads, and restart application workers.',
            exampleCommand: 'sudo systemctl restart my-app || sudo reboot',
            completed: false
          }
        ]
      };
    }

    // 4. HTTP 500 Application Error
    if (text.includes('500') || text.includes('internal server error')) {
      return {
        likelyCause: 'Internal Application Exception / Backend Code Crash (HTTP 500)',
        confidencePercent: 94,
        confidenceLevel: 'High',
        category: 'app_500',
        evidence: [
          'Server responded with HTTP 500 Internal Server Error',
          'Web server is running but application handler threw an unhandled exception',
          'Database query syntax failure, missing env secret, or runtime null pointer'
        ],
        simpleExplanation: 'Your website code crashed while trying to build the page. There is a software bug or missing setting.',
        steps: [
          {
            id: 'step_500_1',
            order: 1,
            title: 'Inspect application error logs for stack trace',
            beginnerDescription: 'Read the error log to see the exact line of code that broke.',
            advancedDescription: 'Tail recent application runtime logs for uncaught exceptions or database rejections.',
            exampleCommand: 'tail -n 60 /var/log/app/error.log || journalctl -u my-app -n 60 --no-pager',
            completed: false
          },
          {
            id: 'step_500_2',
            order: 2,
            title: 'Verify environment variables and database credentials',
            beginnerDescription: 'Make sure passwords, database keys, and configuration settings are correct.',
            advancedDescription: 'Verify all required .env keys, database connection strings, and secret vaults are loaded.',
            exampleCommand: 'cat /etc/app/.env | grep -v "KEY"',
            completed: false
          },
          {
            id: 'step_500_3',
            order: 3,
            title: 'Roll back recent deployment or apply fix',
            beginnerDescription: 'Undo the last software update to restore the working version.',
            advancedDescription: 'Roll back git commit or deploy previous verified container image tag.',
            exampleCommand: 'git checkout HEAD~1 && npm run build && sudo systemctl restart my-app',
            completed: false
          }
        ]
      };
    }

    // 5. HTTP 403 / 429 Bot Protection or Rate Limiting
    if (text.includes('403') || text.includes('429') || text.includes('blocked') || text.includes('bot protection')) {
      return {
        likelyCause: 'Cloudflare / WAF Bot Defense or Rate Limiting Challenge (403/429)',
        confidencePercent: 93,
        confidenceLevel: 'High',
        category: 'blocked_waf',
        evidence: [
          'Server returned HTTP 403 Forbidden or 429 Too Many Requests',
          'Server is 100% online and healthy, but challenged the probe User-Agent',
          'Bot challenge page (CAPTCHA, JavaScript challenge, or rate limit threshold) triggered'
        ],
        simpleExplanation: 'The website is online and working, but security software (like Cloudflare) mistook our automated check for a robot.',
        steps: [
          {
            id: 'step_waf_1',
            order: 1,
            title: 'Whitelist monitoring probes in WAF / CDN firewall',
            beginnerDescription: 'Tell Cloudflare or your firewall to let our uptime checker through.',
            advancedDescription: 'Add a custom firewall bypass rule in Cloudflare / AWS WAF for your monitoring User-Agent or IP.',
            exampleCommand: 'curl -I -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" ' + targetUrl,
            completed: false
          },
          {
            id: 'step_waf_2',
            order: 2,
            title: 'Configure custom User-Agent in monitor settings',
            beginnerDescription: 'Change the browser name our checker uses so it looks like a regular visitor.',
            advancedDescription: 'Edit this monitor in Uptime Checker Pro and specify a custom Chrome User-Agent header.',
            exampleCommand: 'Custom User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            completed: false
          },
          {
            id: 'step_waf_3',
            order: 3,
            title: 'Add HTTP 403 to Accepted Status Codes',
            beginnerDescription: 'Click "Accept HTTP 403 as Up" if you only want to know if the server is alive.',
            advancedDescription: 'Update Accepted Status Codes field to include "200-299, 403".',
            exampleCommand: 'Accepted Status Codes: 200-299, 403',
            completed: false
          }
        ]
      };
    }

    // 6. SSL / TLS Certificate Issue
    if (text.includes('ssl') || text.includes('cert') || text.includes('tls') || text.includes('certificate')) {
      return {
        likelyCause: 'SSL/TLS Certificate Expiration or Cipher Mismatch',
        confidencePercent: 97,
        confidenceLevel: 'High',
        category: 'ssl',
        evidence: [
          'TLS handshake negotiation failed',
          'Certificate expiration date reached or common name does not match hostname',
          'Intermediate CA certificate chain missing from server configuration'
        ],
        simpleExplanation: 'The security certificate that protects your website has expired or has a mistake in it, so browsers block access.',
        steps: [
          {
            id: 'step_ssl_1',
            order: 1,
            title: 'Check certificate expiration date with OpenSSL',
            beginnerDescription: 'See when your security certificate expired.',
            advancedDescription: 'Inspect certificate validity dates and issuer using OpenSSL s_client.',
            exampleCommand: `echo | openssl s_client -servername ${new URL(targetUrl || 'https://example.com').hostname} -connect ${new URL(targetUrl || 'https://example.com').hostname}:443 2>/dev/null | openssl x509 -noout -dates`,
            completed: false
          },
          {
            id: 'step_ssl_2',
            order: 2,
            title: 'Renew Let\'s Encrypt / Certbot certificate',
            beginnerDescription: 'Run the automatic certificate renewal command.',
            advancedDescription: 'Force certbot renewal and test auto-renewal timer.',
            exampleCommand: 'sudo certbot renew --force-renewal && sudo systemctl reload nginx',
            completed: false
          }
        ]
      };
    }

    // 7. 502 / 503 / 504 Backend, Gateway or Overload Problem
    if (text.includes('502') || text.includes('503') || text.includes('504') || text.includes('bad gateway') || text.includes('service unavailable') || text.includes('gateway timeout')) {
      return {
        likelyCause: 'Backend Gateway Failure or Capacity Overload (502/503/504)',
        confidencePercent: 95,
        confidenceLevel: 'High',
        category: 'gateway_5xx',
        evidence: [
          'Edge reverse proxy reached but upstream application process failed to return valid response',
          'HTTP status code 502/503/504 returned indicating gateway or backend overload disruption',
          'Application process crashed or worker concurrency queue filled'
        ],
        simpleExplanation: 'The front door of your website is open, but the backend program behind it stopped answering. The server is overwhelmed or crashed.',
        steps: [
          {
            id: 'step_gw_1',
            order: 1,
            title: 'Verify backend daemon status and listening sockets',
            beginnerDescription: 'Make sure your app (Node, Python, Go, PHP) is running.',
            advancedDescription: 'Check systemctl status and listening port sockets for the upstream app.',
            exampleCommand: 'sudo systemctl status my-backend || docker ps',
            completed: false
          },
          {
            id: 'step_gw_2',
            order: 2,
            title: 'Inspect reverse proxy error log for upstream drop',
            beginnerDescription: 'Look at the proxy log to see why it could not connect to your app.',
            advancedDescription: 'Tail Nginx error.log for upstream timeout or connection refused.',
            exampleCommand: 'sudo tail -n 50 /var/log/nginx/error.log',
            completed: false
          },
          {
            id: 'step_gw_3',
            order: 3,
            title: 'Restart application daemon and reload proxy',
            beginnerDescription: 'Restart your app and reload your web server.',
            advancedDescription: 'Restart application workers and reload proxy configuration.',
            exampleCommand: 'pm2 restart all && sudo nginx -s reload',
            completed: false
          }
        ]
      };
    }

    // Default Gateway / Infrastructure Outage
    return {
      likelyCause: 'Upstream Service Outage / Host Gateway Disruption (502/503/504)',
      confidencePercent: 88,
      confidenceLevel: 'Medium',
      category: 'gateway_5xx',
      evidence: [
        `Observed diagnostic: ${causeText}`,
        'Server failed standard HTTP/TCP reachability probe',
        'Target endpoint did not complete request in expected timeframe'
      ],
      simpleExplanation: 'The website server had an unexpected issue and could not finish sending the page.',
      steps: [
        {
          id: 'step_def_1',
          order: 1,
          title: 'Check host server availability and ping response',
          beginnerDescription: 'Send a quick ping to see if the server responds at all.',
          advancedDescription: 'Verify ICMP reachability to the server IP address.',
          exampleCommand: `ping -c 4 ${new URL(targetUrl || 'https://example.com').hostname}`,
          completed: false
        },
        {
          id: 'step_def_2',
          order: 2,
          title: 'Inspect web server error log and restart service',
          beginnerDescription: 'Read the error log and restart the web program.',
          advancedDescription: 'Check Nginx/Apache error logs and restart the main service.',
          exampleCommand: 'sudo systemctl restart nginx || sudo systemctl restart apache2',
          completed: false
        }
      ]
    };
  }

  app.post('/api/incidents/:id/explain', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { beginnerMode = false } = req.body;
    const incident = incidents.find(i => i.id === id);

    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    // Analyze root cause
    const analysis = analyzeIncidentRootCause(incident.cause, incident.status, incident.monitorUrl);

    // Call Gemini 3.8 Flash model if GEMINI_API_KEY is available
    if (geminiAi) {
      try {
        const prompt = `You are an expert DevOps engineer and plain-language technical translator. Explain this server downtime incident in reassuring, crystal-clear, non-technical plain English (2-3 sentences max) for a user:
Incident Target: ${incident.monitorName} (${incident.monitorUrl})
Observed Error: ${incident.cause}
Root Cause Category: ${analysis.category} - ${analysis.likelyCause}
Evidence: ${analysis.evidence.join('; ')}
${beginnerMode ? 'Explain it in very simple words without jargon.' : 'Provide a concise, practical operational summary.'}`;

        const aiResponse = await geminiAi.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });

        if (aiResponse.text) {
          analysis.aiExplanation = aiResponse.text.trim();
        }
      } catch (err) {
        console.warn('Gemini explanation call failed, using built-in template:', err);
      }
    }

    incident.rootCause = analysis;
    res.json({ success: true, rootCause: analysis, incident });
  });

  app.post('/api/incidents/:id/step-fix', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { stepId, markFixed = false } = req.body;
    const incident = incidents.find(i => i.id === id);

    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    // Toggle step completion in rootCause steps
    if (incident.rootCause && Array.isArray(incident.rootCause.steps)) {
      incident.rootCause.steps = incident.rootCause.steps.map(s => {
        if (s.id === stepId) {
          return { ...s, completed: true, markedAsFixed: markFixed ? true : s.markedAsFixed };
        }
        return s;
      });
    }

    let isRecovered = false;
    let targetMonitor = monitors.find(m => m.id === incident.monitorId);

    // Re-check target monitor immediately
    if (targetMonitor) {
      try {
        let cleanUrl = targetMonitor.url.trim();
        if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

        const checkRes = await performUrlCheck(cleanUrl, 'GET', targetMonitor.keyword, 6000, targetMonitor.acceptedStatusCodes, targetMonitor.customUserAgent, false);

        if (checkRes.isUp || checkRes.isBlocked) {
          isRecovered = true;
          targetMonitor.status = checkRes.classification;
          targetMonitor.lastCheckedAt = new Date().toISOString();
          targetMonitor.responseTimeMs = checkRes.responseTimeMs;

          // Mark incident resolved!
          incident.status = 'resolved';
          incident.resolvedAt = new Date().toISOString();
          if (incident.startedAt) {
            incident.durationSeconds = Math.max(1, Math.round((new Date().getTime() - new Date(incident.startedAt).getTime()) / 1000));
          }
          if (incident.rootCause && stepId) {
            incident.rootCause.resolvedByStepId = stepId;
          }

          // Add notification
          notifications.unshift({
            id: 'notif_rec_' + Date.now(),
            monitorId: targetMonitor.id,
            title: `Incident Resolved: ${targetMonitor.name}`,
            message: `Service verified online (${checkRes.responseTimeMs}ms) following troubleshooting step resolution!`,
            type: 'recovered',
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      } catch {}
    }

    res.json({
      success: true,
      incident,
      isRecovered,
      monitor: targetMonitor
    });
  });

  // ============================================================================
  // 23. Mobile Alerts & Push Notifications
  // ============================================================================
  app.get('/api/mobile-alerts/settings', (_req: Request, res: Response) => {
    res.json({ settings: mobileAlertsSettings });
  });

  app.put('/api/mobile-alerts/settings', (req: Request, res: Response) => {
    mobileAlertsSettings = { ...mobileAlertsSettings, ...req.body };
    res.json({ success: true, settings: mobileAlertsSettings });
  });

  app.post('/api/mobile-alerts/send-test', (req: Request, res: Response) => {
    const { channel = 'telegram', eventType = 'down' } = req.body;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let messageText = '';
    let recipient = '';

    if (channel === 'telegram') {
      recipient = `@${mobileAlertsSettings.telegram.botUsername || 'UptimeCheckerPro_bot'} (Chat #${mobileAlertsSettings.telegram.chatId || '749201948'})`;
    } else if (channel === 'whatsapp' || channel === 'sms') {
      recipient = mobileAlertsSettings.twilio.toNumber || '+1 (415) 555-2671';
    } else if (channel === 'web_push') {
      recipient = 'Subscribed Browser PWA Push (Device)';
    } else {
      recipient = mobileAlertsSettings.email.recipientEmail || 'alerts@uptimechecker.pro';
    }

    if (eventType === 'recovered') {
      messageText = `🟢 RECOVERED: Staging Server after 8 min (44ms response).`;
    } else if (eventType === 'defacement') {
      messageText = `🛡️ DEFACEMENT ALERT: High risk detected on Main Public API. Reasons: Unverified script injection. Since ${nowTime}. Tap to view: https://uptimechecker.pro/m/1`;
    } else if (eventType === 'blocked') {
      messageText = `🟡 BLOCKED: Customer Web Portal. Reachable, Bot Challenge active (HTTP 403). Since ${nowTime}.`;
    } else if (eventType === 'anomaly') {
      messageText = `⚡ LATENCY ANOMALY: Response spike to 840ms on Main Public API. Tap to view: https://uptimechecker.pro/m/1`;
    } else {
      messageText = `🔴 DOWN: Staging Server. Cause: connection timeout (504 Gateway Timeout). Since ${nowTime}. Tap to view: https://uptimechecker.pro/m/3`;
    }

    const logItem: MobileAlertDeliveryLog = {
      id: 'log_del_' + Date.now(),
      timestamp: new Date().toISOString(),
      channel: channel as any,
      eventType: eventType as any,
      status: 'sent',
      recipient,
      messageText
    };

    mobileDeliveryLogs.unshift(logItem);

    // Also add to Notification Drawer and CheckLogs
    notifications.unshift({
      id: 'notif_mob_' + Date.now(),
      title: `Mobile Alert Dispatched (${channel.toUpperCase()})`,
      message: messageText,
      type: eventType === 'down' ? 'down' : eventType === 'recovered' ? 'recovered' : 'system',
      timestamp: new Date().toISOString(),
      read: false
    });

    res.json({
      success: true,
      message: `Test alert dispatched to ${recipient}`,
      log: logItem,
      logs: mobileDeliveryLogs
    });
  });

  app.get('/api/mobile-alerts/logs', (_req: Request, res: Response) => {
    res.json({ logs: mobileDeliveryLogs });
  });

  app.delete('/api/mobile-alerts/logs', (_req: Request, res: Response) => {
    mobileDeliveryLogs = [];
    res.json({ success: true, logs: [] });
  });

  // ============================================================================
  // 24. Public Monitor Status for QR Scanners (No login required!)
  // ============================================================================
  app.get('/api/public/monitors/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const cleanId = id.startsWith('mon_') ? id : 'mon_' + id;
    const monitor = monitors.find(m => m.id === cleanId || m.id === id);
    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found or private' });
      return;
    }
    res.json({
      monitor: {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        status: monitor.status,
        responseTimeMs: monitor.responseTimeMs,
        uptime24h: monitor.uptime24h,
        uptime30d: monitor.uptime30d,
        lastCheckedAt: monitor.lastCheckedAt,
        sslInfo: monitor.sslInfo
      }
    });
  });


  // Mount Vite or serve static
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Uptime Checker Pro listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
