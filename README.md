# Uptime Checker Pro

A full-stack website and server monitoring tool for developers, students, small business owners, and DevOps engineers. Built with React 19, TypeScript, Tailwind CSS, Express backend, and Supabase PostgreSQL schema with Row Level Security (RLS).

## Key Features

1. **Authentication & Multi-Tenant Workspaces**:
   - Email/password authentication modal with quick workspace switching (`admin@uptimechecker.pro`, `dev@client-ops.io`).
   - Per-user dashboard and configuration.

2. **Real-Time Dashboard (Home)**:
   - 5 KPI summary cards: Total Monitors, Up, Down, Average Response Time (ms), Overall Uptime %.
   - Live monitor list with real-time status badges (Green Up, Red Down, Yellow Paused, Sky Watching).
   - Response-Time Line Chart for **24h / 7d / 30d** with average, minimum, maximum, and p95 latency.
   - 30-second auto-refresh countdown with pause/resume and instant manual refresh.

3. **Instant Website & Endpoint Check**:
   - Check any URL on demand with HTTP status codes, latency turnaround, and HTTP response headers.
   - Supports GET, HEAD, and POST methods.
   - Keyword verification (verifies specific text exists in HTML response body).
   - One-click "Track as Monitor" button.

4. **Monitoring Engine (Start / Stop / CRUD)**:
   - Monitor types: HTTP/HTTPS, Port check (TCP socket host + port), Ping/Latency, and Keyword checks.
   - Configurable check intervals: 1, 5, 10, 30, or 60 minutes.
   - Tagging / group organization (e.g., "Production", "Core API", "Database", "Client A").
   - Maintenance mode toggle: silences alerts during planned infrastructure work.
   - Immediate "Check" trigger on each monitor.

5. **TCP Port Checker**:
   - Test custom host and port with real socket handshakes using Node's `net.createConnection`.
   - Quick presets: 80 (HTTP), 443 (HTTPS), 22 (SSH), 21 (FTP), 3306 (MySQL), 5432 (Postgres), 3000 (Node.js Dev), 8080 (Alt Web).
   - Shows Open/Closed status with exact connection latency in milliseconds.

6. **Watch Feature (Down Server Recovery Notifications)**:
   - Enable "Watch" on any offline or down server.
   - Autonomous 30-second check loop specifically prioritizes watched targets.
   - Instant multi-channel alert the second the server comes back online:
     - Uplifting harmonic Web Audio chime synthesizer.
     - Browser push notification.
     - In-app notification toast.
     - "Back Online at HH:MM:SS" badge.
   - Built-in "Simulate Recovery" simulator button for immediate verification of audio and notification workflows without needing to take down actual servers!

7. **Alerts & Notification Center**:
   - In-app notification center drawer with unread counter, mark all read, and clear list.
   - Webhook test dispatcher with instant HTTP status response.
   - Multi-channel notification routing (Email, Browser push, Sound chime, Webhook).

8. **Incident Timeline & Reliability Matrix**:
   - Incident audit trail logging down start, recovery timestamp, duration, and root cause.
   - Mean Time to Recovery (MTTR) tracking.
   - Uptime statistics for 24h, 7d, 30d, and 90d.
   - Interactive 90-day uptime bars (green / yellow / red daily blocks with hover tooltips).

9. **History & Telemetry Logs**:
   - Complete audit trail of checks with HTTP status code, latency, and timestamp.
   - Search by monitor name or message.
   - Filter by monitor and status (Up / Down).
   - Pagination controls.
   - Export to CSV format (`uptime-checker-pro-logs.csv`).

10. **Extra Developer & Admin Tools**:
    - **SSL Certificate Inspector**: Expiration date, days remaining, Root CA, and warning when &lt; 14 days remain.
    - **DNS Record Lookup**: Resolves A, AAAA, MX, NS, TXT, and CNAME records using `node:dns.promises`.
    - **Bulk URL Importer**: Paste CSV / text lines (`URL, Name, Tag`) to import 10+ endpoints simultaneously.
    - **Weekly Executive Report**: Visual email report digest preview with one-click dispatch test.

11. **Public Status Page**:
    - Dedicated shareable status page with customizable title, description, and announcement banner.
    - Displays overall system health ("All Systems Fully Operational" / "Partial Outage") and published service components.
    - Shareable public link copy button.

12. **Settings & REST API**:
    - Bearer API key generation with ready-to-run cURL terminal command.
    - Timezone, theme, alert email, and webhook configuration.

---

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Audio Synthesizer**: Native Web Audio API for chime alerts without external MP3 dependencies.
- **Backend API**: Express server running inside `server.ts` mounted with Vite middlewares in development.
- **Database / Schema**: Supabase PostgreSQL schema with Row Level Security (RLS) located at `/supabase/schema.sql`.

---

## Local Setup & Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`.

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Run production server**:
   ```bash
   npm start
   ```

5. **Deploy Supabase schema (Optional)**:
   To connect your own remote Supabase database, copy the contents of `/supabase/schema.sql` into the Supabase SQL editor and set your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
