-- BuildTrack Seed Data
-- Run AFTER schema.sql
-- Replace project_id variable usage by running section by section

-- ============================================================
-- 1. PROJECT
-- ============================================================
INSERT INTO projects (id, name, plot_size, building_area, total_budget, currency, start_date, end_date, location, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Farmhouse - Hyderabad',
  '55'' × 40''',
  '33'' × 24.5''',
  2174500,
  'INR',
  '2026-05-14',
  '2026-09-20',
  'Telangana',
  'In Progress'
);

-- ============================================================
-- 2. VENDORS
-- ============================================================
INSERT INTO vendors (id, project_id, vendor_name, category, contact_person, phone, quote_amount, status, payment_status) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ravi Constructions', 'Civil Labour', 'Ravi Kumar', '9876543210', 300000, 'Confirmed', 'Pending'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Sai Steel & TMT', 'Steel & TMT', 'Sai Prasad', '9876543211', 185000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Lakshmi Cement Depot', 'Cement & Aggregates', 'Lakshmi Devi', '9876543212', 120000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Vijay Bricks', 'Bricks & Blocks', 'Vijay Reddy', '9876543213', 75000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Modern Windows & Doors', 'Windows & Doors', 'Suresh', '9876543214', 95000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Hyderabad Roofing Co.', 'Roofing', 'Kiran', '9876543215', 180000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Krishna Electricals', 'Electrical (MEP)', 'Krishna Rao', '9876543216', 85000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'AquaFlow Plumbing', 'Plumbing (MEP)', 'Mahesh', '9876543217', 65000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Star Tiles & Flooring', 'Flooring & Tiles', 'Ramesh', '9876543218', 120000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Priya Paints', 'Painting & Finishing', 'Priya', '9876543219', 55000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Neem Wood Works', 'Carpentry & Woodwork', 'Neem Kumar', '9876543220', 90000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Tech Sanitary', 'Sanitary & Fixtures', 'Anil', '9876543221', 45000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Kaveri Granite', 'Granite & Marble', 'Kaveri', '9876543222', 80000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Deccan Hardware', 'Hardware & Fasteners', 'Raju', '9876543223', 25000, 'Quoted', 'Pending'),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Surya Solar', 'Solar & Energy', 'Surya', '9876543224', 120000, 'Quoted', 'Pending');

-- ============================================================
-- 3. PHASES
-- ============================================================
INSERT INTO phases (id, project_id, phase_number, name, start_date, end_date, status, deliverables) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 0, 'Site Preparation', '2026-05-14', '2026-05-27', 'Not Started',
    ARRAY['Site clearing and leveling', 'Mark boundaries', 'Temporary water/power', 'Material storage area']),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 1, 'Foundation & Footings', '2026-05-28', '2026-06-10', 'Not Started',
    ARRAY['Excavation complete', 'Footings poured', 'Foundation walls', 'Damp proofing applied']),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 2, 'Walls & Brickwork', '2026-06-11', '2026-06-14', 'Not Started',
    ARRAY['Load-bearing walls up', 'Lintel beams placed', 'Window/door frames set', '⭐ ROOF COMPLETE by Jun 15']),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 3, 'Plastering & MEP', '2026-06-16', '2026-07-31', 'Not Started',
    ARRAY['Internal plastering', 'External render', 'Electrical rough-in', 'Plumbing rough-in', 'Window installation']),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 4, 'Finishes', '2026-08-01', '2026-09-05', 'Not Started',
    ARRAY['Floor tiling', 'Wall tiling (wet areas)', 'Painting — internal', 'Painting — external', 'Fixtures & fittings', 'Cabinetry']),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 5, 'Testing & Handover', '2026-09-06', '2026-09-20', 'Not Started',
    ARRAY['Electrical test & certification', 'Plumbing pressure test', 'Punch list walkthrough', 'Final clean', 'Handover documentation']);

