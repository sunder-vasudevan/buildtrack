import { supabase } from "@/lib/supabase";
import { BudgetItem } from "@/lib/types";
import { BudgetClient } from "./BudgetClient";

async function getData() {
  const [budgetRes, projectRes] = await Promise.all([
    supabase.from("budget_items").select("*").order("category"),
    supabase.from("projects").select("total_budget").single(),
  ]);
  return {
    items: (budgetRes.data ?? []) as BudgetItem[],
    totalBudget: (projectRes.data?.total_budget as number) ?? 2174500,
  };
}

export default async function BudgetPage() {
  const { items, totalBudget } = await getData();
  return <BudgetClient items={items} totalBudget={totalBudget} />;
}
