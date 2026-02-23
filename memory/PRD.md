# Schiro Cookie Checker — PRD

## Original Problem Statement
Build a full-stack "Schiro Cookie Checker" application that validates Netflix cookies, extracts account details (email, plan, country, profiles, billing), generates live NFTokens, and provides key-based authentication with admin controls.

## Core Architecture
- **Backend**: FastAPI + MongoDB (motor) + Playwright for browser automation
- **Frontend**: React + Tailwind CSS + shadcn/ui + Framer Motion
- **Auth**: Key-based JWT authentication with admin master key

## File Structure
```
/app/backend/server.py         — All API routes and cookie checking logic
/app/frontend/src/App.js       — Router
/app/frontend/src/pages/
  AuthPage.js                  — Key login
  DashboardPage.js             — Cookie checker UI (results separated by status)
  HistoryPage.js               — Check history
  AdminPage.js                 — Key management (admin)
  AdminLogsPage.js             — Valid cookie logs (admin)
  FreeCookiesPage.js           — Free cookies for users (admin manages)
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
- Session management with revoke capability

### Cookie Checker
- Paste or upload Netflix cookies
- Multi-format support: Netscape, JSON, key=value
- Multi-step validation: Playwright → NFToken → httpx scraping
- Extracts: email, plan, country, member since, next billing, profiles
- Generates live NFToken with auto-login link
- Browser-enriched cookies with SecureNetflixId
- Textarea clears after check

### Results Display (Feb 2026)
- Results separated into **Valid**, **Expired**, **Invalid** sections with colored headers
- Each section has glowing status dots (green/red/yellow)
- Summary bar with counts

### Admin Logger (Feb 2026)
- All valid cookie checks automatically logged to `valid_logs` collection
- Admin-only page at `/admin/logs`
- Clear all / delete individual logs

### Free Cookies (Feb 2026)
- Admin checks cookies on Dashboard first, then clicks "Add to Free Cookies" on valid result cards
- Free Cookies page at `/free-cookies` visible to all authenticated users
- Admin sees management controls: set display limit, delete individual cookies
- Non-admin users see cookie cards (email, plan, country, profiles, nftoken, cookies) — view & copy only
- Display limit controls how many cookies non-admin users can see

### UI
- Dark Netflix-inspired theme
- Footer: "Created by Schiro. Not for Sale."
- Framer Motion animations
- Responsive design

## DB Collections
- `access_keys`: `{id, key_value, label, max_devices, active_sessions[], is_master, created_at}`
- `checks`: `{id, user_id, results[], total, valid_count, expired_count, invalid_count, created_at}`
- `valid_logs`: `{id, checked_by_key, checked_by_label, email, plan, country, ..., created_at}`
- `free_cookies`: `{id, email, plan, country, member_since, next_billing, profiles[], browser_cookies, full_cookie, nftoken, nftoken_link, added_by, created_at}`
- `settings`: `{key: "free_cookies_limit", value: <int>}`

## Critical Notes
- **DO NOT simplify the cookie checking flow** (Playwright → NFToken → httpx). This order was designed to bypass Netflix bot detection.
- Master key bypasses device limit check (line 468 in server.py).

## Backlog
- No pending tasks. All user-requested features are implemented.
