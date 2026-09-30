import React, { useState, useMemo } from 'react';
import { FavoriteSite, Monitor } from '../../types';
import { StarButton } from '../common/StarButton';
import { FavoriteSmartTips } from './FavoriteSmartTips';
import {
  Star,
  Search,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Globe,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  Sparkles
} from 'lucide-react';

interface FavoritesManagerViewProps {
  favorites: FavoriteSite[];
  monitors: Monitor[];
  isDark: boolean;
  onToggleStar: (site: { url: string; name?: string }) => Promise<void>;
  onUpdateFavorite: (id: string, updates: Partial<FavoriteSite>) => Promise<void>;
  onDeleteFavorite: (id: string) => Promise<void>;
  onReorderFavorites: (orderedIds: string[]) => Promise<void>;
  onCheckAllFavorites: () => Promise<void>;
  onCheckFavorite: (id: string) => Promise<void>;
  onTrackAsMonitor: (url: string, name: string) => void;
  onEnableWatch: (monitorId: string) => void;
  onNavigateToWebsiteCheck?: (url: string) => void;
}

export const FavoritesManagerView: React.FC<FavoritesManagerViewProps> = ({
  favorites,
  monitors,
  isDark,
  onToggleStar,
  onUpdateFavorite,
  onDeleteFavorite,
  onReorderFavorites,
  onCheckAllFavorites,
  onCheckFavorite,
  onTrackAsMonitor,
  onEnableWatch,
  onNavigateToWebsiteCheck
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // New favorite quick adder
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const maxFavorites = 20;
  const isNearLimit = favorites.length >= 18;
  const isAtLimit = favorites.length >= maxFavorites;

  // Filter and sort
  const filteredFavorites = useMemo(() => {
    return favorites.filter(f =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [favorites, searchTerm]);

  const handleStartRename = (fav: FavoriteSite) => {
    setEditingId(fav.id);
    setEditName(fav.name);
  };

  const handleSaveRename = async (id: string) => {
    if (editName.trim()) {
      await onUpdateFavorite(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleTogglePin = async (fav: FavoriteSite) => {
    await onUpdateFavorite(fav.id, { pinned: !fav.pinned });
  };

  const handleCheckSingle = async (id: string) => {
    setCheckingIds(prev => new Set(prev).add(id));
    try {
      await onCheckFavorite(id);
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    try {
      await onCheckAllFavorites();
    } finally {
      setIsCheckingAll(false);
    }
  };

  // Reordering helpers (Move Up / Down)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= favorites.length) return;

    const newOrder = [...favorites];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    await onReorderFavorites(newOrder.map(f => f.id));
  };

  // Drag & drop
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;

    const fromIndex = favorites.findIndex(f => f.id === draggedId);
    const toIndex = favorites.findIndex(f => f.id === overId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newOrder = [...favorites];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    onReorderFavorites(newOrder.map(f => f.id));
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    if (isAtLimit) {
      setAddError('Limit of 20 favorites reached. Please unstar a site first.');
      return;
    }

    setAddError(null);
    setIsAdding(true);
    try {
      let clean = newUrl.trim();
      if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;
      await onToggleStar({ url: clean });
      setNewUrl('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setAddError(e.message || 'Failed to add favorite');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Star className="h-6 w-6 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Manage Starred Favorites
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold ${
                    isAtLimit
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isNearLimit
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {favorites.length} / {maxFavorites} sites
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pin priority sites, reorder, check health, and get instant suggestions for your core services.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckAll}
              disabled={isCheckingAll || favorites.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCheckingAll ? 'animate-spin' : ''}`} />
              <span>{isCheckingAll ? 'Checking All...' : 'Check All Favorites'}</span>
            </button>
          </div>
        </div>

        {/* Limit Warning banner if 20 reached */}
        {isAtLimit && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Favorite limit reached (20/20):</strong> You have reached the maximum allowed favorites. Remove an existing starred site to favorite new endpoints.
            </span>
          </div>
        )}

        {/* Quick Add Form */}
        <form onSubmit={handleQuickAdd} className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="Star a new URL (e.g. api.myservice.com or https://stripe.com)..."
              disabled={isAtLimit}
              className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs font-mono transition-colors focus:outline-hidden focus:ring-1 focus:ring-amber-500 ${
                isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-500' : 'border-slate-300 bg-slate-50 text-slate-900'
              } ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newUrl.trim() || isAtLimit}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 fill-neutral-950" />}
            <span>Star Website</span>
          </button>
        </form>

        {addError && (
          <div className="mt-2 text-xs text-rose-400">
            {addError}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search favorite sites by name or URL..."
            className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-800'
            }`}
          />
        </div>

        <div className="text-xs text-neutral-500">
          Showing {filteredFavorites.length} of {favorites.length} favorites · Drag or use arrows to reorder
        </div>
      </div>

      {/* Favorites List */}
      {filteredFavorites.length === 0 ? (
        <div
          className={`rounded-xl border p-12 text-center transition-colors ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Star className="h-7 w-7 text-amber-400" />
          </div>
          <h3 className="mt-3 text-base font-bold text-neutral-900 dark:text-neutral-100">
            {searchTerm ? 'No matching favorites' : 'Star a website to see it here'}
          </h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto">
            {searchTerm
              ? 'Try a different search term or clear the filter.'
              : 'Click the star icon (☆) on any URL check result, bulk check row, monitor card, or check log to add it to your favorites.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFavorites.map((fav, index) => {
            const isChecking = checkingIds.has(fav.id);
            const isEditing = editingId === fav.id;
            const matchedMonitor = monitors.find(m =>
              m.url.replace(/\/+$/, '').toLowerCase() === fav.url.replace(/\/+$/, '').toLowerCase()
            );

            return (
              <div
                key={fav.id}
                draggable
                onDragStart={() => handleDragStart(fav.id)}
                onDragOver={(e) => handleDragOver(e, fav.id)}
                onDragEnd={handleDragEnd}
                className={`group rounded-xl border p-4 transition-all duration-150 ${
                  fav.pinned
                    ? isDark
                      ? 'border-amber-500/40 bg-neutral-900/90 shadow-xs ring-1 ring-amber-500/20'
                      : 'border-amber-300 bg-amber-50/40 shadow-xs ring-1 ring-amber-400/20'
                    : isDark
                    ? 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-700'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Drag handle, Star, Status, Name & URL */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Drag Handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-400 p-1 rounded"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Star Toggle Button */}
                    <StarButton
                      isStarred={true}
                      onToggle={() => onToggleStar({ url: fav.url, name: fav.name })}
                      size="md"
                    />

                    {/* Status Dot */}
                    <div className="shrink-0">
                      {fav.lastStatus === 'up' && (
                        <span
                          className="flex h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"
                          title="Operational (Up)"
                        />
                      )}
                      {fav.lastStatus === 'blocked' && (
                        <span
                          className="flex h-3 w-3 rounded-full bg-amber-400 ring-4 ring-amber-400/20"
                          title="Reachable, Blocked (HTTP 403)"
                        />
                      )}
                      {fav.lastStatus === 'down' && (
                        <span
                          className="flex h-3 w-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20 animate-pulse"
                          title="Down"
                        />
                      )}
                      {fav.lastStatus === 'pending' && (
                        <span
                          className="flex h-3 w-3 rounded-full bg-neutral-500 ring-4 ring-neutral-500/20"
                          title="Pending check"
                        />
                      )}
                    </div>

                    {/* Name & URL */}
                    <div className="min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRename(fav.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                              isDark ? 'border-neutral-700 bg-neutral-950 text-neutral-100' : 'border-slate-300 bg-white text-slate-900'
                            }`}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(fav.id)}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-neutral-500 hover:text-neutral-400"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                            {fav.name}
                          </h3>

                          {fav.pinned && (
                            <span className="flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold text-amber-400">
                              <Pin className="h-3 w-3 fill-amber-400" />
                              Pinned
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartRename(fav)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-neutral-500 hover:text-neutral-300"
                            title="Rename"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mt-0.5 truncate">
                        <a
                          href={fav.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-400 hover:underline truncate flex items-center gap-1"
                        >
                          <span>{fav.url}</span>
                          <ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {/* Latency */}
                    {fav.lastResponseTimeMs > 0 && (
                      <div className="flex items-center gap-1 font-mono text-xs text-neutral-300 bg-neutral-950/60 border border-inherit px-2 py-1 rounded-md">
                        <Clock className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{fav.lastResponseTimeMs} ms</span>
                      </div>
                    )}

                    {/* Move Up/Down Controls for Mobile / keyboard accessibility */}
                    <div className="flex items-center rounded-lg border border-inherit bg-neutral-950/40 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === favorites.length - 1}
                        className="p-1 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Pin to Top */}
                    <button
                      type="button"
                      onClick={() => handleTogglePin(fav)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        fav.pinned
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                          : 'border-inherit bg-neutral-950/40 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                      }`}
                      title={fav.pinned ? 'Unpin from top' : 'Pin to top'}
                    >
                      {fav.pinned ? <Pin className="h-3.5 w-3.5 fill-amber-300" /> : <PinOff className="h-3.5 w-3.5" />}
                    </button>

                    {/* Check Now */}
                    <button
                      type="button"
                      onClick={() => handleCheckSingle(fav.id)}
                      disabled={isChecking}
                      className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-950/60 px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Check Now"
                    >
                      <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>{isChecking ? '...' : 'Check'}</span>
                    </button>

                    {/* Remove (Unstar) */}
                    <button
                      type="button"
                      onClick={() => onDeleteFavorite(fav.id)}
                      className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="Remove from favorites"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Smart Suggestion for this favorite */}
                <div className="mt-3 pt-3 border-t border-inherit">
                  <FavoriteSmartTips
                    favorite={fav}
                    monitor={matchedMonitor}
                    onEnableWatch={onEnableWatch}
                    onTrackAsMonitor={onTrackAsMonitor}
                    onAccept403={() => onNavigateToWebsiteCheck?.(fav.url)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