-- ============================================================
-- 4. WINDOWS (9 windows)
-- ============================================================
INSERT INTO windows (project_id, window_id, room, wall, width, height, sill_height, type, is_required, quoted_cost, status, critical_alert, critical_notes) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'Living Room', 'North', '4''', '7''', NULL, 'Door', TRUE, 12000, 'Not Ordered', FALSE, NULL),
  ('00000000-0000-0000-0000-000000000001', 2, 'Living Room', 'East', '4''', '4.5''', '2''', 'Sliding', TRUE, 8500, 'Not Ordered', FALSE, NULL),
  ('00000000-0000-0000-0000-000000000001', 3, 'Bedroom', 'East', '3.5''', '4''', '5''', 'Sliding', TRUE, 7500, 'Not Ordered', TRUE, 'PRIVACY — High sill 5ft required for bedroom privacy from road side'),
  ('00000000-0000-0000-0000-000000000001', 4, 'Bedroom', 'South', '3.5''', '3.5''', '4''', 'Casement', TRUE, 7000, 'Not Ordered', FALSE, NULL),
  ('00000000-0000-0000-0000-000000000001', 5, 'Bedroom', 'West', '3''', '6''', '3''', 'Fixed + Ventilator', TRUE, 9000, 'Not Ordered', FALSE, NULL),
  ('00000000-0000-0000-0000-000000000001', 6, 'Kitchen', 'East', '3.5''', '4.5''', '3.5''', 'Louvre', TRUE, 6500, 'Not Ordered', TRUE, 'LOUVRE — Kitchen ventilation, louvre type for airflow'),
  ('00000000-0000-0000-0000-000000000001', 7, 'Kitchen', 'North', '2.5''', '3''', '4''', 'Casement', FALSE, 5000, 'Not Ordered', FALSE, NULL),
  ('00000000-0000-0000-0000-000000000001', 8, 'Toilet', 'East', '2.5''', '2.5''', '4.5''', 'Frosted Fixed', TRUE, 4500, 'Not Ordered', TRUE, 'FROSTED — Toilet privacy, must use frosted/obscure glass'),
  ('00000000-0000-0000-0000-000000000001', 9, 'Toilet', 'North', '2''', '2''', '5''', 'Frosted Casement', FALSE, 4000, 'Not Ordered', TRUE, 'FROSTED — Optional north toilet window, frosted if installed');

-- ============================================================
-- 5. BUDGET ITEMS
-- ============================================================
INSERT INTO budget_items (project_id, item_name, category, quoted_cost, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Civil Labour (all phases)', 'Civil Labour', 300000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'TMT Steel Bars (Fe500)', 'Steel & TMT', 125000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Binding Wire & Accessories', 'Steel & TMT', 8000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Cement (OPC 53 Grade)', 'Cement & Aggregates', 75000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'River Sand', 'Cement & Aggregates', 25000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'M-Sand (manufactured sand)', 'Cement & Aggregates', 12000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Aggregate 20mm & 40mm', 'Cement & Aggregates', 18000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Red Clay Bricks', 'Bricks & Blocks', 55000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Solid Concrete Blocks', 'Bricks & Blocks', 20000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Roofing — RCC Slab', 'Roofing', 180000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Windows (9 units)', 'Windows & Doors', 64000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Main Door (Teak)', 'Windows & Doors', 35000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Internal Doors (3 nos)', 'Windows & Doors', 45000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Electrical Wiring & DB', 'Electrical (MEP)', 55000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Electrical Fixtures & Fittings', 'Electrical (MEP)', 30000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Plumbing — CPVC Pipes', 'Plumbing (MEP)', 35000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Sanitary Ware (WC, Basin)', 'Sanitary & Fixtures', 45000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Vitrified Floor Tiles', 'Flooring & Tiles', 75000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Bathroom Wall Tiles', 'Flooring & Tiles', 25000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Granite — Kitchen Counter', 'Granite & Marble', 35000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Internal Painting', 'Painting & Finishing', 35000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'External Painting / Texture', 'Painting & Finishing', 20000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Kitchen Cabinet (modular)', 'Carpentry & Woodwork', 65000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Wardrobe (1 no.)', 'Carpentry & Woodwork', 25000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Solar Water Heater', 'Solar & Energy', 25000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Overhead Water Tank (1000L)', 'Plumbing (MEP)', 12000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Compound Wall (partial)', 'Civil Labour', 40000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Site Leveling & Excavation', 'Civil Labour', 18000, 'Pending'),
  ('00000000-0000-0000-0000-000000000001', 'Architect & Structural Fees', 'Professional Fees', 50000, 'Paid'),
  ('00000000-0000-0000-0000-000000000001', 'Approvals & Permits', 'Professional Fees', 25000, 'Paid');
