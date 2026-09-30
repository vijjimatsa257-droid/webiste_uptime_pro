-- ==============================================================================
-- Uptime Checker Pro - Supabase PostgreSQL Schema with Row Level Security (RLS)
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  alert_email TEXT,
  webhook_url TEXT,
  sound_enabled BOOLEAN DEFAULT TRUE,
  browser_notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Monitors Table
CREATE TABLE IF NOT EXISTS public.monitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('http', 'port', 'ping', 'keyword')),
  port INTEGER,
  keyword TEXT,
  interval_minutes INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending' CHECK (status IN ('up', 'down', 'paused', 'pending')),
  last_checked_at TIMESTAMPTZ,
  response_time_ms INTEGER DEFAULT 0,
  uptime_24h NUMERIC(5,2) DEFAULT 100.00,
  uptime_7d NUMERIC(5,2) DEFAULT 100.00,
  uptime_30d NUMERIC(5,2) DEFAULT 100.00,
  uptime_90d NUMERIC(5,2) DEFAULT 100.00,
  tags TEXT[] DEFAULT '{}',
  maintenance_mode BOOLEAN DEFAULT FALSE,
  is_watched BOOLEAN DEFAULT FALSE,
  watched_since TIMESTAMPTZ,
  back_online_at TEXT,
  notification_channels JSONB DEFAULT '{"email": true, "browser": true, "sound": true}'::jsonb,
  ssl_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Checks (Logs) Table
CREATE TABLE IF NOT EXISTS public.checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID REFERENCES public.monitors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('up', 'down')),
  status_code INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID REFERENCES public.monitors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  monitor_name TEXT NOT NULL,
  monitor_url TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'resolved')),
  cause TEXT
);

-- 5. Watches Table
CREATE TABLE IF NOT EXISTS public.watches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID REFERENCES public.monitors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  high_frequency_interval_seconds INTEGER DEFAULT 30,
  activated_at TIMESTAMPTZ DEFAULT now(),
  recovered_at TIMESTAMPTZ
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  monitor_id UUID REFERENCES public.monitors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system' CHECK (type IN ('down', 'recovered', 'watch_alert', 'maintenance', 'system')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Status Pages Table
CREATE TABLE IF NOT EXISTS public.status_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  published_monitor_ids UUID[] DEFAULT '{}',
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_status TEXT DEFAULT 'pending' CHECK (last_status IN ('up', 'blocked', 'down', 'pending')),
  last_checked_at TIMESTAMPTZ,
  pinned BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  last_response_time_ms INTEGER DEFAULT 0,
  ssl_days_remaining INTEGER,
  status_code INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can select and update only their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Monitors: Users manage their own monitors
CREATE POLICY "Users can CRUD own monitors" ON public.monitors FOR ALL USING (auth.uid() = user_id);

-- Favorites: Users manage their own favorites
CREATE POLICY "Users can CRUD own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Checks: Users can view, insert, and delete own logs
CREATE POLICY "Users can view own checks" ON public.checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checks" ON public.checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own checks" ON public.checks FOR DELETE USING (auth.uid() = user_id);

-- Incidents: Users manage their own incidents
CREATE POLICY "Users can CRUD own incidents" ON public.incidents FOR ALL USING (auth.uid() = user_id);

-- Watches: Users manage their own watch targets
CREATE POLICY "Users can CRUD own watches" ON public.watches FOR ALL USING (auth.uid() = user_id);

-- Notifications: Users manage their own notifications
CREATE POLICY "Users can CRUD own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Status Pages: Public status pages can be read by anyone if is_public = true, owners can CRUD
CREATE POLICY "Public status pages are viewable by everyone" ON public.status_pages FOR SELECT USING (is_public = true);
CREATE POLICY "Owners can CRUD own status page" ON public.status_pages FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- Automated Data Retention & Maintenance RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION purge_old_checks(retention_days INT)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF retention_days > 0 THEN
    DELETE FROM public.checks
    WHERE user_id = auth.uid()
      AND created_at < (now() - (retention_days || ' days')::INTERVAL);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
