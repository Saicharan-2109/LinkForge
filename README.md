# 🔗 LinkForge — Full-Stack URL Shortener with Deep Analytics

> A production-grade URL shortener with user authentication, custom aliases, Redis caching, background job processing, and comprehensive click analytics — all rendered with hand-crafted Canvas 2D charts.

![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-v5-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=flat-square&logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-Background_Jobs-6E46AE?style=flat-square)

---

## 🚀 Features

### Core Engine
- **URL Shortening** — Paste any URL, get a Base62 short link (6-character `nanoid` codes)
- **Custom Aliases** — Users can claim vanity URLs (e.g., `/my-portfolio`) with conflict detection
- **301 Redirects** — Lightning-fast redirect with Redis cache (24h TTL) and MongoDB fallback
- **Auto-Expiry** — Links automatically expire after 30 days via MongoDB TTL index

### Analytics Dashboard
- **Click Tracking** — Every redirect logs device, browser, OS, country, city, referrer, and hashed IP
- **Timeline Charts** — Vanilla Canvas 2D area chart showing clicks over time (7D / 30D / All)
- **Donut Charts** — Device, browser, and OS breakdowns with interactive legends
- **Data Tables** — Top referrers and countries with bar-chart indicators
- **Unique Visitors** — Privacy-safe IP hashing (SHA-256) for unique visitor counting

### Performance & Scalability
- **Redis Caching** — Hot URLs served from Upstash Redis, bypassing MongoDB entirely
- **Background Jobs** — BullMQ workers process click analytics asynchronously, so redirects never wait for database writes
- **Rate Limiting** — Redis-backed rate limiter (100 req/15min per IP) via `rate-limit-redis`

### Security
- **JWT Authentication** — Stateless token-based auth with bcrypt password hashing
- **Rate Limiting** — Redis-backed distributed rate limiting
- **Input Validation** — URL validation via `valid-url` before storage

### Frontend
- **Zero-Dependency UI** — Pure HTML/CSS/JS with no frameworks
- **Hand-Drawn Charts** — All analytics visualizations built with Canvas 2D API (no Chart.js)
- **Dark Industrial Theme** — Bold uppercase labels, sharp borders, forge aesthetic
- **Split-Screen Auth** — Modern login/register pages with branding panel

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML, CSS, JavaScript (Canvas 2D for charts) |
| **Backend** | Node.js, Express.js v5 |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Caching** | Redis (Upstash) via ioredis |
| **Job Queue** | BullMQ (Redis-backed background workers) |
| **Auth** | JWT + bcryptjs |
| **Analytics** | ua-parser-js, geoip-lite, crypto (IP hashing) |
| **Rate Limiting** | express-rate-limit + rate-limit-redis |
| **Short Codes** | nanoid (Base62 alphabet) |

---

## 📂 Project Structure

```
LinkForge/
├── server.js               # Express entry point (port 5000)
├── package.json
├── .env                    # Environment variables (not committed)
├── .env.example            # Template for required env vars
│
├── models/
│   ├── User.js             # User schema (name, email, hashed password)
│   ├── Url.js              # URL schema (code, longUrl, shortUrl, clicks, 30-day TTL)
│   └── ClickEvent.js       # Click event schema (device, browser, OS, country, referrer, ipHash)
│
├── routes/
│   ├── auth.js             # POST /api/auth/register, POST /api/auth/login
│   ├── url.js              # POST /api/url/shorten, GET /api/url/dashboard, GET /api/url/analytics
│   └── index.js            # GET /:code — redirect handler with Redis cache + click tracking
│
├── middleware/
│   └── verifyToken.js      # JWT verification middleware
│
├── utils/
│   ├── generateCode.js     # nanoid Base62 code generator (6 chars)
│   └── parseClick.js       # Request parser → device/browser/OS/country/city/referrer/ipHash
│
├── workers/
│   └── analyticsWorker.js  # BullMQ worker — processes click events in background
│
├── tests/                  # Jest + Supertest API tests
│
└── public/                 # Static frontend
    ├── index.html          # Landing page with forge bar
    ├── login.html          # Login (split-screen design)
    ├── register.html       # Register (split-screen design)
    ├── dashboard.html      # User's links table
    ├── analytics.html      # Full analytics dashboard with Canvas charts
    ├── app.js              # Shared JS (auth, forge, dashboard, analytics, Canvas charts)
    ├── style.css           # Main dark theme stylesheet
    └── auth.css            # Split-screen auth page styles
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
- **Node.js** v20+
- **MongoDB** (Atlas or local)
- **Redis** (Upstash or local) — for caching and rate limiting

### 1. Clone the repository
```bash
git clone https://github.com/Saicharan-2109/LinkForge.git
cd LinkForge
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file (see `.env.example`):
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_signing_secret
REDIS_URL=your_redis_url
BASE_URL=http://localhost:5000
```

### 4. Start the server
```bash
npm run dev    # Development (auto-restart with nodemon)
# OR
npm start      # Production
```

The app will be running at `http://localhost:5000`

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Create account | ❌ |
| `POST` | `/api/auth/login` | Login & receive JWT | ❌ |

### URLs
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/url/shorten` | Create short URL (with optional custom alias) | ✅ |
| `GET` | `/api/url/dashboard` | Get all user's links | ✅ |
| `GET` | `/api/url/analytics` | Get all click events for user's links | ✅ |

### Redirect
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/:code` | Redirect to original URL (cached via Redis) | ❌ |

### Health
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/health` | Server health check | ❌ |

---

## 📊 Analytics Architecture

```
User clicks short link
        │
        ▼
  ┌─────────────┐     Cache Hit?     ┌──────────┐
  │  GET /:code │ ──── Yes ─────────►│  Redis   │
  │  (Express)  │                    │ (Upstash) │
  │             │ ──── No ──────┐   └──────────┘
  └──────┬──────┘               │
         │                      ▼
         │              ┌──────────────┐
         │              │   MongoDB    │
         │              │ (Find + Cache)│
         │              └──────────────┘
         │
         ├── Redirect user (instant)
         │
         ▼
  ┌──────────────┐     Background     ┌──────────────┐
  │  BullMQ Job  │ ─────────────────►│  ClickEvent  │
  │  (Enqueue)   │     Processing     │  (MongoDB)   │
  └──────────────┘                    └──────────────┘
```

Redirects happen instantly. Analytics processing runs asynchronously in a BullMQ worker so users never wait for database writes.

---

## 🔒 Security Measures

- **Password Hashing** — bcryptjs with salt rounds
- **JWT Tokens** — Stateless authentication via `x-auth-token` header
- **Rate Limiting** — Redis-backed distributed rate limiter (100 req/15min)
- **URL Validation** — `valid-url` library validates all submitted URLs
- **IP Privacy** — SHA-256 hashing ensures IP addresses are never stored in plaintext
- **CORS** — Configurable cross-origin resource sharing
- **TTL Auto-Cleanup** — Links auto-expire after 30 days

---

## 🧪 Testing

```bash
npm test    # Runs Jest + Supertest API tests
```

---

## 👤 Author

**Sai Charan**
- GitHub: [@Saicharan-2109](https://github.com/Saicharan-2109)

---

## 📄 License

ISC

---

*Built with obsession.* 🔥
