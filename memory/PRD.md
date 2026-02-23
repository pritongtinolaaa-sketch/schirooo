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
- Admin panel for key management with device limits and session revocation

### Cookie Checker
- Paste or upload Netflix cookies (Netscape, JSON, key=value)
- Multi-step validation: Playwright → NFToken → httpx scraping
- Extracts: email, plan, country, member since, next billing, profiles
- Plan detection: Premium (UHD), Standard (HD), Standard with ads, Basic, Mobile
- Results separated into Valid/Expired/Invalid sections

### Admin Logger
- Valid cookie checks auto-logged, admin-only page at `/admin/logs`

### Free Cookies
- Admin checks cookies, adds valid ones via "Add to Free Cookies" button
- `/free-cookies` page: admin manages (limit, delete, refresh), users view
- **Browser cookies & original cookie hidden from non-admin users** (stripped from API + hidden in UI)
- Non-admin users see: email, plan, country, profiles, nftoken only

### NFToken Auto-Refresh
- Background task refreshes tokens every 45 minutes
- Admin can force-refresh via "REFRESH TOKENS NOW" button
- `last_refreshed` timestamp shown on cards

### UI
- Dark Netflix-inspired theme, footer: "Created by Schiro. Not for Sale."

## DB Collections
- `access_keys`, `checks`, `valid_logs`, `free_cookies`, `settings`

## Critical Notes
- DO NOT simplify cookie checking flow (Playwright → NFToken → httpx)
- Plan fallback checks specific names first (Premium (UHD) before Premium)

## Backlog
- No pending tasks.
