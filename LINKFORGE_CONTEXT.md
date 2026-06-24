# LinkForge — Complete Project Context Document

> **Purpose**: Feed this document to any AI assistant (Gemini, etc.) so it fully understands the LinkForge codebase, architecture, file structure, and what has been built.

---

## 1. What Is LinkForge?

LinkForge is a **full-stack URL shortener** with user authentication, custom aliases, and deep click analytics. Users register/login, paste long URLs, get short links, and see detailed analytics on who clicked (device, browser, OS, country, referrer).

**Tech Stack:**
- **Backend**: Node.js + Express.js (CommonJS)
- **Database**: MongoDB Atlas (via Mongoose ODM)
- **Auth**: JWT (JSON Web Tokens) + bcryptjs password hashing
- **Frontend**: Vanilla HTML/CSS/JS (no framework, no build step)
- **Charts**: Vanilla Canvas 2D API (no chart libraries)
- **Click Tracking**: ua-parser-js (device/browser/OS), geoip-lite (country/city), crypto (IP hashing)
- **Rate Limiting**: express-rate-limit (100 requests per 15 min)
- **Short Code Generation**: nanoid with custom Base62 alphabet

---

## 2. Project File Structure

```
LinkForge/
├── server.js              # Express server entry point (port 5000)
├── package.json           # Dependencies and scripts
├── .env                   # MongoDB URI, JWT secret, Redis URL
│
├── models/
│   ├── User.js            # User schema (name, email, password, createdAt)
│   ├── Url.js             # URL schema (user, urlCode, longUrl, shortUrl, clicks, createdAt with 30-day TTL)
│   └── ClickEvent.js      # Click event schema (urlId, urlCode, timestamp, country, city, device, browser, os, referrer, ipHash)
│
├── routes/
│   ├── auth.js            # POST /api/auth/register, POST /api/auth/login
│   ├── url.js             # POST /api/url/shorten, GET /api/url/dashboard, GET /api/url/analytics
│   └── index.js           # GET /:code (redirect handler + click tracking)
│
├── middleware/
│   └── verifyToken.js     # JWT verification middleware (reads x-auth-token header)
│
├── utils/
│   ├── generateCode.js    # nanoid-based Base62 code generator (6 chars)
│   └── parseClick.js      # Extracts device/browser/OS/country/city/referrer/ipHash from request
│
└── public/                # Static frontend files (served by Express)
    ├── index.html          # Landing page with forge bar + inline auth section
    ├── login.html          # Login page (old card design, inline JS)
    ├── register.html       # Register page (currently broken/corrupted — needs rebuild)
    ├── dashboard.html      # User dashboard — shows all forged links in a table
    ├── analytics.html      # Analytics dashboard — charts, stats, donut charts, tables
    ├── app.js              # Shared frontend JS (auth, forge, dashboard, analytics functions)
    ├── style.css           # Main stylesheet (dark theme, red accents)
    └── auth.css            # Split-screen auth page styles
```

---

## 3. Backend Architecture

### 3.1 Server Setup (`server.js`)

```
Middleware chain:
1. express.json()           — Parse JSON request bodies
2. express-rate-limit       — 100 req/15min on /api/* routes, returns JSON on 429
3. cors()                   — Allow cross-origin requests
4. express.static('public') — Serve frontend files

Routes:
- /api/auth/*     → routes/auth.js    (register, login)
- /api/url/*      → routes/url.js     (shorten, dashboard, analytics)
- /*              → routes/index.js   (short URL redirect + click tracking)
```

### 3.2 Database Models

**User** (`models/User.js`):
```
{ name: String, email: String (unique), password: String (bcrypt hashed), createdAt: Date }
```

**Url** (`models/Url.js`):
```
{ user: ObjectId (ref: User), urlCode: String (unique), longUrl: String, shortUrl: String, clicks: Number (default: 0), createdAt: Date (TTL: 30 days) }
```

