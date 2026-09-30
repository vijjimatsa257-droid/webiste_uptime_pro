import React from 'react';
import { FavoriteSite, Monitor } from '../../types';
import { Eye, ShieldAlert, AlertTriangle, CheckCircle2, Clock, Plus, Zap } from 'lucide-react';

interface FavoriteSmartTipsProps {
  favorite: FavoriteSite;
  monitor?: Monitor;
  onEnableWatch?: (monitorId: string) => void;
  onTrackAsMonitor?: (url: string, name: string) => void;
  onAccept403?: (fav: FavoriteSite) => void;
  compact?: boolean;
}

export const FavoriteSmartTips: React.FC<FavoriteSmartTipsProps> = ({
  favorite,
  monitor,
  onEnableWatch,
  onTrackAsMonitor,
  onAccept403,
  compact = false
}) => {
  const isDown = favorite.lastStatus === 'down' || (monitor && monitor.status === 'down');
  const isBlocked = favorite.lastStatus === 'blocked' || favorite.statusCode === 403 || (monitor && monitor.status === 'blocked');
  const isSlow = favorite.lastResponseTimeMs > 1500;
  const isSslExpiringSoon = favorite.sslDaysRemaining !== null && favorite.sslDaysRemaining !== undefined && favorite.sslDaysRemaining <= 14;
  const isMonitored = Boolean(monitor);

  // 1. If Down: "Enable Watch to get notified when it's back up" (with Watch button)
  if (isDown) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md ${compact ? 'px-2 py-0.5' : 'p-2'}`}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
        <span className="truncate">
          <strong>Down:</strong> Enable Watch to get notified when it&apos;s back up
        </span>
        {monitor ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEnableWatch?.(monitor.id);
            }}
            className="ml-auto shrink-0 flex items-center gap-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <Eye className="h-3 w-3" />
            <span>{monitor.isWatched ? 'Watched' : 'Watch'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTrackAsMonitor?.(favorite.url, favorite.name);
            }}
            className="ml-auto shrink-0 flex items-center gap-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Track & Watch</span>
          </button>
        )}
      </div>
    );
  }

  // 2. If Reachable, Blocked (403): "Accept HTTP 403 as Up" (one click)
  if (isBlocked) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md ${compact ? 'px-2 py-0.5' : 'p-2'}`}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span className="truncate">Reachable, Blocked (403)</span>
        {onAccept403 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept403(favorite);
            }}
            className="ml-auto shrink-0 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Accept HTTP 403 as Up
          </button>
        )}
      </div>
    );
  }

  // 3. If SSL expires within 14 days: "SSL expiring soon"
  if (isSslExpiringSoon) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-md ${compact ? 'px-2 py-0.5' : 'p-2'}`}>
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span>
          <strong>SSL expiring soon</strong> ({favorite.sslDaysRemaining} days remaining)
        </span>
      </div>
    );
  }

  // 4. If response time is slow (over 1500 ms): "Site is slow. Check again later."
  if (isSlow) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md ${compact ? 'px-2 py-0.5' : 'p-2'}`}>
        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span>Site is slow ({favorite.lastResponseTimeMs}ms). Check again later.</span>
      </div>
    );
  }

  // 5. If not yet monitored: "Track as Monitor" button
  if (!isMonitored) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/40 border border-neutral-700/40 rounded-md ${compact ? 'px-2 py-0.5' : 'p-2'}`}>
        <Zap className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        <span className="truncate">Not in 24/7 monitors</span>
        {onTrackAsMonitor && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTrackAsMonitor(favorite.url, favorite.name);
            }}
            className="ml-auto shrink-0 flex items-center gap-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Track as Monitor</span>
          </button>
        )}
      </div>
    );
  }

  // 6. If healthy: "All good" with the uptime %
  const uptimeVal = monitor ? monitor.uptime30d : (favorite.uptimePercent || 99.9);
  return (
    <div className={`flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md ${compact ? 'px-2 py-0.5' : 'p-2'}`}>
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      <span>
        <strong>All good</strong> · {uptimeVal}% uptime
      </span>
      {favorite.lastResponseTimeMs > 0 && (
        <span className="ml-auto text-[11px] font-mono text-emerald-300/80">
          {favorite.lastResponseTimeMs}ms
        </span>
      )}
    </div>
  );
};
