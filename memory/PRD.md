# Schiro Cookie Checker — PRD

## Original Problem Statement
Build a full-stack "Schiro Cookie Checker" application that validates Netflix cookies, extracts account details (email, plan, country, profiles, billing), generates live NFTokens, and provides key-based authentication with admin controls.

## Core Architecture
- **Backend**: FastAPI + MongoDB (motor) + Playwright for browser automation
- **Frontend**: React + Tailwind CSS + shadcn/ui + Framer Motion
- **Auth**: Key-based JWT authentication with admin master key

## Implemented Features

### Authentication & Admin
- Key-based login, master key: `PritongTinola*3030` (unlimited devices)
- Admin panel for key management with device limits

### Cookie Checker
- Paste or upload Netflix cookies (Netscape, JSON, key=value)
- Multi-step validation: Playwright → NFToken → httpx
- Extracts: email, plan, country, member since, next billing, profiles
- Plan detection: Premium (UHD), Standard (HD), Standard with ads, Basic, Mobile
- Results separated into Valid/Expired/Invalid sections

### Admin Logger
- Valid cookie checks auto-logged, admin page at `/admin/logs`

### Free Cookies
- Admin checks cookies, adds valid ones via "Add to Free Cookies" button
- `/free-cookies` page: admin manages (limit, delete, refresh), users view
- Browser cookies hidden from non-admin, original cookie visible to all
- **ALIVE/DEAD status** — refresh checks if cookies are still valid

### NFToken Auto-Refresh (30 min)
- Background task refreshes every **30 minutes** and checks cookie liveness
- Sets `is_alive` field: true (ALIVE badge) or false (DEAD badge)
- Admin can force-refresh via button, sees alive/dead counts

### TV Sign-In Code (Feb 2026)
- Users can enter 8-digit TV sign-in code on alive free cookies
- Playwright navigates to netflix.com/tv8 with cookie and submits code
- Input hidden on dead cookies
- POST /api/tv-code endpoint with proper validation

### UI
- Dark Netflix-inspired theme, footer: "Created by Schiro. Not for Sale."

## DB Collections
- `access_keys`, `checks`, `valid_logs`, `free_cookies` (+ is_alive, last_refreshed), `settings`

## Backlog
- No pending tasks.

## Changelog
- **Feb 2026**: Implemented bulk file upload — users can now select and upload multiple .txt/.json files at once from the file picker. Backend `/api/check/files` endpoint processes all cookies from all files combined. Frontend shows individual file names with remove buttons and dynamic button label.
