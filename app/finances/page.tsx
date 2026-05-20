import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { FinancesClient } from "@/components/finances/FinancesClient";
import { Income, BudgetItem, Expense } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [budgetRes, projectRes, incomeRes, phasesRes, expensesRes] = await Promise.all([
    supabase.from("budget_items").select("*").eq("user_id", user.id).order("category"),
    supabase.from("projects").select("total_budget").eq("user_id", user.id).maybeSingle(),
    supabase.from("income").select("*").eq("user_id", user.id).order("date_received", { ascending: false }),
    supabase.from("phases").select("id, name, deliverables, phase_number").eq("user_id", user.id).order("phase_number"),
    supabase.from("expenses").select("*").eq("user_id", user.id).order("expense_date", { ascending: false }),
  ]);

  if (budgetRes.error) console.error(budgetRes.error);
  if (projectRes.error) console.error(projectRes.error);
  if (phasesRes.error) console.error(phasesRes.error);
  if (incomeRes.error && incomeRes.error.code !== "42P01") console.error(incomeRes.error);
  if (expensesRes.error && expensesRes.error.code !== "42P01") console.error(expensesRes.error);

  const items = (budgetRes.data ?? []) as BudgetItem[];
  const totalBudget = (projectRes.data?.total_budget as number) ?? 0;
  const incomes = (incomeRes.data ?? []) as Income[];
  const phases = (phasesRes.data ?? []) as any[];
  const expenses = (expensesRes.data ?? []) as Expense[];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Finances</h1>
      </div>

      <FinancesClient
        initialItems={items}
        totalBudget={totalBudget}
        initialIncomes={incomes}
        initialExpenses={expenses}
        phases={phases}
      />

      <div className="pt-8 pb-16 text-center shrink-0">
        <p className="text-xs text-muted-foreground">v2.3.0 · 20 May 2026 · Built in Hyderabad with ❤️</p>
      </div>
    </div>
  );
}
