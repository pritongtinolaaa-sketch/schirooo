# Netflix Cookie Checker - PRD

## Original Problem Statement
Build a Netflix cookie checker with email, plan, member since, country, next billing date, profiles and the full cookie after checking.

## User Choices
- Cookie Input: Both paste text and upload .txt file
- Cookie Format: Both Netscape and JSON formats
- Results: Card-based view with detailed info per cookie
- Auth: Basic JWT auth to track check history
- Theme: Dark Netflix-inspired theme

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Auth**: JWT tokens (bcrypt hashing, 7-day expiry)
- **Cookie Checker**: httpx async client + BeautifulSoup4 for parsing

## Core Requirements
1. Auth system (register/login/logout)
2. Cookie input via paste or file upload
3. Support Netscape and JSON cookie formats
4. Validate cookies against Netflix servers
5. Extract: email, plan, member since, country, next billing, profiles
6. Display results as detailed cards
7. Track check history per user
8. Dark Netflix-inspired UI

## What's Been Implemented (Feb 2026)
- Full auth system with JWT
- Cookie checker (paste + file upload)
- Cookie parsing (Netscape, JSON, auto-detect)
- Netflix validation via httpx
- Card-based results with status badges (valid/expired/invalid)
- Collapsible full cookie view with copy
- Check history with expand/delete
- Dark Netflix theme (Bebas Neue, Manrope, JetBrains Mono fonts)
- Glassmorphic UI with red glow accents

## Test Results
- Backend: 100% (12/12 endpoints)
- Frontend: 95%+ (clipboard fallback fixed)

## Prioritized Backlog
- P1: Bulk cookie checking with progress indicator
- P1: Export results to CSV/JSON
- P2: Cookie format converter
- P2: Dashboard stats (total checks, valid rate)
- P3: Dark/light theme toggle
