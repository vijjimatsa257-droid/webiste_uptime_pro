import React, { useState, useMemo } from 'react';
import { NotificationItem } from '../../types';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  ShieldAlert,
  Camera,
  Activity,
  FileText,
  Link2
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => Promise<void>;
  onClearAll: () => Promise<void>;
  isDark: boolean;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  isDark
}) => {
  const [filterType, setFilterType] = useState<'all' | 'outages' | 'security' | 'visual' | 'anomalies'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'outages') return n.type === 'down' || n.type === 'recovered' || n.type === 'watch_alert';
    if (filterType === 'security') return n.type === 'defacement';
    if (filterType === 'visual') return n.type === 'screenshot_alert' || n.type === 'content_changed';
    if (filterType === 'anomalies') return n.type === 'anomaly';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div
        className={`w-full max-w-md h-full flex flex-col border-l shadow-2xl transition-all ${
          isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-sm">Notification Center</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount} new
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-inherit overflow-x-auto text-[11px] font-medium text-neutral-400">
          {(['all', 'outages', 'security', 'visual', 'anomalies'] as const).map(ft => (
            <button
              key={ft}
              type="button"
              onClick={() => setFilterType(ft)}
              className={`rounded-md px-2 py-1 capitalize transition-colors ${
                filterType === ft
                  ? isDark
                    ? 'bg-neutral-800 text-emerald-400 font-bold'
                    : 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'hover:text-neutral-200'
              }`}
            >
              {ft}
            </button>
          ))}
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-inherit text-xs text-neutral-400">
          <button
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1 hover:text-emerald-400 transition-colors disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark all read</span>
          </button>

          <button
            onClick={onClearAll}
            disabled={notifications.length === 0}
            className="flex items-center gap-1 hover:text-rose-400 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear list</span>
          </button>
        </div>

        {/* Notification Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-inherit">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              <Bell className="mx-auto h-7 w-7 text-neutral-400 mb-2 opacity-50" />
              <div>No alerts matching this filter.</div>
              <p className="mt-1 text-[11px] text-neutral-400">
                Outage notifications, defacements, and visual diffs will appear here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              let Icon = Info;
              let iconColor = 'text-neutral-400';
              if (n.type === 'down') {
                Icon = AlertTriangle;
                iconColor = 'text-rose-500';
              } else if (n.type === 'recovered') {
                Icon = CheckCircle2;
                iconColor = 'text-emerald-500';
              } else if (n.type === 'watch_alert') {
                Icon = Eye;
                iconColor = 'text-sky-400';
              } else if (n.type === 'defacement') {
                Icon = ShieldAlert;
                iconColor = 'text-rose-500';
              } else if (n.type === 'screenshot_alert') {
                Icon = Camera;
                iconColor = 'text-indigo-400';
              } else if (n.type === 'anomaly') {
                Icon = Activity;
                iconColor = 'text-amber-500';
              } else if (n.type === 'content_changed') {
                Icon = FileText;
                iconColor = 'text-purple-400';
              } else if (n.type === 'broken_link') {
                Icon = Link2;
                iconColor = 'text-amber-400';
              }

              return (
                <div
                  key={n.id}
                  className={`p-4 transition-colors ${
                    !n.read
                      ? isDark
                        ? 'bg-neutral-800/40'
                        : 'bg-emerald-50/50'
                      : isDark
                      ? 'hover:bg-neutral-800/20'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-semibold ${!n.read ? 'text-white' : 'text-neutral-300'}`}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="mt-2 text-[10px] text-neutral-500 font-mono">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                        {new Date(n.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
