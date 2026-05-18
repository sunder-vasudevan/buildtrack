CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'Misc',
  description text,
  phase_id uuid REFERENCES phases(id) ON DELETE SET NULL,
  deliverable_name text,
  budget_item_id uuid REFERENCES budget_items(id) ON DELETE SET NULL,
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_expenses" ON expenses
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
