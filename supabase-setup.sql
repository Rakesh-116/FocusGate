-- ============================================
-- FocusGate Complete Schema
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & SETTINGS
-- ============================================

CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences and block screen config
CREATE TABLE user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  -- Block screen toggles
  show_tasks_on_block_screen BOOLEAN DEFAULT TRUE,
  show_vision_cards_on_block_screen BOOLEAN DEFAULT TRUE,
  show_quotes_on_block_screen BOOLEAN DEFAULT TRUE,
  -- Bypass config
  bypass_cooldown_seconds INTEGER DEFAULT 30,
  bypass_requires_reason BOOLEAN DEFAULT TRUE,
  -- Pomodoro defaults
  pomodoro_work_minutes INTEGER DEFAULT 25,
  pomodoro_break_minutes INTEGER DEFAULT 5,
  -- Streak
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  -- Onboarding
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BLOCKING
-- ============================================

CREATE TABLE block_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  daily_limit_minutes INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  color TEXT DEFAULT '#7C3AED',
  icon TEXT DEFAULT 'shield',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE block_group_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES block_groups(id) ON DELETE CASCADE NOT NULL,
  app_or_url TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('web', 'android', 'ios', 'all')) DEFAULT 'all'
);

CREATE TABLE block_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES block_groups(id) ON DELETE SET NULL,
  app_or_url TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE block_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  app_or_url TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bypassed BOOLEAN DEFAULT FALSE,
  bypass_reason TEXT,
  bypass_waited_seconds INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- ============================================
-- POMODORO
-- ============================================

CREATE TABLE pomodoro_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  work_minutes INTEGER NOT NULL,
  break_minutes INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  bypass_attempts INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- ============================================
-- VISION CARDS
-- ============================================

CREATE TABLE vision_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUOTES (global, seeded)
-- ============================================

CREATE TABLE quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT CHECK (category IN ('focus', 'discipline', 'identity', 'stoic', 'builder')) DEFAULT 'focus'
);

-- ============================================
-- ACCOUNTABILITY
-- ============================================

CREATE TABLE accountability_pairs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, partner_id)
);

CREATE TABLE accountability_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  app_or_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  partner_message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- LOCATION RULES
-- ============================================

CREATE TABLE location_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT TRUE,
  block_group_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_rules ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- User settings
CREATE POLICY "settings_all_own" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "tasks_all_own" ON tasks FOR ALL USING (auth.uid() = user_id);

-- Block groups
CREATE POLICY "block_groups_all_own" ON block_groups FOR ALL USING (auth.uid() = user_id);

-- Block group items (via group ownership)
CREATE POLICY "block_group_items_all_own" ON block_group_items FOR ALL USING (
  EXISTS (SELECT 1 FROM block_groups WHERE id = group_id AND user_id = auth.uid())
);

-- Block sessions & attempts
CREATE POLICY "block_sessions_all_own" ON block_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "block_attempts_all_own" ON block_attempts FOR ALL USING (auth.uid() = user_id);

-- Pomodoro
CREATE POLICY "pomodoro_all_own" ON pomodoro_sessions FOR ALL USING (auth.uid() = user_id);

-- Vision cards
CREATE POLICY "vision_cards_all_own" ON vision_cards FOR ALL USING (auth.uid() = user_id);

-- Quotes: public read
CREATE POLICY "quotes_public_read" ON quotes FOR SELECT USING (true);

-- Accountability: both parties can see
CREATE POLICY "accountability_pairs_own" ON accountability_pairs FOR ALL 
  USING (auth.uid() = requester_id OR auth.uid() = partner_id);

CREATE POLICY "accountability_requests_own" ON accountability_requests FOR ALL 
  USING (auth.uid() = requester_id OR auth.uid() = partner_id);

-- Location rules
CREATE POLICY "location_rules_all_own" ON location_rules FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE USER SETTINGS ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED QUOTES (50 high-quality)
-- ============================================

