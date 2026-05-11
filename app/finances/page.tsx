import { supabase } from "@/lib/supabase";
import * as Tabs from "@radix-ui/react-tabs";
import { BudgetClient } from "@/components/finances/BudgetTab";
import { IncomeTab } from "@/components/finances/IncomeTab";
import { Income, BudgetItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const [budgetRes, projectRes, incomeRes] = await Promise.all([
    supabase.from("budget_items").select("*").order("category"),
    supabase.from("projects").select("total_budget").single(),
    supabase.from("income").select("*").order("date_received", { ascending: false }),
  ]);

  if (budgetRes.error) console.error(budgetRes.error);
  if (projectRes.error) console.error(projectRes.error);
  if (incomeRes.error && incomeRes.error.code !== "42P01") {
    console.error(incomeRes.error);
  }

  const items = (budgetRes.data ?? []) as BudgetItem[];
  const totalBudget = (projectRes.data?.total_budget as number) ?? 2174500;
  const incomes = (incomeRes.data ?? []) as Income[];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Finances</h1>
      </div>

      <Tabs.Root defaultValue="budget" className="flex flex-col flex-1 mt-2">
        <Tabs.List className="flex border-b border-border bg-white rounded-t-xl overflow-hidden shrink-0">
          <Tabs.Trigger
            value="budget"
            className="flex-1 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all"
          >
            Budget
          </Tabs.Trigger>
          <Tabs.Trigger
            value="income"
            className="flex-1 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all"
          >
            Funds
          </Tabs.Trigger>
        </Tabs.List>

        <div className="flex-1 bg-white rounded-b-xl border-x border-b border-border overflow-y-auto p-4 mb-safe">
          <Tabs.Content value="budget" className="outline-none h-full">
            <BudgetClient items={items} totalBudget={totalBudget} incomes={incomes} />
          </Tabs.Content>
          <Tabs.Content value="income" className="outline-none h-full">
            <IncomeTab initialIncome={incomes} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
