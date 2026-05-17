-- Add user_id to all tenant tables
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

ALTER TABLE phases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE income ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies: user owns their own rows
CREATE POLICY "user_owns_projects" ON projects USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_owns_phases" ON phases USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_owns_budget_items" ON budget_items USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_owns_daily_logs" ON daily_logs USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_owns_payments" ON payments USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_owns_income" ON income USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_owns_workers" ON workers USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_owns_documents" ON documents USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_owns_reminders" ON reminders USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Backfill Vasudha's existing rows after she logs in once:
-- UPDATE projects SET user_id = '<vasudha_uid>' WHERE user_id IS NULL;
-- UPDATE phases SET user_id = '<vasudha_uid>' WHERE user_id IS NULL;
-- (repeat for all tables)