INSERT INTO quotes (text, author, category) VALUES
('The key is not to prioritize what''s on your schedule, but to schedule your priorities.', 'Stephen Covey', 'focus'),
('Focus is the art of knowing what to ignore.', 'James Clear', 'focus'),
('Where focus goes, energy flows.', 'Tony Robbins', 'focus'),
('Concentrate all your thoughts upon the work in hand.', 'Alexander Graham Bell', 'focus'),
('The successful warrior is the average man, with laser-like focus.', 'Bruce Lee', 'focus'),
('It is not enough to be busy. The question is: what are we busy about?', 'Henry David Thoreau', 'focus'),
('One reason so few of us achieve what we truly want is that we never direct our focus.', 'Tony Robbins', 'focus'),
('You will never reach your destination if you stop to throw stones at every dog that barks.', 'Winston Churchill', 'focus'),
('The art of being wise is knowing what to overlook.', 'William James', 'focus'),
('If you chase two rabbits, you will not catch either one.', 'Russian Proverb', 'focus'),
('Discipline is the bridge between goals and accomplishment.', 'Jim Rohn', 'discipline'),
('We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Aristotle', 'discipline'),
('With self-discipline most anything is possible.', 'Theodore Roosevelt', 'discipline'),
('The pain of discipline is far less than the pain of regret.', 'Sarah Bombell', 'discipline'),
('Talent is cheaper than table salt. What separates the talented individual from the successful one is hard work.', 'Stephen King', 'discipline'),
('Do what you have to do until you can do what you want to do.', 'Oprah Winfrey', 'discipline'),
('Success is nothing more than a few simple disciplines, practiced every day.', 'Jim Rohn', 'discipline'),
('It''s not about motivation. It''s about discipline.', 'Jocko Willink', 'discipline'),
('The first and best victory is to conquer self.', 'Plato', 'discipline'),
('Champions aren''t made in gyms. Champions are made from something they have deep inside them.', 'Muhammad Ali', 'discipline'),
('You don''t rise to the level of your goals. You fall to the level of your systems.', 'James Clear', 'identity'),
('Every action you take is a vote for the type of person you wish to become.', 'James Clear', 'identity'),
('The most common form of despair is not being who you are.', 'Søren Kierkegaard', 'identity'),
('You are the average of the five people you spend the most time with.', 'Jim Rohn', 'identity'),
('The only person you are destined to become is the person you decide to be.', 'Ralph Waldo Emerson', 'identity'),
('Act the way you want to be and soon you''ll be the way you act.', 'Bob Dylan', 'identity'),
('What you do every day matters more than what you do once in a while.', 'Gretchen Rubin', 'identity'),
('Your future self is watching you right now through your memories.', 'Aubrey de Grey', 'identity'),
('The chains of habit are too weak to be felt until they are too strong to be broken.', 'Samuel Johnson', 'identity'),
('Small disciplines repeated with consistency every day lead to great achievements.', 'John C. Maxwell', 'identity'),
('You have power over your mind, not outside events. Realize this and you will find strength.', 'Marcus Aurelius', 'stoic'),
('The obstacle is the way.', 'Marcus Aurelius', 'stoic'),
('Waste no more time arguing about what a good man should be. Be one.', 'Marcus Aurelius', 'stoic'),
('It is not that I''m so smart. But I stay with the questions much longer.', 'Albert Einstein', 'stoic'),
('Luck is what happens when preparation meets opportunity.', 'Seneca', 'stoic'),
('We suffer more often in imagination than in reality.', 'Seneca', 'stoic'),
('He who is brave is free.', 'Seneca', 'stoic'),
('Difficulties strengthen the mind, as labor does the body.', 'Seneca', 'stoic'),
('Begin at once to live, and count each separate day as a separate life.', 'Seneca', 'stoic'),
('First say to yourself what you would be; and then do what you have to do.', 'Epictetus', 'stoic'),
('The only way to do great work is to love what you do.', 'Steve Jobs', 'builder'),
('Stay hungry, stay foolish.', 'Steve Jobs', 'builder'),
('Move fast and build things that matter.', 'Unknown', 'builder'),
('Ideas are worth nothing unless executed. Execution is everything.', 'Steve Jobs', 'builder'),
('If you''re not embarrassed by the first version of your product, you''ve launched too late.', 'Reid Hoffman', 'builder'),
('Build something 100 people love, not something 1 million people kind of like.', 'Paul Graham', 'builder'),
('The best way to predict the future is to create it.', 'Peter Drucker', 'builder'),
('Shipping is a feature.', 'Joel Spolsky', 'builder'),
('Code is like humor. When you have to explain it, it''s bad.', 'Cory House', 'builder'),
('First, solve the problem. Then, write the code.', 'John Johnson', 'builder');

-- ============================================
-- STORAGE BUCKET FOR VISION CARDS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('vision-cards', 'vision-cards', false);

CREATE POLICY "vision_cards_storage_own" ON storage.objects 
  FOR ALL USING (
    bucket_id = 'vision-cards' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
