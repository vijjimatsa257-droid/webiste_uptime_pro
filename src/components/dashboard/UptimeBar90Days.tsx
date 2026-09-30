import React, { useState, useMemo } from 'react';
import { generate90DayHistory } from '../../data/mockData';
import { MonitorStatus } from '../../types';

interface UptimeBar90DaysProps {
  monitorId: string;
  status: MonitorStatus;
  uptime90d: number;
  isDark: boolean;
}

export const UptimeBar90Days: React.FC<UptimeBar90DaysProps> = ({
  monitorId,
  status,
  uptime90d,
  isDark
}) => {
  const [hoveredBlock, setHoveredBlock] = useState<{
    date: string;
    uptimePercent: number;
    status: 'nominal' | 'degraded' | 'outage';
  } | null>(null);

  const blocks = useMemo(() => {
    return generate90DayHistory(monitorId, status === 'down' ? 'down' : 'up');
  }, [monitorId, status]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5 font-mono">
        <span>90 days ago</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-200">
          {uptime90d.toFixed(2)}% overall uptime
        </span>
        <span>Today</span>
      </div>

      <div className="relative flex items-center gap-[2px] w-full">
        {blocks.map((b, idx) => {
          let bg = 'bg-emerald-500 hover:bg-emerald-400';
          if (b.status === 'outage') bg = 'bg-rose-500 hover:bg-rose-400';
          else if (b.status === 'degraded') bg = 'bg-amber-400 hover:bg-amber-300';

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredBlock(b)}
              onMouseLeave={() => setHoveredBlock(null)}
              className={`h-6 flex-1 rounded-[1.5px] transition-all cursor-pointer ${bg}`}
            />
          );
        })}

        {/* Hover Tooltip */}
        {hoveredBlock && (
          <div
            className={`pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] shadow-md transition-opacity ${
              isDark ? 'border-neutral-700 bg-neutral-950 text-neutral-100' : 'border-slate-300 bg-white text-slate-800'
            }`}
          >
            <span className="text-neutral-400">{hoveredBlock.date}</span>
            <span className="mx-1.5 text-neutral-500">·</span>
            <strong
              className={
                hoveredBlock.status === 'outage'
                  ? 'text-rose-500'
                  : hoveredBlock.status === 'degraded'
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }
            >
              {hoveredBlock.uptimePercent.toFixed(1)}% Uptime
            </strong>
          </div>
        )}
      </div>
    </div>
  );
};
