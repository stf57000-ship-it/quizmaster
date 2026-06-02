-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  streak INTEGER DEFAULT 0, total_quizzes INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0, total_answered INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0, exam_count INTEGER DEFAULT 0,
  best_exam_score INTEGER DEFAULT 0, has_perfect BOOLEAN DEFAULT FALSE,
  earned_badges TEXT[] DEFAULT '{}', concours_played JSONB DEFAULT '{}',
  errors JSONB DEFAULT '{}', history JSONB DEFAULT '{}',
  concour_date DATE, updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_self" ON user_progress USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "leaderboard_read" ON user_progress FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT, stripe_subscription_id TEXT,
  status TEXT DEFAULT 'free', plan TEXT DEFAULT 'free',
  current_period_end TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_self" ON user_subscriptions FOR SELECT USING (auth.uid()=user_id);

CREATE INDEX IF NOT EXISTS idx_progress_score ON user_progress(best_score DESC);
