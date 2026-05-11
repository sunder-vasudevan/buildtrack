export interface Project {
  id: string;
  name: string;
  plot_size: string | null;
  building_area: string | null;
  total_budget: number;
  currency: string;
  start_date: string;
  end_date: string;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Phase {
  id: string;
  project_id: string;
  phase_number: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  deliverables: string[] | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  project_id: string;
  vendor_name: string;
  category: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  quote_amount: number | null;
  quoted_date: string | null;
  status: string;
  payment_status: string;
  invoice_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Window {
  id: string;
  project_id: string;
  window_id: number;
  room: string;
  wall: string;
  width: string;
  height: string;
  sill_height: string | null;
  type: string | null;
  is_required: boolean;
  quoted_cost: number | null;
  actual_cost: number | null;
  status: string;
  ordered_date: string | null;
  delivery_date: string | null;
  installed_date: string | null;
  vendor_id: string | null;
  critical_alert: boolean;
  critical_notes: string | null;
  photo_urls: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  project_id: string;
  item_name: string;
  category: string;
  phase_id: string | null;
  quoted_cost: number | null;
  actual_cost: number | null;
  vendor_id: string | null;
  status: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;
  phase_id: string | null;
  description: string | null;
  weather: string | null;
  work_status: string | null;
  photos: { url: string; caption?: string }[] | null;
  issues: string | null;
  resolution: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  vendor_id: string | null;
  budget_item_id: string | null;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: string;
  invoice_number: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export type WindowStatus = "Not Ordered" | "Ordered" | "In Transit" | "Installed" | "Completed";
export type PhaseStatus = "Not Started" | "In Progress" | "Completed" | "Delayed";
export type WeatherOption = "Sunny" | "Cloudy" | "Rainy" | "Overcast";

export interface PlanDocument {
  id: string;
  project_id: string;
  title: string;
  url: string;
  category: string | null;
  created_at: string;
}

export interface Worker {
  id: string;
  project_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  skills: string[] | null;
  created_at: string;
}
