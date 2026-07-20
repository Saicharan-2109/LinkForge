# LinkForge Fixes - Gemini Handoff

Date: 2026-07-18

This document explains the fixes made to LinkForge after a source-code review. An unrelated existing change in `models/ClickEvent.js` was deliberately left untouched.

## What was wrong and what changed

### Custom aliases could create broken links

Changed file: `routes/url.js`

Before this fix, a user could set a custom alias to almost any text, including values with `/`, quotes, or names of public files such as `dashboard.html`. A short link uses the alias as part of its URL path, so these values could create links that did not redirect correctly.

The API now only accepts custom aliases that are 3 to 64 characters long and use letters, numbers, hyphens, and underscores. Examples that work: `my-link`, `sale_2026`, and `abc`. Examples that are rejected: `a/b`, `<script>`, `two words`, and `hi`.

### Special characters could break the dashboard page

Changed file: `public/app.js`

Before this fix, the dashboard inserted saved URL and alias values directly into an HTML string. A quote, HTML tag, or JavaScript-like text in one of those values could break the dashboard layout. It also placed the short URL directly inside an inline `onclick` handler for the Copy button.

The dashboard now creates each row with browser DOM APIs and assigns user-controlled values through `textContent`. The Copy button uses a normal click event listener. This makes user data display as text instead of being interpreted as HTML or JavaScript.

### Redis outages could cause requests to fail

Changed files: `routes/index.js`, `server.js`, and `workers/analyticsWorker.js`

Redis is used for redirect caching and shared API rate limiting. Before this fix, Redis errors could become application errors instead of allowing LinkForge to use MongoDB or continue without the shared rate-limit store.

For redirects, Redis is now optional. If it is not configured, is down, has bad cached data, or cannot save a cache entry, LinkForge looks up the link in MongoDB and continues redirecting the visitor.

For API routes, the rate limiter now allows the request through when its Redis store has an error. This keeps login, registration, link creation, and dashboard requests working during a Redis outage. The trade-off is that, during that outage, rate limiting is less strict across multiple server instances.

Analytics queue submission is also handled as a non-blocking background task. If the queue is unavailable, the visitor is still redirected; the application logs the analytics error instead of failing the redirect.

The analytics worker and Redis clients are not started during automated tests. Tests now stay isolated from the production Redis service, which prevents background Redis connections from leaving open handles or making test results depend on network access.

### The authenticated URL test sent the wrong header

Changed file: `tests/url.test.js`

The authentication middleware reads the `x-auth-token` header, but the URL-shortening test sent `auth-token`. The test now sends `x-auth-token`, matching the frontend and `middleware/verifyToken.js`. This means the test now checks the same authenticated path the app actually uses.

## Files changed

- `routes/url.js`: Validates custom aliases before saving them.
- `routes/index.js`: Makes redirect caching and analytics queue failures non-blocking.
- `server.js`: Makes Redis-backed API rate limiting fail open when Redis is unavailable.
- `workers/analyticsWorker.js`: Skips analytics infrastructure in tests and makes queue writes fail quickly when Redis is down.
- `public/app.js`: Renders dashboard link data safely with DOM APIs.
- `tests/url.test.js`: Uses the correct JWT header in the authenticated test.
- `FIXES.md`: This explanation document.

## Suggested prompt for Gemini

Read this LinkForge fix summary and explain it to a beginner. For each issue, explain: (1) what could go wrong before, (2) how the code change prevents it, and (3) one simple real-world example. Do not suggest new code unless it is necessary.

## Verification run

JavaScript syntax checks passed for every changed JavaScript file.

The automated test command was also run. The Redis-related background connection errors are no longer present. The non-database test suite passed. The authentication and URL test suites could not complete because this environment could not reach the external database configured in `MONGO_URI_TEST`; their MongoDB connection hooks timed out after five seconds. This is an environment connectivity limitation, not a failed assertion from these changes.
