-- BuildTrack Schema
-- Run in Supabase SQL Editor in this order

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plot_size TEXT,
  building_area TEXT,
  total_budget NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'In Progress',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. vendors
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  quote_amount NUMERIC,
  quoted_date DATE,
  status TEXT DEFAULT 'Quoted',
  payment_status TEXT DEFAULT 'Pending',
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. phases
CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'Not Started',
  deliverables TEXT[],
  actual_start_date DATE,
  actual_end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. windows
CREATE TABLE IF NOT EXISTS windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  window_id INTEGER NOT NULL,
  room TEXT NOT NULL,
  wall TEXT NOT NULL,
  width TEXT NOT NULL,
  height TEXT NOT NULL,
  sill_height TEXT,
  type TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  quoted_cost NUMERIC,
  actual_cost NUMERIC,
  status TEXT DEFAULT 'Not Ordered',
  ordered_date DATE,
  delivery_date DATE,
  installed_date DATE,
  vendor_id UUID REFERENCES vendors(id),
  critical_alert BOOLEAN DEFAULT FALSE,
  critical_notes TEXT,
  photo_urls TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. budget_items
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  phase_id UUID REFERENCES phases(id),
  quoted_cost NUMERIC,
  actual_cost NUMERIC,
  vendor_id UUID REFERENCES vendors(id),
  status TEXT,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. daily_logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  phase_id UUID REFERENCES phases(id),
  description TEXT,
  weather TEXT,
  work_status TEXT,
  photos JSONB DEFAULT '[]',
  issues TEXT,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. payments
-- 8. income
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  date_received DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. workers
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- reminders / followups
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  due_date DATE,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. payments (original)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  budget_item_id UUID REFERENCES budget_items(id),
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'Pending',
  invoice_number TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
