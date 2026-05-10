# FocusGate - Intelligent App & URL Blocker

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your Project URL and anon key
3. Create the database tables using the SQL in `vision.md` (Supabase Schema section)
4. Enable Row Level Security (RLS) on all tables
5. Create RLS policies: Users can only read/write their own rows (where user_id = auth.uid())

### 2. Environment Variables

Create `.env` files in each package:

#### Root `.env`

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

#### packages/mobile/.env

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

#### packages/web/.env

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run the Apps

- Mobile: `pnpm dev:mobile`
- Web: `pnpm dev:web`
- Extension: Load `packages/extension` as unpacked extension in Chrome

### 5. Next Steps

Follow the MVP Scope in `vision.md` to implement features in order.

### Tech Stack

- Mobile: React Native + Expo
- Web: React + Vite + TypeScript
- Extension: Chrome Manifest V3
- Backend: Supabase (PostgreSQL)
- UI: Tailwind CSS + shadcn/ui
- State: TanStack Query
