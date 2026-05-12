import { supabase } from "@/lib/supabase";
import { FinancesClient } from "@/components/finances/FinancesClient";
import { Income, BudgetItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const [budgetRes, projectRes, incomeRes, phasesRes] = await Promise.all([
    supabase.from("budget_items").select("*").order("category"),
    supabase.from("projects").select("total_budget").single(),
    supabase.from("income").select("*").order("date_received", { ascending: false }),
    supabase.from("phases").select("id, name").order("phase_number"),
  ]);

  if (budgetRes.error) console.error(budgetRes.error);
  if (projectRes.error) console.error(projectRes.error);
  if (phasesRes.error) console.error(phasesRes.error);
  if (incomeRes.error && incomeRes.error.code !== "42P01") {
    console.error(incomeRes.error);
  }

  const items = (budgetRes.data ?? []) as BudgetItem[];
  const totalBudget = (projectRes.data?.total_budget as number) ?? 2174500;
  const incomes = (incomeRes.data ?? []) as Income[];
  const phases = (phasesRes.data ?? []) as { id: string; name: string }[];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Finances</h1>
      </div>

      <FinancesClient
        initialItems={items}
        totalBudget={totalBudget}
        initialIncomes={incomes}
        phases={phases}
      />

      {/* Footer */}
      <div className="pt-8 pb-16 text-center shrink-0">
        <p className="text-xs text-muted-foreground">v1.3.2 · 12 May 2026 · Built in Hyderabad with ❤️</p>
      </div>
    </div>
  );
}
