import React, { useState, useEffect } from 'react';
import { Incident, Monitor, RootCauseInfo, TroubleshootStep } from '../../types';
import { api } from '../../services/api';
import { UptimeBar90Days } from '../dashboard/UptimeBar90Days';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Activity,
  Calendar,
  Trash2,
  RotateCcw,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Terminal,
  Copy,
  BookOpen,
  Wrench,
  HelpCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface IncidentTimelineProps {
  incidents: Incident[];
  monitors: Monitor[];
  isDark: boolean;
  onUpdateIncidents?: (newIncidents: Incident[]) => void;
  onUpdateMonitor?: (updatedMonitor: Monitor) => void;
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({
  incidents,
  monitors,
  isDark,
  onUpdateIncidents,
  onUpdateMonitor
}) => {
  const [undoToast, setUndoToast] = useState<{ text: string; secondsLeft: number } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Root cause & troubleshooting states
  const [expandedIncidentIds, setExpandedIncidentIds] = useState<Record<string, boolean>>({});
  const [explainingIds, setExplainingIds] = useState<Record<string, boolean>>({});
  const [beginnerMode, setBeginnerMode] = useState<boolean>(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [fixingStepId, setFixingStepId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIncidentIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(cmd);
    setTimeout(() => setCopiedCommand(null), 2500);
  };

  const handleExplain = async (incident: Incident) => {
    setExplainingIds(prev => ({ ...prev, [incident.id]: true }));
    try {
      const rootCause = await api.explainIncident(incident.id, beginnerMode);
      if (onUpdateIncidents) {
        const updated = incidents.map(i => i.id === incident.id ? { ...i, rootCause } : i);
        onUpdateIncidents(updated);
      }
      setExpandedIncidentIds(prev => ({ ...prev, [incident.id]: true }));
    } catch {
      // ignore
    } finally {
      setExplainingIds(prev => ({ ...prev, [incident.id]: false }));
    }
  };

  const handleToggleStep = async (incident: Incident, step: TroubleshootStep) => {
    const updatedSteps = (incident.rootCause?.steps || []).map(s =>
      s.id === step.id ? { ...s, completed: !s.completed } : s
    );
    const updatedIncident: Incident = {
      ...incident,
      rootCause: incident.rootCause ? { ...incident.rootCause, steps: updatedSteps } : undefined
    };
    if (onUpdateIncidents) {
      onUpdateIncidents(incidents.map(i => i.id === incident.id ? updatedIncident : i));
    }
  };

  const handleDidThisFixIt = async (incident: Incident, step: TroubleshootStep) => {
    setFixingStepId(step.id);
    try {
      const res = await api.resolveTroubleshootStep(incident.id, step.id, true);
      if (onUpdateIncidents) {
        onUpdateIncidents(incidents.map(i => i.id === incident.id ? res.incident : i));
      }
      if (res.isRecovered && res.monitor && onUpdateMonitor) {
        onUpdateMonitor(res.monitor);
        setResetSuccessMsg(`🎉 Monitor ${res.monitor.name} verified recovered and online! Incident resolved by "${step.title}".`);
        setTimeout(() => setResetSuccessMsg(null), 6000);
      } else {
        setResetSuccessMsg(`Step "${step.title}" marked as applied. Server probe did not detect full recovery yet.`);
        setTimeout(() => setResetSuccessMsg(null), 5000);
      }
    } catch {
      // ignore
    } finally {
      setFixingStepId(null);
    }
  };

  const handleRecheckNow = async (incident: Incident) => {
    setRecheckingId(incident.id);
    try {
      // Find the first completed step or use fallback
      const activeStepId = incident.rootCause?.steps?.find(s => s.completed)?.id || 'step_manual_recheck';
      const res = await api.resolveTroubleshootStep(incident.id, activeStepId, false);
      if (onUpdateIncidents) {
        onUpdateIncidents(incidents.map(i => i.id === incident.id ? res.incident : i));
      }
      if (res.isRecovered && res.monitor && onUpdateMonitor) {
        onUpdateMonitor(res.monitor);
        setResetSuccessMsg(`🎉 Monitor ${res.monitor.name} is now ONLINE (${res.monitor.responseTimeMs}ms)! Incident marked as resolved.`);
        setTimeout(() => setResetSuccessMsg(null), 6000);
      } else {
        setResetSuccessMsg(`Re-check completed for ${incident.monitorName}. Target remains unreachable or blocked.`);
        setTimeout(() => setResetSuccessMsg(null), 5000);
      }
    } catch {
      // ignore
    } finally {
      setRecheckingId(null);
    }
  };

  const ongoingCount = incidents.filter(i => i.status === 'ongoing').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  // 10-second undo timer
  useEffect(() => {
    if (!undoToast) return;
    if (undoToast.secondsLeft <= 0) {
      setUndoToast(null);
      return;
    }
    const timer = setInterval(() => {
      setUndoToast(prev => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [undoToast?.secondsLeft]);

  const avgDurationMinutes = React.useMemo(() => {
    const resolved = incidents.filter(i => i.durationSeconds && i.durationSeconds > 0);
    if (resolved.length === 0) return 0;
    const totalSecs = resolved.reduce((acc, i) => acc + (i.durationSeconds || 0), 0);
    return Math.round(totalSecs / resolved.length / 60);
  }, [incidents]);

  const handleClearResolved = async () => {
    if (resolvedCount === 0) return;
    setClearing(true);
    try {
      const res = await api.clearResolvedIncidents();
      if (onUpdateIncidents) {
        onUpdateIncidents(res.incidents);
      }
      setUndoToast({
        text: `${res.count} resolved incidents cleared (ongoing outages preserved)`,
        secondsLeft: 10
      });
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteSingleIncident = async (id: string, name: string) => {
    try {
      const res = await api.deleteIncident(id);
      if (onUpdateIncidents) {
        onUpdateIncidents(res.incidents);
      }
      setUndoToast({
        text: `Incident for ${name} removed`,
        secondsLeft: 10
      });
    } catch {
      // ignore
    }
  };

  const handleUndo = async () => {
    try {
      const res = await api.undoIncidents();
      if (onUpdateIncidents) {
        onUpdateIncidents(res.incidents);
      }
      setUndoToast(null);
    } catch {
      // ignore
    }
  };

  const handleResetUptime = async (id: string, name: string) => {
    setResettingId(id);
    try {
      const updated = await api.resetMonitorUptime(id);
      if (onUpdateMonitor) {
        onUpdateMonitor(updated);
      }
      setResetSuccessMsg(`Reset 90-day reliability matrix to 100% for ${name}`);
      setTimeout(() => setResetSuccessMsg(null), 4000);
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 10-Second Undo Notification Toast */}
      {undoToast && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/15 p-3.5 text-xs text-amber-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>{undoToast.text}</strong>. Undo available for{' '}
              <span className="font-mono font-bold text-amber-300">{undoToast.secondsLeft}s</span>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow-xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Undo</span>
            </button>
            <button
              onClick={() => setUndoToast(null)}
              className="text-amber-400/80 hover:text-amber-200 text-xs px-1.5 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Success banner for reset */}
      {resetSuccessMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{resetSuccessMsg}</span>
          </div>
          <button onClick={() => setResetSuccessMsg(null)} className="text-emerald-400/80 hover:text-emerald-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Ongoing Incidents</span>
            <AlertTriangle className={`h-4 w-4 ${ongoingCount > 0 ? 'text-rose-500' : 'text-neutral-400'}`} />
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-bold tracking-tight ${
              ongoingCount > 0 ? 'text-rose-500' : 'text-emerald-500'
            }`}
          >
            {ongoingCount}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">
            {ongoingCount > 0 ? 'Engineers investigating' : 'All systems operating nominally'}
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Resolved Outages</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {resolvedCount}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">Logged within rolling 90 days</div>
        </div>

        <div
          className={`rounded-xl border p-4 transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Mean Time to Recovery (MTTR)</span>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {avgDurationMinutes} <span className="text-xs font-normal text-neutral-500">min</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono">Average outage duration</div>
        </div>
      </div>

      {/* 90-Day Uptime Strips Per Monitor */}
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-4 border-inherit">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">90-Day Uptime History per Monitor</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-xs bg-emerald-500" /> 99.5 - 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-xs bg-amber-400" /> 95 - 99.5%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-xs bg-rose-500" /> &lt; 95%
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-6">
          {monitors.map((m) => (
            <div key={m.id} className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                    {m.name}
                  </span>
                  <span className="font-mono text-neutral-500 text-[11px] truncate max-w-xs">
                    {m.url}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-400">
                  <span>24h: <strong className="text-emerald-500">{m.uptime24h}%</strong></span>
                  <span>7d: <strong className="text-emerald-500">{m.uptime7d}%</strong></span>
                  <span>30d: <strong className="text-emerald-500">{m.uptime30d}%</strong></span>
                  <span>90d: <strong className="text-emerald-500">{m.uptime90d}%</strong></span>

                  {/* Reset 90-day uptime bars button */}
                  <button
                    onClick={() => handleResetUptime(m.id, m.name)}
                    disabled={resettingId === m.id}
                    className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-[10px] font-sans font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors cursor-pointer"
                    title="Reset this monitor's 90-day uptime history to 100%"
                  >
                    <RotateCcw className={`h-3 w-3 text-neutral-400 ${resettingId === m.id ? 'animate-spin' : ''}`} />
                    <span>Reset 90d Bars</span>
                  </button>
                </div>
              </div>

              <UptimeBar90Days
                monitorId={m.id}
                status={m.status}
                uptime90d={m.uptime90d}
                isDark={isDark}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Incident Log Timeline */}
      <div
        className={`rounded-xl border transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="p-4 border-b border-inherit flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-semibold">Incident Audit Trail</h3>
            <span className="text-xs text-neutral-500 font-mono ml-2">
              ({incidents.length} recorded events)
            </span>
          </div>

          {/* Clear Resolved Incidents Button */}
          <button
            onClick={handleClearResolved}
            disabled={resolvedCount === 0 || clearing}
            className="flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            title="Remove resolved incidents while preserving ongoing outages"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Resolved Incidents ({resolvedCount})</span>
          </button>
        </div>

        <div className="divide-y divide-inherit">
          {incidents.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              No incidents recorded in the system.
            </div>
          ) : (
            incidents.map((inc) => {
              const isOngoing = inc.status === 'ongoing';

              return (
                <div key={inc.id} className="p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {isOngoing ? (
                        <span className="flex items-center gap-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-xs font-mono font-semibold animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Ongoing Outage
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-xs font-mono font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved
                        </span>
                      )}

                      <span className="font-semibold text-sm">{inc.monitorName}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-neutral-400 font-mono">
                        {isOngoing ? (
                          <span className="text-rose-400">Started {new Date(inc.startedAt).toLocaleString()}</span>
                        ) : (
                          <span>
                            Duration:{' '}
                            <strong className="text-neutral-200">
                              {inc.durationSeconds ? `${Math.round(inc.durationSeconds / 60)} min` : '< 1 min'}
                            </strong>
                          </span>
                        )}
                      </div>

                      {/* Delete single incident button */}
                      <button
                        onClick={() => handleDeleteSingleIncident(inc.id, inc.monitorName)}
                        className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete this incident log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Root Cause & Diagnostic Summary */}
                  <div className="rounded-xl border border-inherit bg-neutral-950/40 p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            Root Cause Diagnostic
                          </div>
                          <div className="text-xs font-semibold text-neutral-200 mt-0.5">
                            {inc.rootCause ? inc.rootCause.likelyCause : inc.cause}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {inc.rootCause && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] font-mono">
                            <span className="text-neutral-400">Confidence:</span>
                            <span className="text-emerald-400 font-bold">{inc.rootCause.confidencePercent}% ({inc.rootCause.confidenceLevel})</span>
                          </div>
                        )}

                        {/* "Explain in simple words" button */}
                        <button
                          onClick={() => handleExplain(inc)}
                          disabled={explainingIds[inc.id]}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 transition-colors text-xs font-medium cursor-pointer"
                          title="Plain-language AI DevOps summary"
                        >
                          <Sparkles className={`h-3.5 w-3.5 text-indigo-400 ${explainingIds[inc.id] ? 'animate-spin' : ''}`} />
                          <span>{explainingIds[inc.id] ? 'Analyzing...' : 'Explain in simple words'}</span>
                        </button>

                        {/* Expand / Collapse Troubleshooting checklist */}
                        <button
                          onClick={() => toggleExpand(inc.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <span>{expandedIncidentIds[inc.id] ? 'Hide Guide' : 'Troubleshoot Guide'}</span>
                          {expandedIncidentIds[inc.id] ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Plain Language Explanation Callout (if active) */}
                    {(inc.rootCause?.aiExplanation || inc.rootCause?.simpleExplanation) && (
                      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Plain-English Breakdown:</span>
                        </div>
                        <p className="leading-relaxed">
                          {inc.rootCause.aiExplanation || inc.rootCause.simpleExplanation}
                        </p>
                      </div>
                    )}

                    {/* Root cause evidence bullets */}
                    {inc.rootCause?.evidence && inc.rootCause.evidence.length > 0 && (
                      <div className="text-xs space-y-1">
                        <div className="text-[10px] uppercase font-semibold text-neutral-500">Diagnostic Evidence:</div>
                        <ul className="space-y-0.5 text-[11px] text-neutral-400 font-mono">
                          {inc.rootCause.evidence.map((ev, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-400">•</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Resolved by Step attribution banner */}
                    {inc.rootCause?.resolvedByStepId && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2 text-xs text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>
                          Resolved by Troubleshooting Step: <strong className="font-mono text-emerald-200">
                            {inc.rootCause.steps.find(s => s.id === inc.rootCause?.resolvedByStepId)?.title || inc.rootCause.resolvedByStepId}
                          </strong>
                        </span>
                      </div>
                    )}

                    <div className="text-[11px] text-neutral-500 flex items-center gap-2 font-mono">
                      <span>Started: {new Date(inc.startedAt).toLocaleString()}</span>
                      {inc.resolvedAt && (
                        <>
                          <span>·</span>
                          <span>Recovered: {new Date(inc.resolvedAt).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Auto Troubleshoot Guide Panel (Collapsible / Expandable) */}
                  {expandedIncidentIds[inc.id] && (
                    <div className="rounded-xl border border-neutral-700/80 bg-neutral-950/70 p-4 space-y-4 animate-in fade-in duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3 border-inherit">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-amber-400" />
                            <span>Step-by-Step Auto Troubleshooting Checklist</span>
                          </h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Prioritized remediation steps tailored to {inc.rootCause?.likelyCause || 'this incident'}.
                          </p>
                        </div>

                        {/* Beginner vs Advanced Guide Toggle */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-neutral-400 font-medium">Guide Level:</span>
                          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                            <button
                              onClick={() => setBeginnerMode(true)}
                              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                                beginnerMode
                                  ? 'bg-amber-500 text-neutral-950 font-bold'
                                  : 'text-neutral-400 hover:text-white'
                              }`}
                            >
                              Beginner
                            </button>
                            <button
                              onClick={() => setBeginnerMode(false)}
                              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                                !beginnerMode
                                  ? 'bg-amber-500 text-neutral-950 font-bold'
                                  : 'text-neutral-400 hover:text-white'
                              }`}
                            >
                              Advanced
                            </button>
                          </div>

                          {/* Re-check Now Button */}
                          <button
                            onClick={() => handleRecheckNow(inc)}
                            disabled={recheckingId === inc.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer shadow-xs ml-2"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${recheckingId === inc.id ? 'animate-spin' : ''}`} />
                            <span>{recheckingId === inc.id ? 'Probing...' : 'Re-check Now'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Checklist Steps */}
                      <div className="space-y-3">
                        {(inc.rootCause?.steps || [
                          {
                            id: 'step_default_1',
                            order: 1,
                            title: 'Verify network connectivity and DNS resolution',
                            beginnerDescription: 'Make sure your website domain still points to a live computer on the internet.',
                            advancedDescription: 'Run a direct DNS lookup and traceroute to verify reachability and edge packet transport.',
                            exampleCommand: `ping -c 4 ${new URL(inc.monitorUrl || 'https://example.com').hostname}`,
                            completed: false
                          },
                          {
                            id: 'step_default_2',
                            order: 2,
                            title: 'Inspect web service processes and firewall ports',
                            beginnerDescription: 'Check whether your web program (like Nginx, Apache or Node) is running.',
                            advancedDescription: 'Verify listening TCP sockets and systemd service status.',
                            exampleCommand: 'sudo systemctl status nginx || sudo systemctl status apache2',
                            completed: false
                          }
                        ]).map((step) => {
                          return (
                            <div
                              key={step.id}
                              className={`rounded-lg border p-3 transition-colors ${
                                step.completed
                                  ? 'border-emerald-500/30 bg-emerald-500/5'
                                  : 'border-neutral-800 bg-neutral-900/60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={step.completed}
                                    onChange={() => handleToggleStep(inc, step)}
                                    className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                                  />
                                  <div className="space-y-1">
                                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                                      <span className="font-mono text-amber-400">Step {step.order}:</span>
                                      <span>{step.title}</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 leading-relaxed">
                                      {beginnerMode ? step.beginnerDescription : step.advancedDescription}
                                    </p>

                                    {/* Copy-paste Example Command */}
                                    {step.exampleCommand && (
                                      <div className="mt-2 flex items-center justify-between rounded-md bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs font-mono text-emerald-400 max-w-xl">
                                        <div className="flex items-center gap-2 truncate">
                                          <Terminal className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                                          <span className="truncate">{step.exampleCommand}</span>
                                        </div>
                                        <button
                                          onClick={() => handleCopyCommand(step.exampleCommand!)}
                                          className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                                          title="Copy command to clipboard"
                                        >
                                          {copiedCommand === step.exampleCommand ? (
                                            <>
                                              <Check className="h-3 w-3 text-emerald-400" />
                                              <span className="text-emerald-400">Copied!</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="h-3 w-3" />
                                              <span>Copy</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* "Did this fix it?" action button */}
                                <div className="shrink-0">
                                  <button
                                    onClick={() => handleDidThisFixIt(inc, step)}
                                    disabled={fixingStepId === step.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                    title="Verify server recovery and record this step as resolution"
                                  >
                                    <Zap className={`h-3 w-3 ${fixingStepId === step.id ? 'animate-spin' : ''}`} />
                                    <span>{fixingStepId === step.id ? 'Testing...' : 'Did this fix it?'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