**ClickEvent** (`models/ClickEvent.js`):
```
{ urlId: ObjectId (ref: Url), urlCode: String, timestamp: Date, country: String, city: String, device: String, browser: String, os: String, referrer: String, ipHash: String }
```

### 3.3 API Routes

#### Auth Routes (`routes/auth.js`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account. Body: `{ name, email, password }`. Returns `{ wristband: "jwt_token" }` |
| POST | `/api/auth/login` | No | Login. Body: `{ email, password }`. Returns `{ wristband: "jwt_token" }` |

#### URL Routes (`routes/url.js`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/url/shorten` | Yes (JWT) | Create short URL. Body: `{ longUrl, customAlias? }`. Returns full Url document |
| GET | `/api/url/dashboard` | Yes (JWT) | Get all URLs created by logged-in user, sorted by newest first |
| GET | `/api/url/analytics` | Yes (JWT) | Get all ClickEvent documents for all of user's URLs |

#### Redirect Route (`routes/index.js`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:code` | No | Finds URL by code, increments click counter, creates ClickEvent with parsed user data, redirects to longUrl |

### 3.4 Middleware

**verifyToken** (`middleware/verifyToken.js`):
- Reads JWT from `x-auth-token` header
- Verifies with `JWT_SECRET` env var
- Attaches `req.user = decoded.userId` for downstream routes
- Returns 401 if missing/invalid

### 3.5 Utilities

**generateCode** (`utils/generateCode.js`):
- Uses nanoid with custom Base62 alphabet (0-9, A-Z, a-z)
- Generates 6-character random codes

**parseClick** (`utils/parseClick.js`):
- Parses User-Agent header → device type, browser name, OS name
- Looks up IP → country, city (uses fake US IP for localhost testing)
- Hashes IP with SHA-256 for privacy-safe unique counting

---

## 4. Frontend Architecture

### 4.1 Design System (`style.css`)

**Dark theme** with red accents:
```css
--bg: #0a0a0b          /* Page background */
--surface: #141416     /* Card/panel background */
--border: #1e1e22      /* Borders */
--red: #c62828         /* Primary accent */
--red-glow: #e53935    /* Hover/active accent */
--cream: #f5f0e8       /* Primary text */
--cream-dim: #bfb9ae   /* Secondary text */
--white: #ffffff       /* Headings */
--gray: #71717a        /* Muted text */
--green: #22c55e       /* Success toast */
```

**Fonts**: Outfit (sans-serif for headings/UI), JetBrains Mono (monospace for data/links)

**Design style**: Bold, uppercase labels, sharp borders (no border-radius), industrial/forge aesthetic

### 4.2 Shared JavaScript (`app.js`)

**Token management:**
- Stored as `lf_token` in localStorage
- `getToken()` retrieves it
- `logout()` removes it and redirects to index.html
- `updateNav()` dynamically shows Dashboard/Analytics/Logout when logged in

**Auth functions:**
- `handleRegister(e)` — POST to `/api/auth/register`, stores wristband token
- `handleLogin(e)` — POST to `/api/auth/login`, stores wristband token

**Forge functions:**
- `forgeLink()` — POST to `/api/url/shorten` with longUrl and optional customAlias
- `copyLink()` / `copyText(text)` — Clipboard copy helpers
- `toggleAlias()` — Show/hide custom alias input

**Dashboard functions:**
- `loadDashboard()` — GET `/api/url/dashboard`, renders link table
- `dashForge()` — Quick-create link from dashboard

**Analytics functions:**
- `loadAnalytics()` — GET `/api/url/analytics`, fetches all click events
- `renderAnalytics(clicks)` — Processes raw data, renders all charts/tables
- `setRange(days, btn)` — Time range filter (7D / 30D / ALL)
- `drawAreaChart(canvasId, labels, values)` — Vanilla Canvas 2D area chart
- `drawDonut(canvasId, legendId, data, total)` — Vanilla Canvas 2D donut chart with legend
- `renderTable(tableId, data, total, showRank)` — Dynamic data table with bar indicators
- Helper: `countField(arr, field)` — Aggregate counts by field
- Helper: `formatNum(n)` — Format numbers (1K, 1.2M, etc.)
- Helper: `buildTimeline(clicks)` — Group clicks by day for timeline chart

