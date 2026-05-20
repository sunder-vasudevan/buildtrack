import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'test@example.com';
  
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const user = usersData?.users?.find(u => u.email === email);
  if (!user) {
    console.error('Test user not found');
    return;
  }
  const userId = user.id;

  const { data: existingProject } = await supabase.from('projects').select('*').eq('user_id', userId).maybeSingle();
  let projectId;
  if (!existingProject) {
    console.log('Creating project...');
    const { data: newProject, error: projectError } = await supabase.from('projects').insert({
      name: 'Test Demo Project',
      location: '123 Test Ave',
      total_budget: 150000,
      user_id: userId,
      start_date: '2026-05-01',
      end_date: '2026-12-31'
    }).select().single();
    if (projectError) throw projectError;
    projectId = newProject.id;
  } else {
    projectId = existingProject.id;
    console.log('Project exists:', projectId);
  }

  console.log('Seeding phases...');
  const phasesData = [
    { phase_number: 0, name: "Phase 0: Site Prep & Foundation", start_date: "2026-05-14", end_date: "2026-05-27", deliverables: ["Site cleared & leveled", "JCB work", "Excavation", "Footing layout"] },
    { phase_number: 1, name: "Phase 1: Foundation Footings", start_date: "2026-05-28", end_date: "2026-06-10", deliverables: ["PCC Mud-mat Laying", "Footings cast"] },
    { phase_number: 2, name: "Phase 1B: Walls & Brickwork", start_date: "2026-06-11", end_date: "2026-06-14", deliverables: ["Brickwork complete", "Lintel Beams"] }
  ];
  
  await supabase.from('phases').delete().eq('project_id', projectId);
  const payload = phasesData.map(d => ({
    ...d,
    project_id: projectId,
    status: d.phase_number === 0 ? "In Progress" : "Not Started",
    deliverables: d.deliverables.map(name => ({
      name, planned_start: d.start_date, planned_due: d.end_date, actual_due: null, status: "pending"
    }))
  }));
  await supabase.from('phases').insert(payload);

  console.log('Seeding budget...');
  await supabase.from('budget_items').delete().eq('project_id', projectId);
  await supabase.from('budget_items').insert([
    { project_id: projectId, category: 'Site Prep', item_name: 'JCB Excavation', planned_cost: 5000, actual_cost: 4500 },
    { project_id: projectId, category: 'Foundation', item_name: 'Concrete', planned_cost: 12000, actual_cost: 0 },
    { project_id: projectId, category: 'Structure', item_name: 'Bricks & Cement', planned_cost: 20000, actual_cost: 0 }
  ]);

  console.log('All set!');
}

main().catch(console.error);
