## FocusGate — Intelligent App & URL Blocker with Dynamic Block Screen

### Current Project Status (Updated: May 10, 2026)

#### ✅ Completed Features

**Project Setup & Infrastructure:**

- Monorepo scaffold with PNPM workspaces (packages/mobile, /web, /extension)
- Supabase project setup with production-ready schema (users, tasks, block_attempts, vision_cards, quotes, user_settings, pomodoro_sessions, location_rules, accountability_requests)
- Environment configuration (.env files for all packages)
- Tailwind CSS setup and full conversion for web app styling

**Web App (React + Vite + TypeScript):**

- Complete auth flow: Email/password signup/login + Google OAuth integration
- Task management system: Add, toggle, delete up to 7 daily tasks with real-time Supabase sync
- Dashboard with streak tracking (consecutive days of task completion without bypasses)
- Responsive design with dark theme and Tailwind CSS only
- Protected routes and session management

**Mobile App (React Native + Expo):**

- Auth skeleton with Supabase integration (login/signup forms)
- Basic navigation setup with Expo Router

**Extension (Chrome Manifest V3):**

- Placeholder files and manifest structure

#### 🔄 Active Working Features

**Web App:**

- Fully functional auth and task system
- Streak calculation and display
- Real-time data sync with Supabase
- Tailwind-styled UI components

**Mobile App:**

- Basic auth flow (needs completion of full task integration)

**Extension:**

- Placeholder (needs blocking engine implementation)

#### 📋 Remaining Work (Prioritized)

**Phase 1: Core Blocking Engine**

1. **Dynamic Block Screen Component** - Shared React component for mobile/web/extension showing:
    - Live incomplete tasks with checkboxes
    - Vision board carousel (user-uploaded images + captions)
    - Rotating motivational quotes
    - Emergency bypass with cooldown and reason logging

2. **Chrome Extension Blocking**
    - URL prefix-based blocking (YouTube Shorts, Instagram Reels, etc.)
    - Content script injection of block screen on blocked URLs
    - Background service worker for block list management

3. **Mobile Blocking (Android)**
    - Accessibility Service for app detection
    - Full-screen overlay with Dynamic Block Screen
    - Curated blocked app package lists

**Phase 2: Feature Completion** 4. Vision cards upload and management (Supabase Storage) 5. Quotes integration (daily rotation from seeded table) 6. Block screen customization settings 7. Mobile task system completion 8. iOS Screen Time API integration

**Phase 3: Advanced Features** 9. Accountability partner system (friend approvals for bypasses) 10. Group time limits (combined limits across app categories) 11. Pomodoro integration (focus sessions with strict blocking) 12. Location-aware blocking (GPS-based activation) 13. Block groups and custom URL/app management

**Phase 4: Polish & Launch** 14. Testing across platforms 15. Performance optimization 16. Deployment setup (web hosting, app stores, extension store) 17. User onboarding flow

#### 🎯 Next Immediate Tasks

- Complete mobile app task system and full auth flow
- Build shared Dynamic Block Screen component
- Implement Chrome extension blocking logic
- Add vision cards upload functionality
- Integrate quotes system

---

### Project Overview

Build FocusGate, a cross-platform distraction blocker app. The core differentiator is the **Dynamic Block Screen** — when a user tries to open a blocked app or URL, instead of a generic "you're blocked" message, they see a personalized screen showing: (1) their live incomplete tasks for today, (2) their vision board cards (user-uploaded images with captions), and (3) a rotating motivational quote. The user must either complete a task or wait out a configurable cooldown before getting an emergency bypass.

### Stack

- React Native (Expo) for mobile
- React + Vite + TypeScript for desktop web/extension
- Supabase (PostgreSQL) as backend
- Tailwind CSS + shadcn/ui for UI

### Feature Set to Build

#### 1. Auth & User Setup (Supabase Auth)

- Email/password + Google OAuth login
- After signup: onboarding flow to set 3 "why I want focus" vision cards (upload image + caption)
- Users pick their default blocked app categories (Social, Shorts, Games, etc.)

#### 2. Task System

- Daily task list: user adds 3–5 tasks each morning (title, optional time estimate)
- Tasks have: `id, user_id, title, completed (bool), date, created_at`
- Completing all tasks of the day triggers a "Day Unlocked" celebration screen and relaxes all blocks
- Tasks sync to Supabase in real-time

#### 3. Blocking Engine

_Desktop (Chrome Extension):_

- URL prefix-based blocking (e.g., `youtube.com/shorts`, `instagram.com/reels`, `tiktok.com`)
- User can add custom URL prefixes to block list
- When a blocked URL is visited, the tab is replaced by the Dynamic Block Screen (full-page HTML injection or redirect to extension page)
- Preset blocked URL lists: Shorts (YouTube Shorts, Instagram Reels, TikTok), Social (Twitter/X trending, Reddit front page), and Custom

_Mobile (React Native / Expo):_

- Android: Use Accessibility Service to detect foreground app changes. When a blocked app (by package name) comes to foreground, show a full-screen overlay Activity displaying the Dynamic Block Screen
- Maintain a curated list of blocked package names per category (Social: `com.instagram.android`, `com.zhiliaoapp.musically`, etc.; Games: top 20 package names)
- iOS: Use Screen Time API (FamilyControls + DeviceActivityMonitor) to enforce app limits. Show a nudge notification + in-app motivational message when limit is reached

#### 4. Dynamic Block Screen (the core differentiator)

This is the screen shown when a block is triggered. It must feel beautiful, not punishing.

Layout (full screen, dark theme with subtle gradient):

