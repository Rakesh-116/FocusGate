# FocusGate

FocusGate is a monorepo for a distraction-blocking product with three clients:

- `packages/web`: the main control panel where users sign in, manage daily tasks, manage blocked web rules, upload vision cards, and preview the blocked-screen experience
- `packages/extension`: a Chrome extension that blocks matching URLs while the user still has incomplete tasks and renders its own blocked page
- `packages/mobile`: an Expo/React Native app that now works as a companion app for auth, tasks, vision cards, dashboard, and settings

The backend is Supabase. It stores auth, tasks, blocked rules, vision cards, quotes, user settings, block attempts, and the new FocusGate future-simulator tables for goals, daily commitments, daily logs, and future generations.

## Current Status

Approximate implementation status based on the repo today:

- Web: about 80% complete for the current MVP scope
- Extension: about 75% complete for the current MVP scope
- Mobile companion app: about 45-50% complete
- Mobile native blocking/enforcement: about 0-10% complete
- Backend schema: about 80% complete

What is working now:

- Web auth with Supabase email/password and Google OAuth
- Protected web routes and session-aware layout
- Daily task CRUD on web
- Dashboard progress and streak UI
- Vision card upload, listing, delete, and reorder on web
- Blocked URL rule management on web through `block_groups` and `block_group_items`
- Block-screen preview builder on web
- Block-screen settings persistence through `user_settings`
- Chrome extension popup with blocking status and synced rule list
- Chrome extension background logic for URL matching and local cached sync state
- Chrome extension sync bridge that reads session and public app config from the web app
- Chrome extension blocked screen that loads its own tasks, quote, vision cards, and settings inside the extension
- Extension blocked screen task completion flow
- Mobile auth flow
- Mobile dashboard
- Mobile tasks screen
- Mobile vision-card upload/delete flow
- Mobile settings screen
- Mobile reusable block-screen component
- Web main-goal workflow with daily commitments
- Daily score calculation from commitments kept vs commitments promised
- Dashboard future-simulator card with generated hell/heaven narrative previews
- Extension and web block screen support for a "Today's Future Check" intervention card

What is partial or still rough:

- Extension still needs the web app once for initial session/config bootstrap
- Mobile is now a real companion app, but not a real blocker yet
- There is no Android Accessibility Service implementation yet
- There is no foreground app detection or app overlay blocking yet
- There is no iOS Screen Time / FamilyControls enforcement yet

## Architecture

### Main flow

1. A user signs in through the web app or mobile app using Supabase Auth.
2. Supabase creates the auth user, then the SQL trigger in `supabase-setup.sql` creates a row in `public.users` and a default row in `user_settings`.
3. In the web app or mobile app, the user creates today's tasks and manages motivation content.
4. In the web app, the user manages blocked URL rules for the extension.
5. The web app syncs session, app config, task summary, and blocked-rule data to the page via `window.postMessage`.
6. The extension content script forwards that bootstrap data to the extension background worker.
7. The extension background worker stores cached state in `chrome.storage.local` and refreshes tasks, blocked rules, settings, cards, and quote data from Supabase REST.
8. When the user navigates to a blocked URL and still has incomplete tasks, the extension redirects to its own `chrome-extension://.../blocked.html` page.
9. That extension page renders the blocked screen locally, where the user can complete tasks, view vision cards, and read the quote of the day.

### Package responsibilities

- Web owns the source of truth for setup, blocked-rule management, preview/testing, and user-facing configuration.
- Extension enforces blocked web routes and mirrors a cached subset of the user's state for independent blocking.
- Mobile currently acts as a companion app for tasks, settings, and motivation content.
- Supabase is the system of record for auth and product data.

## Database

The database setup lives in [supabase-setup.sql](/abs/path/C:/Users/rakes/Desktop/Practice-Dump/DB-v2/supabase-setup.sql).

Core tables currently used by code:

- `users`: profile row tied to `auth.users`
- `user_settings`: block-screen visibility toggles, bypass settings, streak values, and related preferences
- `tasks`: daily tasks per user
- `block_groups`: logical grouped blocklists
- `block_group_items`: blocked URLs or app identifiers inside a group
- `vision_cards`: image URL, caption, and sort order for motivation cards
- `quotes`: globally seeded quotes shown on the block screen
- `block_attempts`: bypass-attempt log table still used in some flows
- `user_goals`: the user's currently active main goal and future intensity
- `daily_commits`: daily commitments linked to live blocker tasks
- `daily_logs`: daily summary score based on commitments completed
- `future_generations`: generated hell/heaven text scenarios that can later power image/video generation

Schema tables already prepared for later features:

- `block_sessions`
- `pomodoro_sessions`
- `accountability_pairs`
- `accountability_requests`
- `location_rules`

## Repo Structure

```text
packages/
  web/         React + Vite control panel
  extension/   Chrome Manifest V3 extension
  mobile/      Expo companion app, enforcement not built yet
supabase-setup.sql
vision.md
```

## Development Notes

### Web

- Uses React, React Router, TanStack Query, Supabase JS, Tailwind, Framer Motion, Embla, and DnD Kit
- Acts as the management/control surface for tasks, blocked links, and vision cards
- Includes a block-screen preview builder, but the real blocked experience now lives in the extension

### Extension

- Uses a background service worker plus a content script
- Stores cached state in `chrome.storage.local`
- Redirects blocked pages to the extension's own `blocked.html`
- Fetches tasks, settings, cards, quotes, and blocked rules directly from Supabase after bootstrap
- Caches public app config from the web app instead of hardcoding Supabase credentials in source

### Mobile

- Uses Expo + React Native + Expo Router
- Auth context is wired to Supabase
- Has working dashboard, tasks, vision, and settings screens
- Has a reusable mobile `BlockScreen` component
- Does not yet implement real Android or iOS blocking

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Root `.env`:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

`packages/web/.env`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`packages/mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Apply the database schema

Run the SQL in `supabase-setup.sql` inside your Supabase project.

### 4. Run the web app

```bash
pnpm dev:web
```

### 5. Run the mobile app

```bash
pnpm dev:mobile
```

### 6. Load the extension

Load `packages/extension` as an unpacked Chrome extension.

Important notes:

- the current extension expects the web app to be served from `http://localhost:5173`
- the extension no longer uses the web app as the blocked-screen runtime
- the extension still needs the web app at least once to cache app origin, public Supabase config, and session data

## Known Gaps

- mobile still does not implement real device-level blocking
- no Android Accessibility Service exists yet
- no iOS enforcement layer exists yet
- extension bootstrap still relies on the web app being opened at least once
- no shared package exists yet for cross-platform UI or business logic
- advanced planned features like Pomodoro, accountability, location rules, and app-level blocking are not implemented yet