**Toast system:**
- `toast(msg, type)` — Shows success (green) or error (red) notification

### 4.3 Pages

#### `index.html` — Landing Page
- Nav bar (dynamic: shows Dashboard/Analytics/Logout when logged in)
- Hero section with "SHORTEN. TRACK. OWN IT." headline
- Forge bar (URL input + FORGE button)
- Optional custom alias input
- Result card (shows generated short URL + copy button)
- Inline auth section (login/register tabs, shown when logged out)

#### `dashboard.html` — User Dashboard
- Auth guard: redirects to index.html if no token
- Nav with Forge, Analytics, Logout links
- "My Links" header with count
- Quick-create forge bar
- Links table: Short Link | Original | Clicks | Created | Copy button

#### `analytics.html` — Analytics Dashboard
- Auth guard: redirects to index.html if no token
- Nav with Forge, Dashboard, Analytics (highlighted), Logout
- Header: "LINK ANALYTICS" with time range pills (7D / 30D / ALL)
- Stats grid: Total Clicks, Unique Visitors, Top Country, Top Browser
- Charts: Clicks Over Time (area), Devices (donut), Browsers (donut), OS (donut)
- Tables: Referrers (with bar indicators), Top Countries (ranked with bars)
- Loading state with spinner
- Empty state when no click data exists

#### `login.html` — Login Page (Legacy)
- Old card-based design (`.card`, `.sparkle` classes)
- Inline `<script>` for login (doesn't use app.js)
- Uses `token` localStorage key (not `lf_token` — **inconsistency!**)

#### `register.html` — Register Page (BROKEN)
- Currently corrupted: contains CSS code + two HTML documents concatenated
- Needs complete rebuild

---

## 5. Known Issues / TODO

| Issue | Location | Severity |
|-------|----------|----------|
| `register.html` is corrupted (CSS + 2 HTML docs merged into one file) | `public/register.html` | 🔴 Critical |
| `login.html` uses old design + inline JS + stores token as `token` not `lf_token` | `public/login.html` | 🟡 Medium |
| No link deletion API/UI | Backend + Dashboard | 🟡 Feature |
| No per-link analytics (analytics shows all links combined) | Analytics page | 🟡 Feature |
| URLs have 30-day TTL (auto-expire) but no UI warning about this | Dashboard | 🟢 Low |
| Redis URL is in .env but Redis is not used anywhere in the code | server.js | 🟢 Low |
| `baseUrl` is hardcoded to `http://localhost:5000` in `routes/url.js` | Backend | 🟡 Deploy |

---

## 6. Environment Variables (`.env`)

```
MONGO_URI=mongodb://...         # MongoDB Atlas connection string
JWT_SECRET=supersecretarcadekey  # JWT signing secret
REDIS_URL=rediss://...           # Upstash Redis (currently unused)
```

---

## 7. How to Run

```bash
cd LinkForge
npm install          # Install dependencies
npm run dev          # Start with nodemon (auto-restart on changes)
# OR
npm start            # Start with node (production)
```

Server runs on `http://localhost:5000`

---

## 8. Dependencies

| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT auth tokens |
| nanoid | Short code generation |
| valid-url | URL validation |
| ua-parser-js | User-Agent parsing (device/browser/OS) |
| geoip-lite | IP geolocation (country/city) |
| express-rate-limit | API rate limiting |
| cors | Cross-origin support |
| dotenv | Environment variable loading |
| ioredis | Redis client (currently unused) |
| nodemon (dev) | Auto-restart on file changes |
