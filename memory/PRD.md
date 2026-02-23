# Schiro Cookie Checker — PRD

## Original Problem Statement
Build a full-stack "Schiro Cookie Checker" application that validates Netflix cookies, extracts account details (email, plan, country, profiles, billing), generates live NFTokens, and provides key-based authentication with admin controls.

## Core Architecture
- **Backend**: FastAPI + MongoDB (motor) + Playwright for browser automation
- **Frontend**: React + Tailwind CSS + shadcn/ui + Framer Motion
- **Auth**: Key-based JWT authentication with admin master key

## File Structure
```
/app/backend/server.py         — All API routes, cookie checking logic, background tasks
/app/frontend/src/App.js       — Router
/app/frontend/src/pages/
  AuthPage.js                  — Key login
  DashboardPage.js             — Cookie checker UI (results separated by status)
  HistoryPage.js               — Check history
  AdminPage.js                 — Key management (admin)
  AdminLogsPage.js             — Valid cookie logs (admin)
  FreeCookiesPage.js           — Free cookies (admin manages, users view)
/app/frontend/src/components/
  Navbar.js                    — Navigation
  CookieResultCard.js          — Result display card (has "Add to Free Cookies" for admin)
/app/frontend/src/contexts/
  AuthContext.js                — Auth state management
```

## Implemented Features

### Authentication & Admin
- Key-based login (no email/password)
- Master admin key: `PritongTinola*3030` (unlimited devices)
- Admin panel to create/view/delete user keys with device limits

### Cookie Checker
- Paste or upload Netflix cookies (Netscape, JSON, key=value)
- Multi-step validation: Playwright → NFToken → httpx scraping
- Extracts: email, plan, country, member since, next billing, profiles
- Generates live NFToken with auto-login link
- Results separated into Valid/Expired/Invalid sections

### Admin Logger
- Valid cookie checks auto-logged to `valid_logs` collection
- Admin-only page at `/admin/logs`

### Free Cookies
- Admin checks cookies on Dashboard, clicks "Add to Free Cookies" on valid results
- Free Cookies page at `/free-cookies` visible to all authenticated users
- Admin controls: display limit, delete, force-refresh tokens
- Non-admin users see cookie cards (view & copy only)

### NFToken Auto-Refresh (Feb 2026)
- Background asyncio task refreshes all free cookie NFTokens every **45 minutes**
- Parses stored browser_cookies/full_cookie → regenerates NFToken via Netflix GraphQL API
- Admin can force-refresh immediately via "REFRESH TOKENS NOW" button
- `last_refreshed` timestamp shown on cookie cards
- Task starts on server startup, cancels on shutdown

### UI
- Dark Netflix-inspired theme
- Footer: "Created by Schiro. Not for Sale."
- Framer Motion animations

## DB Collections
- `access_keys`: `{id, key_value, label, max_devices, active_sessions[], is_master, created_at}`
- `checks`: `{id, user_id, results[], total, valid/expired/invalid counts, created_at}`
- `valid_logs`: `{id, checked_by_key, checked_by_label, email, plan, ..., created_at}`
- `free_cookies`: `{id, email, plan, country, ..., browser_cookies, full_cookie, nftoken, nftoken_link, added_by, last_refreshed, created_at}`
- `settings`: `{key: "free_cookies_limit", value: <int>}`

## Critical Notes
- **DO NOT simplify the cookie checking flow** (Playwright → NFToken → httpx)
- Master key bypasses device limit check
- Background refresh task uses `asyncio.create_task` — must be cancelled on shutdown

## Backlog
- No pending tasks. All user-requested features are implemented.
