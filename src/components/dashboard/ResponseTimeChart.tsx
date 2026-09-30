import React, { useState, useMemo } from 'react';
import { generateResponseTimeHistory } from '../../data/mockData';
import { Activity, Clock, AlertTriangle } from 'lucide-react';
import { AnomalyEvent } from '../../types';

interface ResponseTimeChartProps {
  isDark: boolean;
  anomalies?: AnomalyEvent[];
}

export const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({ isDark, anomalies = [] }) => {
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    return generateResponseTimeHistory(period);
  }, [period]);

  const stats = useMemo(() => {
    const latencies = data.map(d => d.avgLatency);
    const sum = latencies.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / latencies.length);
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
    return { avg, min, max, p95 };
  }, [data]);

  // Chart dimensions
  const width = 800;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const yMax = Math.ceil((stats.max * 1.25) / 10) * 10;
  const yMin = 0;

  // Identify anomaly spikes on the chart points
  const points = useMemo(() => {
    return data.map((d, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.avgLatency - yMin) / (yMax - yMin)) * chartHeight;
      
      // Match with real anomaly event or synthetic outlier point
      const matchedAnomaly = anomalies.find(a => a.responseTimeMs && Math.abs(a.responseTimeMs - d.avgLatency) < 40) ||
        (d.avgLatency > stats.avg * 1.8 ? {
          reason: `Response ${d.avgLatency} ms vs normal ${stats.avg} ms`,
          currentValue: `${d.avgLatency} ms`,
          expectedValue: `${stats.avg} ms`
        } : null);

      return { x, y, data: d, isAnomaly: Boolean(matchedAnomaly), anomalyInfo: matchedAnomaly };
    });
  }, [data, chartWidth, chartHeight, padding.left, padding.top, yMax, yMin, anomalies, stats.avg]);

  // SVG path definitions
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, curr, i) => {
      if (i === 0) return `M ${curr.x} ${curr.y}`;
      // Smooth cubic bezier
      const prev = points[i - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    const bottomY = padding.top + chartHeight;
    return `${pathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [pathD, points, padding.top, chartHeight]);

  const activeHover = hoverIndex !== null ? points[hoverIndex] : null;
  const anomalyPoints = points.filter(p => p.isAnomaly);

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
        isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
      }`}
    >
      {/* Header and Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-inherit">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Response Time Telemetry
            </h2>
            {anomalyPoints.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400 border border-orange-500/30">
                <AlertTriangle className="h-2.5 w-2.5" />
                <span>{anomalyPoints.length} Anomalies</span>
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500 font-mono">
            <span>Avg: <strong className="text-neutral-900 dark:text-neutral-200">{stats.avg}ms</strong></span>
            <span aria-hidden="true">·</span>
            <span>Min: <strong className="text-emerald-500">{stats.min}ms</strong></span>
            <span aria-hidden="true">·</span>
            <span>p95: <strong className="text-neutral-900 dark:text-neutral-200">{stats.p95}ms</strong></span>
            <span aria-hidden="true">·</span>
            <span>Max: <strong className="text-amber-500">{stats.max}ms</strong></span>
          </div>
        </div>

        {/* Segmented Period Tabs */}
        <div className="flex items-center gap-1 self-start rounded-lg p-1 border border-inherit">
          {(['24h', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setHoverIndex(null);
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? isDark
                    ? 'bg-neutral-800 text-emerald-400 font-semibold'
                    : 'bg-slate-100 text-emerald-700 font-semibold shadow-xs'
                  : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative mt-4 w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 select-none overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * width;
            let closestIdx = 0;
            let minDist = Infinity;
            points.forEach((pt, idx) => {
              const dist = Math.abs(pt.x - relX);
              if (dist < minDist) {
                minDist = dist;
                closestIdx = idx;
              }
            });
            setHoverIndex(closestIdx);
          }}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight * (1 - ratio);
            const val = Math.round(yMin + (yMax - yMin) * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={isDark ? '#262626' : '#f1f5f9'}
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  fill={isDark ? '#737373' : '#94a3b8'}
                >
                  {val}ms
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Anomaly Outlier Markers */}
          {anomalyPoints.map((pt, i) => (
            <g key={`anom_${i}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="6.5"
                fill="#f97316"
                fillOpacity="0.3"
                className="animate-pulse"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#f97316"
                stroke={isDark ? '#171717' : '#ffffff'}
                strokeWidth="1.5"
              />
            </g>
          ))}

          {/* Hover highlight line & dot */}
          {activeHover && (
            <g>
              <line
                x1={activeHover.x}
                y1={padding.top}
                x2={activeHover.x}
                y2={padding.top + chartHeight}
                stroke={activeHover.isAnomaly ? '#f97316' : isDark ? '#525252' : '#cbd5e1'}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activeHover.x}
                cy={activeHover.y}
                r="5.5"
                fill={activeHover.isAnomaly ? '#f97316' : '#10b981'}
                stroke={isDark ? '#171717' : '#ffffff'}
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Time axis labels */}
          {points
            .filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1)
            .map((pt, i) => (
              <text
                key={i}
                x={pt.x}
                y={height - 8}
                textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
                fontSize="10"
                fontFamily="monospace"
                fill={isDark ? '#737373' : '#94a3b8'}
              >
                {pt.data.label}
              </text>
            ))}
        </svg>

        {/* Hover Tooltip Float */}
        {activeHover && (
          <div
            className={`pointer-events-none absolute top-2 rounded-lg border px-3 py-2 text-xs shadow-xl transition-transform ${
              activeHover.isAnomaly
                ? isDark
                  ? 'border-orange-500/50 bg-neutral-950/98 text-neutral-100 ring-1 ring-orange-500/30'
                  : 'border-orange-300 bg-white text-slate-800 ring-1 ring-orange-300'
                : isDark
                ? 'border-neutral-700 bg-neutral-950/95 text-neutral-100'
                : 'border-slate-300 bg-white text-slate-800'
            }`}
            style={{
              left: `${Math.min(Math.max(activeHover.x - 70, 20), width - 220)}px`,
            }}
          >
            <div className="flex items-center justify-between gap-3 text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{activeHover.data.label}</span>
              </div>
              {activeHover.isAnomaly && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 font-mono">
                  <AlertTriangle className="h-3 w-3" />
                  <span>ANOMALY</span>
                </span>
              )}
            </div>

            <div className="mt-1 font-mono text-sm font-bold flex items-baseline gap-2">
              <span className={activeHover.isAnomaly ? 'text-orange-400' : 'text-emerald-500'}>
                {activeHover.data.avgLatency} ms
              </span>
              <span className="text-[10px] font-normal text-neutral-400">(p95: {activeHover.data.p95Latency}ms)</span>
            </div>

            {activeHover.isAnomaly && (
              <div className="mt-1 border-t border-orange-500/20 pt-1 text-[11px] text-orange-300 font-sans">
                {activeHover.anomalyInfo?.reason || `Response ${activeHover.data.avgLatency} ms vs normal ${stats.avg} ms`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
