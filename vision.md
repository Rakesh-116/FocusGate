## FocusGate Vision And Build Status

FocusGate is a cross-platform focus system with three layers:

- the web app is the control center
- the browser extension is the live enforcement layer for distracting URLs
- the mobile app is the companion app today and the future native enforcement layer
- Supabase is the shared backend and source of truth

This document tracks both product intent and the current implementation reality in the repo.

## Product Goal

The goal is not just to block distractions. FocusGate should interrupt the distraction loop with a personalized screen that reminds the user:

- what they still need to finish today
- why they said they want to focus
- what route or app is currently being blocked
- what their current habits are likely building next

The longer-term product direction is:

- web = setup, management, onboarding, analytics, install surface
- extension = independent web blocking runtime
- mobile = native Android/iOS blocker with the same motivation system
- future simulator = the emotional accountability layer that turns commitments into believable hell/heaven projections

## Combined Product Direction

FocusGate is now moving from "task-gated blocker" toward a more complete personal focus OS:

- a user sets one active main goal
- each day they commit a small number of promises that matter
- those commitments sync into the live blocker tasks
- the app scores how much of today's promise was actually kept
- that score powers a future-self intervention shown on the dashboard and the block screen

The first implementation of the future simulator is text-first:

- `user_goals` stores the active goal and intensity setting
- `daily_commits` stores the promises for today and links them to real task rows
- `daily_logs` stores the computed daily score
- `future_generations` stores generated hell/heaven narratives that can later feed image and video generation

This keeps the current stack intact while creating the data and UX loop needed for future AI-generated images or videos.

## Current Build Snapshot

### Overall

- Web app: strong MVP progress
- Extension: working MVP with independent blocked-screen runtime
- Mobile app: real companion app progress, but not yet a real blocker
- Database: broad schema prepared, but only part of it is active

### Completion Estimate

- Web: about 80%
- Extension: about 75%
- Mobile companion app: about 45-50%
- Mobile native blocking/enforcement: about 0-10%
- Database schema: about 80%

These are implementation estimates, not launch estimates.

## What Is Implemented Right Now

### Web

Implemented:

- Supabase auth context
- login and signup UI
- Google OAuth entrypoint
- protected routes
- dashboard shell
- daily task add, toggle, delete
- progress card
- streak calculation UI
- blocked-link management backed by Supabase
- vision-card upload
- vision-card reorder and delete
- block-screen preview builder
- block-screen preference saving through `user_settings`
- shared web block-screen route for preview/testing

Current reality:

- the web app is the setup and management surface
- the web preview exists for iteration, but the real blocked experience is now extension-owned
- tasks, blocked rules, vision cards, and block-screen settings are all editable from the web app

Not done or not production-ready:

- no polished onboarding flow
- no full analytics/reporting surface yet
- no extension installation flow beyond manual/dev setup
- no fully hardened error-recovery UX around every Supabase failure state

### Extension

Implemented:

- Manifest V3 setup
- content script on all pages
- background service worker
- URL prefix matching
- local cached blocking state
- popup with blocking status
- sync bridge from the web app through `window.postMessage`
- remote refresh from Supabase REST
- redirect to the extension's own `blocked.html`
- extension-owned blocked screen that loads tasks, cards, quotes, and settings from Supabase-backed cached state
- task completion from inside the blocked screen

Current reality:

- the extension owns the live blocked flow once it has bootstrap data
- the blocked screen runs inside the extension, not the web app
- the extension still uses the web app once for bootstrap of app config/session data

Not done or not production-ready:

- no self-contained auth/bootstrap flow inside the extension
- no store/deployment packaging strategy
- no extension-specific settings UI beyond popup status
- background sync still depends on network and bootstrap state being healthy

### Mobile

Implemented:

- Expo Router app shell with tab navigation
- Supabase auth context
- login screen
- signup screen
- route gate from index to auth or dashboard
- dashboard screen backed by live tasks/settings/blocked-summary data
- task management screen with add/toggle/delete flow
- vision-card management screen with image-picker permission flow and Supabase upload/delete
- settings screen backed by `user_settings`
- reusable mobile `BlockScreen` component with quote/tasks/cards/bypass UI
- React Query hooks for auth, tasks, settings, and vision cards

Current reality:

- mobile is now a working companion app for account, tasks, vision cards, and preferences
- mobile is not yet a true blocker
- the mobile block-screen component exists, but it is not wired into a real Android or iOS enforcement runtime

Not done or blocked:

- no Android Accessibility Service
- no foreground app detection
- no real blocked-app overlay
- no package-name blocklist enforcement
- no iOS Screen Time / FamilyControls integration
- no real app blocking permission flow yet

### Database

Implemented in SQL:

- users
- user_settings
- tasks
- block_groups
- block_group_items
- block_sessions
- block_attempts
- pomodoro_sessions
- vision_cards
- quotes
- accountability_pairs
- accountability_requests
- location_rules
- RLS policies
- signup trigger creating `users` and `user_settings`
- seeded quotes
- storage bucket and policy for vision cards

Actually used by the current app code:

- `users`
- `user_settings`
- `tasks`
- `block_groups`
- `block_group_items`
- `vision_cards`
- `quotes`
- `block_attempts` in mobile/web bypass-related flows and legacy support