- Top section: Rotating motivational quote (changes every 24h, pulled from a seeded `quotes` table in Supabase — seed with 100+ high-quality quotes from stoics, builders, athletes)
- Middle section: "Your tasks for today" — live list of today's incomplete tasks from Supabase, each with a checkbox. If a task is checked here, it updates in the main app too.
- Bottom section: Vision board carousel — user's uploaded vision cards (image + caption) shown as swipeable cards
- Footer: "Emergency Unlock" button — tapping it shows a 30-second countdown + textarea asking "What are you doing instead?" — after the countdown, they can bypass. This bypass is logged to `block_attempts` table with `bypassed: true` and their typed reason.

The block screen should be a shared React Native component (mobile) and a shared React component injected via the extension (desktop). Keep the design consistent.

#### 5. Block Screen Customization

- Settings page: User can choose which elements appear on their block screen (toggle: show tasks / show vision cards / show quotes)
- User can set the emergency bypass cooldown duration (0s, 15s, 30s, 60s, or "disabled")
- User can set whether bypass requires a typed reason or not
- User can upload up to 10 vision cards (image + caption). Images stored in Supabase Storage.

#### 6. Community-Requested Features to Include:

- **Group time limits:** User can create a "Block Group" (e.g., "Social Media") and assign a combined daily time limit across all apps in the group (not per-app). Track cumulative time in `block_sessions`.
- **Accountability partner:** User can invite one friend by email. When they attempt an emergency bypass, the friend gets a push notification: "[Name] is trying to unlock Instagram. Approve?" Friend can approve/deny from their own app. Implement with Supabase Edge Functions + Expo Push Notifications.
- **Pomodoro integration:** In the app, user can start a "Focus Session" (25 min default, configurable). During the session, all blocks are strictly enforced with no bypass available. After the session, a 5-minute break is auto-allowed.
- **Location-aware blocking:** User can set a schedule that only activates when they are at a specific location (Home, Office, custom GPS coordinate with 200m radius). Use Expo Location in the background.
- **Streak tracking:** Track consecutive days where the user completed all tasks without bypassing any blocks. Show streak count on home screen with a fire emoji.

#### 7. Supabase Schema

Create these tables:

```sql
users (id uuid PK, email text, created_at timestamp)
tasks (id uuid PK, user_id uuid FK, title text, completed bool default false, date date, created_at timestamp)
block_sessions (id uuid PK, user_id uuid FK, app_or_url text, started_at timestamp, ended_at timestamp)
block_attempts (id uuid PK, user_id uuid FK, app_or_url text, timestamp timestamp, bypassed bool, bypass_reason text)
vision_cards (id uuid PK, user_id uuid FK, image_url text, caption text, sort_order int)
quotes (id uuid PK, text text, author text)
accountability_pairs (id uuid PK, user_id uuid FK, partner_id uuid FK, created_at timestamp)
block_groups (id uuid PK, user_id uuid FK, name text, daily_limit_minutes int)
block_group_items (id uuid PK, group_id uuid FK, app_or_url text)
```

Enable Row Level Security on all tables. Users can only read/write their own rows.

#### 8. Tech Notes

- Use Supabase JS client (`@supabase/supabase-js`) everywhere
- Store Supabase URL and anon key in `.env` files (never hardcode)
- Use Expo Router for mobile navigation
- The Chrome extension is a separate `packages/extension` folder in the monorepo. Use Manifest V3. The extension's background service worker fetches the user's block list and tasks from Supabase on startup and caches locally. The content script injects the block screen.
- For the extension block screen: inject a full-page `div` with `z-index: 999999` when a blocked URL prefix is matched. Render the Dynamic Block Screen React component inside it using a Shadow DOM to avoid CSS conflicts.
- Use React Query (TanStack Query) for data fetching and caching throughout
- Style with Tailwind CSS (NativeWind on mobile). Dark theme by default.

#### 9. MVP Scope (Updated Progress)

**✅ Completed:**

1. Supabase project setup + schema + RLS policies
2. Auth flow (signup/login/logout) - Web app complete, mobile skeleton
3. Task CRUD (add, complete, delete daily tasks) - Web app complete
4. Dynamic Block Screen component - Planned, not yet built

**🔄 In Progress:** 5. Chrome extension with URL prefix blocking + block screen injection 6. Vision card upload + management 7. Android Accessibility Service overlay 8. Block Screen customization settings

**📋 Remaining:** 9. Community features (group limits, accountability, Pomodoro, location, streaks)

#### Design Direction

Dark mode. Premium feel. Think Notion meets Linear. Use Inter font. Subtle gradients (dark navy to deep purple). The block screen should feel like a _moment of pause_, not a wall — it's designed to make the user feel inspired and refocused, not punished.

### Competitive Landscape

- AppBlock: Static text + emoji, no live data.
- BlockBud: Upload image, no task integration.
- one sec: Breathing delay, no task display.
- Opal: Generic screen, no tasks.
- Taskfulness: Type reason before unlock, AI scores, no tasks shown.
- Cold Turkey: Hard block, zero personalization.

Gap: Dynamically personalized block screen with live tasks, vision cards, rotating quotes.

### Why It Works Psychologically

1. Static guilt fails due to habituation.
2. Live task list creates implementation intention friction.
3. Vision cards activate identity-level motivation.
4. Rotating quotes maintain novelty.

Combination creates pattern interrupt.

### Community Requested Features

1. Shared accountability (Friend Controls style).
2. Combined time limits across app groups.
3. Location-aware blocking.
4. Uninstall protection.
5. Cross-platform sync.
6. Strong Android support.
7. Pomodoro integration.
8. Emergency unlock with friction.