Not yet used by active product code:

- `block_sessions`
- `pomodoro_sessions`
- `accountability_pairs`
- `accountability_requests`
- `location_rules`

## Logic And Flow

### User flow

1. User signs in with Supabase.
2. The SQL trigger creates the matching `public.users` and `user_settings` rows if this is a new account.
3. User creates today's tasks in the web app or mobile app.
4. User adds blocked URL prefixes in the web app.
5. User uploads vision cards in the web app or mobile app.
6. App saves those records in Supabase.
7. While the FocusGate web app is open, it posts session details, public app config, task summary, and blocked URL summary to the page.
8. The extension content script captures those page messages and forwards them to the background worker.
9. The background worker stores them locally and refreshes tasks, rules, settings, quotes, and cards from Supabase REST using the cached session.
10. When a blocked URL is visited and there are pending tasks, the extension redirects the user to the extension's own `blocked.html` route.
11. The extension blocked page renders the real block screen.
12. From that screen the user can:
    - complete tasks
    - view the quote of the day
    - view vision cards

### Blocking flow

The current browser blocking logic is:

1. Normalize the current URL and each saved blocked rule.
2. Determine whether today's synced task state has pending tasks.
3. Ignore the URL if there are no pending tasks.
4. If a blocked rule matches, redirect the tab to:

```text
chrome-extension://<extension-id>/blocked.html?url=<original>&rule=<matched-rule>
```

5. The extension blocked screen becomes the intervention surface.

### Mobile flow

The current mobile app flow is:

1. Sign in with Supabase
2. Manage tasks
3. Manage vision cards
4. Manage block-screen settings
5. View dashboard summaries

The current mobile app does not yet:

- ask for Android accessibility blocking permission
- detect the foreground app
- block other installed apps
- show a true system-level overlay on blocked apps

## Data Sync Flow Between Web And Extension

Web app emits:

- `FOCUSGATE_SYNC_SESSION`
- `FOCUSGATE_SYNC_TASK_STATE`
- `FOCUSGATE_SYNC_BLOCKED_URLS`
- `FOCUSGATE_SYNC_APP_CONFIG`

Extension content script forwards those into runtime messages:

- `syncSession`
- `syncTaskState`
- `syncBlockedUrls`
- `syncAppConfig`

Extension background worker stores:

- `extensionSession`
- `appConfig`
- `taskSyncState`
- `blockedUrls`
- `blockedScreenData`
- `temporaryBypasses`

This means the extension owns the actual blocked experience, while the web app remains the bootstrap and management layer.

## How Everything Connects

### Web to Supabase

- auth is handled through the Supabase JS client
- tasks are read and written directly from the `tasks` table
- blocked links are stored in `block_groups` and `block_group_items`
- vision cards use Supabase Storage plus a `vision_cards` table record
- quotes are read from the seeded `quotes` table
- block-screen visibility and bypass settings are read and saved through `user_settings`

### Web to Extension

- the web layout mounts `ExtensionTaskSync`
- `ExtensionTaskSync` posts session, app config, task summary, and blocked rules to the page
- the extension content script listens and forwards those payloads to the background worker

### Extension to Supabase

- the extension background worker can call Supabase Auth refresh
- it can fetch tasks from `tasks`
- it can fetch settings from `user_settings`
- it can fetch blocked rules from `block_groups` and `block_group_items`
- it can fetch cards from `vision_cards`
- it can fetch the quote of the day from `quotes`
- it does this with direct REST requests using the cached session token

### Mobile to Supabase

- mobile auth is handled through Supabase
- mobile tasks use the `tasks` table
- mobile vision cards use `vision_cards` plus Supabase Storage
- mobile settings use `user_settings`
- mobile dashboard reads blocked URL summaries from `block_groups` and `block_group_items`

## Important Reality Checks

These are the biggest current project constraints:

- The extension is real, but it is still dev-coupled to the local web app URL for bootstrap.
- The extension no longer depends on the web app for the blocked-screen runtime.
- Mobile is much farther along as a companion app than older docs suggested.
- Mobile is still not a real Android/iOS blocker.
- There is no Android native accessibility service or iOS enforcement layer yet.
- There is no shared package yet for reusable cross-platform UI or business logic.
- The repo still contains future-facing schema for more advanced focus features that are not yet shipped.

## Next Recommended Build Order

1. Make extension bootstrap and config flow cleaner than the current web-assisted setup.
2. Keep web as the source of truth for setup, preferences, blocked rules, and installation flow.
3. Decide whether mobile remains a companion app first or becomes the next enforcement priority.
4. If mobile blocking is the next milestone:
   - add Android Accessibility Service
   - add blocked package-name model
   - add native overlay/block runtime
   - add device permission onboarding
5. After that, move into analytics, Pomodoro, accountability, and location-aware rules.

## Launch Readiness

This repo is a strong prototype, not a launch-ready product.

What feels close:

- web dashboard workflow
- blocked-link management
- vision-card management
- extension URL blocking
- extension-owned blocked-screen experience
- mobile companion app flows

What still makes it pre-launch:

- extension bootstrap is environment-coupled
- mobile enforcement is not implemented
- app-store / chrome-store packaging is not in place
- advanced feature tables exist without corresponding shipped flows
